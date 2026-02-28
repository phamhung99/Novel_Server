import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { IapProduct } from './entities/iap-product.entity';
import { ERROR_MESSAGES } from 'src/common/constants/app.constant';
import { UserService } from 'src/user/user.service';
import { GooglePlayService } from 'src/google-play/google-play.service';
import {
    CoinReferenceType,
    CoinType,
    IapProductType,
    IapStore,
    GoogleSubscriptionNotificationType,
    SUBSCRIPTION_STATUS,
    TransactionStatus,
    AppleNotificationType,
    AppleRenewalStatusSubtype,
} from 'src/common/enums/app.enum';
import { Transaction } from './entities/transaction.entity';
import { IapProductService } from './iap-product.service';
import { VerifyPurchaseResponseDto } from './dto/verify-purchase.response.dto';
import { VerifyPurchaseParamsDto } from './dto/verify-purchase.dto';
import {
    AppStoreService,
    ParsedTransactionData,
} from 'src/app-store/app-store.service';
import { toDate } from 'src/common/utils/date.utils';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    private testUserIds: string[] = [];
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        @InjectRepository(IapProduct)
        private readonly iapProductRepository: Repository<IapProduct>,
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        private readonly googlePlayService: GooglePlayService,
        private readonly dataSource: DataSource,
        private readonly iapProductService: IapProductService,
        private readonly appStoreService: AppStoreService,
    ) {
        this.testUserIds =
            this.configService.get<string[]>('testUserIds') || [];
    }

    async verifyPurchase(
        params: VerifyPurchaseParamsDto,
    ): Promise<VerifyPurchaseResponseDto> {
        const { userId, receipt, type, platform } = params;

        this.logger.log(
            `Verifying purchase - user: ${userId}, platform: ${platform}, token: ${receipt}`,
        );

        if (!userId || !receipt || !platform) {
            throw new BadRequestException(
                !userId
                    ? ERROR_MESSAGES.USER_ID_REQUIRED
                    : !receipt
                      ? ERROR_MESSAGES.MISSING_PURCHASE_TOKEN
                      : 'Platform is required',
            );
        }

        const user = await this.userService.findById(userId);
        if (!user) {
            throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if (platform === IapStore.ANDROID) {
            return this.verifyGooglePlayPurchase(userId, receipt, type, user);
        }

        if (platform === IapStore.IOS) {
            return this.verifyAppStorePurchase(
                userId,
                receipt,
                type,
                user,
                params.xcodeTest,
            );
        }

        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }

    private async verifyGooglePlayPurchase(
        userId: string,
        receipt: string,
        type: IapProductType,
        user: any, // thay bằng type User của bạn nếu có
    ): Promise<VerifyPurchaseResponseDto> {
        let googleData: any;
        let parsed: any;

        try {
            if (type === IapProductType.SUBSCRIPTION) {
                googleData =
                    await this.googlePlayService.verifySubscription(receipt);

                if (!googleData) {
                    throw new BadRequestException(
                        'Invalid or expired subscription purchase token',
                    );
                }

                parsed =
                    this.googlePlayService.parseSubscriptionResponse(
                        googleData,
                    );
            } else {
                googleData =
                    await this.googlePlayService.verifyProductPurchase(receipt);

                if (!googleData?.acknowledgementState) {
                    throw new BadRequestException(
                        'No acknowledgement info from Google Play',
                    );
                }

                const lineItem = googleData.productLineItem?.[0];

                if (!lineItem?.productId) {
                    throw new BadRequestException(
                        'Missing product information in Google response',
                    );
                }

                parsed =
                    this.googlePlayService.parseProductPurchaseResponse(
                        googleData,
                    );
            }
        } catch (err) {
            this.logger.warn(`Google Play verification failed: ${err.message}`);
            throw new BadRequestException(
                `Google Play verification failed: ${err.message}`,
            );
        }

        const {
            storeProductId,
            basePlanId,
            orderId,
            purchaseTime,
            currency,
            expiryTime,
            amountPaid,
        } = parsed;

        return this.processVerifiedPurchase({
            userId,
            user,
            receipt,
            platform: IapStore.ANDROID,
            storeProductId,
            basePlanId: basePlanId ?? null,
            orderId,
            purchaseTime,
            currency,
            expiryTime,
            amountPaid,
            googlePayload: googleData,
            type,
        });
    }

    private async verifyAppStorePurchase(
        userId: string,
        receipt: string,
        type: IapProductType,
        user: any,
        isXcodeTest?: boolean,
    ): Promise<VerifyPurchaseResponseDto> {
        let appleData: any;
        let parsed: ParsedTransactionData;

        try {
            const { decoded } = await this.appStoreService.verifyTransaction(
                receipt,
                isXcodeTest,
            );

            appleData = decoded;

            parsed = this.appStoreService.parseTransactionData(decoded, type);
        } catch (err) {
            this.logger.warn(
                `App Store transaction verification failed: ${err.message}`,
            );
            throw new BadRequestException(
                `App Store verification failed: ${err.message}`,
            );
        }

        const {
            storeProductId,
            orderId,
            purchaseTime,
            currency,
            expiryTime,
            amountPaid,
            originalTransactionId,
        } = parsed;

        const purchaseTimeDate = purchaseTime ? new Date(purchaseTime) : null;
        const expiryTimeDate = expiryTime ? new Date(expiryTime) : null;

        return this.processVerifiedPurchase({
            userId,
            user,
            receipt, // lưu JWS string để audit
            platform: IapStore.IOS,
            storeProductId,
            basePlanId: null,
            orderId: orderId,
            originalTransactionId: originalTransactionId,
            purchaseTime: purchaseTimeDate,
            currency,
            expiryTime: expiryTimeDate,
            amountPaid,
            applePayload: appleData,
            type,
        });
    }

    private async processVerifiedPurchase(input: {
        userId: string;
        user: any;
        receipt: string;
        platform: IapStore;
        storeProductId: string;
        basePlanId: string | null;
        orderId: string;
        originalTransactionId?: string | null;
        purchaseTime: Date | null;
        currency: string;
        expiryTime?: Date | null;
        amountPaid?: number;
        googlePayload?: any;
        applePayload?: any;
        type: IapProductType;
    }): Promise<VerifyPurchaseResponseDto> {
        const {
            userId,
            receipt,
            platform,
            storeProductId,
            basePlanId,
            orderId,
            originalTransactionId,
            purchaseTime,
            currency,
            expiryTime,
            amountPaid,
            googlePayload,
            applePayload,
            type,
            user,
        } = input;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Check trùng token
            let existingTx: Transaction;

            if (platform === IapStore.IOS) {
                existingTx = await queryRunner.manager.findOne(Transaction, {
                    where: {
                        originalTransactionId,
                        storeProductId: storeProductId,
                        orderId: orderId,
                    },
                });
            } else if (platform === IapStore.ANDROID) {
                existingTx = await queryRunner.manager.findOne(Transaction, {
                    where: { receipt },
                });
            } else {
                this.logger.error(
                    `Unsupported platform for transaction check: ${platform}`,
                );
                throw new BadRequestException(
                    'Unsupported platform for transaction check',
                );
            }

            if (existingTx) {
                if (existingTx.userId !== userId) {
                    throw new BadRequestException(
                        ERROR_MESSAGES.SUBSCRIPTION_ALREADY_USED,
                    );
                }

                const updatedUser = await this.userService.getUserInfo(user);
                await queryRunner.commitTransaction();

                const coins = existingTx.grantedCoins;
                const isSub = type === IapProductType.SUBSCRIPTION;

                return {
                    success: true,
                    message: isSub
                        ? `Subscription successful! You have been credited with ${coins} coins.`
                        : `Purchase successful! ${coins} coins have been added to your account.`,
                    data: {
                        coinsAdded: coins,
                        productId: existingTx.storeProductId,
                        transactionId: existingTx.id,
                        user: updatedUser,
                    },
                };
            }

            // 2. Tính số coin
            const { coinsToAdd } =
                await this.iapProductService.calculateCoinsForProduct({
                    storeProductId,
                    basePlanId,
                    manager: queryRunner.manager,
                });

            if (coinsToAdd <= 0) {
                throw new BadRequestException(
                    `Product ${storeProductId} has no coins configured or invalid plan`,
                );
            }

            // 3. Tạo transaction
            const transaction = this.transactionRepository.create({
                userId,
                orderId,
                originalTransactionId,
                storeProductId,
                basePlanId,
                subscriptionState:
                    type === IapProductType.SUBSCRIPTION
                        ? SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_ACTIVE
                        : null,
                purchaseTime,
                receipt,
                quantity: 1,
                store: platform,
                status:
                    type === IapProductType.SUBSCRIPTION
                        ? TransactionStatus.ACTIVE
                        : TransactionStatus.PURCHASED,
                isOneTime: type === IapProductType.ONETIME,
                amountPaid,
                grantedCoins: coinsToAdd,
                currency,
                storePayload: googlePayload || applePayload || null,
                expiryTime,
            });

            await queryRunner.manager.save(transaction);

            // 4. Cấp coin
            await this.userService.addCoins({
                manager: queryRunner.manager,
                userId,
                amount: coinsToAdd,
                coinType: CoinType.PERMANENT,
                description: `iap:${storeProductId}${basePlanId ? `:${basePlanId}` : ''}`,
                referenceType: CoinReferenceType.IAP,
                referenceId: transaction?.id,
            });

            await queryRunner.commitTransaction();

            const freshUser = await this.userService.findById(userId);
            const updatedUser = await this.userService.getUserInfo(freshUser);

            this.logger.log(
                `Granted ${coinsToAdd} coins to ${userId} via ${storeProductId} (${platform})`,
            );

            const isSub = type === IapProductType.SUBSCRIPTION;
            const message = isSub
                ? `Subscription successful! You have been credited with ${coinsToAdd} coins.`
                : `Purchase successful! ${coinsToAdd} coins have been added to your account.`;

            return {
                success: true,
                message,
                data: {
                    coinsAdded: coinsToAdd,
                    productId: storeProductId,
                    transactionId: transaction.id,
                    user: updatedUser,
                },
            };
        } catch (err: any) {
            await queryRunner.rollbackTransaction();
            console.log(err);
            this.logger.error(`Purchase processing failed: ${err}`, err.stack);
            throw new BadRequestException(
                `${ERROR_MESSAGES.SUBSCRIPTION_VERIFICATION_FAILED} - ${err.message}`,
            );
        } finally {
            await queryRunner.release();
        }
    }

    async handleGooglePlayWebhook(body: any) {
        try {
            const message = JSON.parse(
                Buffer.from(body.message.data, 'base64').toString(),
            );
            const { subscriptionNotification } = message;

            if (!subscriptionNotification) return;

            const { purchaseToken, notificationType } =
                subscriptionNotification;

            this.logger.log(
                `Google Play RTDN: type=${notificationType}, token=${purchaseToken}`,
            );

            // Chỉ gọi verify 1 lần
            const sub =
                await this.googlePlayService.verifySubscription(purchaseToken);

            if (!sub) {
                this.logger.warn(
                    `Subscription not found for token: ${purchaseToken}`,
                );
                return;
            }

            const txn = await this.transactionRepository.findOne({
                where: { receipt: purchaseToken },
                order: { createdAt: 'DESC' },
            });

            if (!txn) {
                this.logger.warn(
                    `No initial transaction found for ${purchaseToken}`,
                );
                return;
            }

            let newSubscriptionState: SUBSCRIPTION_STATUS;
            let newStatus = txn.status;

            switch (notificationType) {
                case GoogleSubscriptionNotificationType.RENEWED:
                case GoogleSubscriptionNotificationType.RECOVERED:
                case GoogleSubscriptionNotificationType.RESTARTED:
                    newSubscriptionState =
                        SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_ACTIVE;
                    newStatus = TransactionStatus.ACTIVE;
                    break;
                case GoogleSubscriptionNotificationType.CANCELED:
                    newSubscriptionState =
                        SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_CANCELED;
                    break;
                case GoogleSubscriptionNotificationType.EXPIRED:
                    newSubscriptionState =
                        SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_EXPIRED;
                    newStatus = TransactionStatus.EXPIRED;
                    break;

                case GoogleSubscriptionNotificationType.REVOKED:
                    newSubscriptionState =
                        SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_REVOKED;
                    newStatus = TransactionStatus.EXPIRED;
                    break;

                case GoogleSubscriptionNotificationType.ON_HOLD:
                    newSubscriptionState =
                        SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_ON_HOLD;
                    break;

                case GoogleSubscriptionNotificationType.IN_GRACE_PERIOD:
                    newSubscriptionState =
                        SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_IN_GRACE_PERIOD;
                    break;

                default:
                    this.logger.warn(
                        `Unhandled RTDN type: ${notificationType}`,
                    );
                    return;
            }

            const { orderId, purchaseTime, expiryTime, amountPaid, currency } =
                this.googlePlayService.parseSubscriptionResponse(sub);

            await this.transactionRepository.update(txn.id, {
                orderId,
                purchaseTime,
                expiryTime,
                amountPaid,
                currency,
                subscriptionState:
                    newSubscriptionState ?? txn.subscriptionState,
                status: newStatus,
                storePayload: sub as any,
            });

            this.logger.log(
                `Processed RTDN type=${notificationType} for user ${txn.userId}`,
            );
        } catch (e) {
            this.logger.error('RTDN processing failed', e);
            throw new BadRequestException(
                `RTDN processing failed: ${e.message}`,
            );
        }
    }

    async handleAppStoreWebhook(body: any) {
        try {
            // App Store sends signedPayload in the request body
            const { signedPayload } = body;

            if (!signedPayload) {
                this.logger.warn('No signedPayload in App Store notification');
                return;
            }

            console.log(
                'Received App Store notification with payload:',
                signedPayload,
            );

            // Verify and decode the notification
            const { decoded } =
                await this.appStoreService.verifyNotification(signedPayload);

            const { notificationType, subtype, data } = decoded;

            this.logger.log(
                `App Store notification: type=${notificationType}, subtype=${subtype}`,
            );

            // Extract transaction info from data.signedTransactionInfo
            if (!data?.signedTransactionInfo) {
                this.logger.warn('No transaction info in notification');
                return;
            }

            const transactionDecoded =
                await this.appStoreService.verifyTransaction(
                    data.signedTransactionInfo,
                );
            const transactionData = transactionDecoded.decoded;

            const {
                expiryTime,
                purchaseTime,
                amountPaid,
                orderId,
                originalTransactionId,
                storeProductId,
            } = this.appStoreService.parseTransactionData(
                transactionData,
                IapProductType.SUBSCRIPTION,
            );

            const purchaseTimeDate = toDate(purchaseTime);
            const expiryTimeDate = toDate(expiryTime);

            // Find existing transaction
            const txn = await this.transactionRepository.findOne({
                where: {
                    originalTransactionId: originalTransactionId,
                    storeProductId: storeProductId,
                    orderId: orderId,
                },
                order: { createdAt: 'DESC' },
            });

            if (!txn) {
                this.logger.warn(
                    `No transaction found for originalTransactionId: ${originalTransactionId}`,
                );
                return;
            }

            let newSubscriptionState: SUBSCRIPTION_STATUS | null = null;
            let newStatus = txn.status;

            // Handle different notification types
            switch (notificationType) {
                case AppleNotificationType.DID_RENEW:
                case AppleNotificationType.SUBSCRIBED:
                    newSubscriptionState =
                        SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_ACTIVE;
                    newStatus = TransactionStatus.ACTIVE;
                    break;

                case AppleNotificationType.DID_CHANGE_RENEWAL_STATUS:
                    // Check if auto-renew is turned off
                    if (
                        subtype ===
                        AppleRenewalStatusSubtype.AUTO_RENEW_DISABLED
                    ) {
                        newSubscriptionState =
                            SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_CANCELED;
                    }

                    if (
                        subtype === AppleRenewalStatusSubtype.AUTO_RENEW_ENABLED
                    ) {
                        newSubscriptionState =
                            SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_ACTIVE;
                        newStatus = TransactionStatus.ACTIVE;
                    }
                    break;

                case AppleNotificationType.EXPIRED:
                case AppleNotificationType.GRACE_PERIOD_EXPIRED:
                    newSubscriptionState =
                        SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_EXPIRED;
                    newStatus = TransactionStatus.EXPIRED;
                    break;

                case AppleNotificationType.DID_FAIL_TO_RENEW:
                    newSubscriptionState =
                        SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_IN_GRACE_PERIOD;
                    break;

                case AppleNotificationType.REFUND:
                    newSubscriptionState =
                        SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_REVOKED;
                    newStatus = TransactionStatus.REFUNDED;
                    break;

                case AppleNotificationType.REVOKE:
                    newSubscriptionState =
                        SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_REVOKED;
                    newStatus = TransactionStatus.EXPIRED;
                    break;

                default:
                    this.logger.log(
                        `Unhandled notification type: ${notificationType}`,
                    );
                    return;
            }

            await this.transactionRepository.update(txn.id, {
                purchaseTime: purchaseTimeDate,
                expiryTime: expiryTimeDate,
                amountPaid,
                subscriptionState:
                    newSubscriptionState ?? txn.subscriptionState,
                status: newStatus,
                storePayload: transactionData as any,
                orderId: orderId,
            });

            this.logger.log(
                `Processed App Store notification type=${notificationType} for user ${txn.userId}`,
            );
        } catch (e) {
            this.logger.error('App Store notification processing failed', e);
            throw new BadRequestException(
                `App Store notification processing failed: ${e.message}`,
            );
        }
    }
}
