import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { IapProduct } from './entities/iap-product.entity';
import { ERROR_MESSAGES } from 'src/common/constants/app.constant';
import { UserService } from 'src/user/user.service';
import { GooglePlayService } from 'src/google-play/google-play.service';
import {
    CoinType,
    IapProductType,
    IapStore,
    TransactionStatus,
} from 'src/common/enums/app.enum';
import { Transaction } from './entities/transaction.entity';
import { IapProductService } from './iap-product.service';

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
    ) {
        this.testUserIds =
            this.configService.get<string[]>('testUserIds') || [];
    }

    async verifyGooglePlayPurchase({
        userId,
        purchaseToken,
        type,
    }: {
        userId: string;
        purchaseToken: string;
        type: IapProductType;
    }) {
        this.logger.log(
            `Verifying purchase - user: ${userId}, token: ${purchaseToken}`,
        );

        if (!userId || !purchaseToken) {
            throw new BadRequestException(
                !userId
                    ? ERROR_MESSAGES.USER_ID_REQUIRED
                    : ERROR_MESSAGES.MISSING_PURCHASE_TOKEN,
            );
        }

        await this.userService.findById(userId);

        // Xác thực Google Play
        let googleData: any = null;
        let parsed: any = null;

        if (type === IapProductType.SUBSCRIPTION) {
            googleData =
                await this.googlePlayService.verifySubscription(purchaseToken);

            if (!googleData) {
                throw new BadRequestException(
                    'Invalid or expired subscription purchase token',
                );
            }

            parsed =
                this.googlePlayService.parseSubscriptionResponse(googleData);
        } else {
            googleData =
                await this.googlePlayService.verifyProductPurchase(
                    purchaseToken,
                );

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
                this.googlePlayService.parseProductPurchaseResponse(googleData);
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

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Kiểm tra trùng purchase token
            const existingTx = await queryRunner.manager.findOne(Transaction, {
                where: { purchaseToken },
            });

            if (existingTx) {
                if (existingTx.userId !== userId) {
                    throw new BadRequestException(
                        ERROR_MESSAGES.SUBSCRIPTION_ALREADY_USED,
                    );
                }
                await queryRunner.commitTransaction();
                return {
                    success: true,
                    coinsAdded: existingTx.grantedCoins,
                    productId: existingTx.storeProductId,
                    transactionId: existingTx.id,
                    message: 'Purchase verified and coins granted successfully',
                };
            }

            // 2. Tính số coin từ sản phẩm
            const { coinsToAdd } =
                await this.iapProductService.calculateCoinsForProduct({
                    storeProductId,
                    basePlanId: basePlanId ?? null,
                    manager: queryRunner.manager,
                });

            if (coinsToAdd <= 0) {
                throw new BadRequestException(
                    `Product ${storeProductId} has no coins configured or invalid plan`,
                );
            }

            // 3. Lưu transaction (lịch sử)
            const transaction = this.transactionRepository.create({
                userId,
                orderId,
                storeProductId,
                basePlanId: basePlanId ?? null,
                purchaseTime,
                purchaseToken,
                quantity: 1,
                store: IapStore.ANDROID,
                status: TransactionStatus.CONSUMED,
                isOneTime: type === IapProductType.ONETIME,
                amountPaid,
                grantedCoins: coinsToAdd,
                currency,
                storePayload: googleData,
                expiryTime,
            });

            await queryRunner.manager.save(transaction);

            // 4. Cấp coin vĩnh viễn
            await this.userService.grantCoins({
                manager: queryRunner.manager,
                userId,
                amount: coinsToAdd,
                type: CoinType.PERMANENT,
                source: `iap:${storeProductId}${basePlanId ? `:${basePlanId}` : ''}`,
            });

            await queryRunner.commitTransaction();

            this.logger.log(
                `Granted ${coinsToAdd} permanent coins to ${userId} via ${storeProductId}`,
            );

            return {
                success: true,
                coinsAdded: coinsToAdd,
                productId: storeProductId,
                transactionId: transaction.id,
                message: 'Purchase verified and coins granted successfully',
            };
        } catch (err: any) {
            await queryRunner.rollbackTransaction();
            this.logger.error(
                `Verify purchase failed: ${err.message}`,
                err.stack,
            );
            throw new BadRequestException(
                `${ERROR_MESSAGES.SUBSCRIPTION_VERIFICATION_FAILED} - ${err.message}`,
            );
        } finally {
            await queryRunner.release();
        }
    }
}
