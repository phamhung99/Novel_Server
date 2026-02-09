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
    NotificationType,
    SUBSCRIPTION_STATUS,
    TransactionStatus,
} from 'src/common/enums/app.enum';
import { Transaction } from './entities/transaction.entity';
import { IapProductService } from './iap-product.service';
import { VerifyPurchaseResponseDto } from './dto/verify-purchase.response.dto';
import { VerifyPurchaseParamsDto } from './dto/verify-purchase.dto';
import { AppStoreService } from 'src/app-store/app-store.service';

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
            return this.verifyAppStorePurchase(userId, receipt, type, user);
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
        receipt: string, // BÂY GIỜ là signedTransaction JWS string (từ client gửi lên)
        type: IapProductType,
        user: any,
    ): Promise<VerifyPurchaseResponseDto> {
        let appleData: any;
        let parsed: any;

        try {
            // Verify local JWS
            // const { decoded } = await this.appStoreService.verifyTransaction(
            //     receipt,
            //     type,
            // );

            const decoded = this.appStoreService.fakeDecode(type);

            appleData = decoded; // lưu decoded payload

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
            originalTransactionId,
            purchaseTime,
            currency,
            expiryTime,
            amountPaid,
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
            orderId: originalTransactionId || receipt.substring(0, 50), // hoặc dùng transactionId
            purchaseTime: purchaseTimeDate,
            currency,
            expiryTime: expiryTimeDate,
            amountPaid,
            applePayload: appleData, // decoded JWSTransactionDecodedPayload
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
            const existingTx = await queryRunner.manager.findOne(Transaction, {
                where: { receipt },
            });

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
                status: TransactionStatus.CONSUMED,
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
                source: `iap:${storeProductId}${basePlanId ? `:${basePlanId}` : ''}`,
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
            this.logger.error(
                `Purchase processing failed: ${err.message}`,
                err.stack,
            );
            throw new BadRequestException(
                `${ERROR_MESSAGES.SUBSCRIPTION_VERIFICATION_FAILED} - ${err.message}`,
            );
        } finally {
            await queryRunner.release();
        }
    }

    // async handleGooglePlayWebhook(body: any) {
    //     try {
    //         const message = JSON.parse(
    //             Buffer.from(body.message.data, 'base64').toString(),
    //         );
    //         const { subscriptionNotification } = message;

    //         if (!subscriptionNotification) return;

    //         const { receipt, notificationType } =
    //             subscriptionNotification;

    //         this.logger.log(
    //             `Google Play RTDN: type=${notificationType}, token=${receipt}`,
    //         );

    //         // Chỉ gọi verify 1 lần
    //         const sub =
    //             await this.googlePlayService.verifySubscription(receipt);
    //         if (!sub) {
    //             this.logger.warn(
    //                 `Subscription not found for token: ${receipt}`,
    //             );
    //             return;
    //         }

    //         const txn = await this.transactionRepository.findOne({
    //             where: { receipt },
    //             order: { createdAt: 'DESC' },
    //         });

    //         if (!txn) {
    //             this.logger.warn(
    //                 `No initial transaction found for ${receipt}`,
    //             );
    //             // Có thể quyết định bỏ qua hoặc tạo record warning
    //             return;
    //         }

    //         let shouldCreateNewTx = false;
    //         let newSubscriptionState: SUBSCRIPTION_STATUS;

    //         switch (notificationType) {
    //             case NotificationType.RENEWED:
    //             case NotificationType.RECOVERED:
    //                 newSubscriptionState =
    //                     SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_ACTIVE;
    //                 shouldCreateNewTx = true;
    //                 break;

    //             case NotificationType.RESTARTED:
    //                 newSubscriptionState =
    //                     SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_ACTIVE;
    //                 shouldCreateNewTx = false; // thường không tạo tx mới
    //                 break;

    //             case NotificationType.CANCELED:
    //             case NotificationType.EXPIRED:
    //                 newSubscriptionState =
    //                     SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_CANCELED; // hoặc EXPIRED tùy logic
    //                 shouldCreateNewTx =
    //                     notificationType === NotificationType.EXPIRED;
    //                 break;

    //             case NotificationType.REVOKED:
    //                 newSubscriptionState =
    //                     SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_EXPIRED;
    //                 shouldCreateNewTx = true;
    //                 break;

    //             case NotificationType.ON_HOLD:
    //             case NotificationType.IN_GRACE_PERIOD:
    //                 newSubscriptionState =
    //                     SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_PAUSED;
    //                 shouldCreateNewTx = true;
    //                 break;

    //             default:
    //                 this.logger.warn(
    //                     `Unhandled RTDN type: ${notificationType}`,
    //                 );
    //                 return;
    //         }

    //         // Nếu cần tạo transaction audit mới
    //         if (shouldCreateNewTx) {
    //             const transaction = this.transactionRepository.create({
    //                 userId,
    //                 orderId,
    //                 storeProductId,
    //                 basePlanId,
    //                 subscriptionState:
    //                     type === IapProductType.SUBSCRIPTION
    //                         ? SUBSCRIPTION_STATUS.SUBSCRIPTION_STATE_ACTIVE
    //                         : null,
    //                 purchaseTime,
    //                 receipt,
    //                 quantity: 1,
    //                 store: platform,
    //                 status: TransactionStatus.CONSUMED,
    //                 isOneTime: type === IapProductType.ONETIME,
    //                 amountPaid,
    //                 grantedCoins: coinsToAdd,
    //                 currency,
    //                 storePayload: googlePayload || applePayload || null,
    //                 expiryTime,
    //             });

    //             await this.transactionRepository.save(transaction);
    //         }

    //         this.logger.log(
    //             `Processed RTDN type=${notificationType} for user ${txn.userId}`,
    //         );
    //     } catch (e) {
    //         this.logger.error('RTDN processing failed', e);
    //         // Có thể throw để Google retry, hoặc chỉ log tùy policy
    //     }
    // }
}
