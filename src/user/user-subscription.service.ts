import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { Transaction } from 'src/payments/entities/transaction.entity';
import {
    CoinReferenceType,
    CoinType,
    IapStore,
    TransactionStatus,
} from 'src/common/enums/app.enum';
import { IapProductService } from 'src/payments/iap-product.service';
import { ConfigService } from '@nestjs/config';
import {
    shouldResetByInterval,
    shouldResetMonthly,
    shouldResetWeekly,
    shouldResetYearly,
} from 'src/common/utils/date.utils';
import { UserCoinService } from './user-coin.service';

enum ResetPeriod {
    Weekly = 'weekly',
    Monthly = 'monthly',
    Yearly = 'yearly',
}

@Injectable()
export class UserSubscriptionService {
    private readonly logger = new Logger(UserSubscriptionService.name);

    private readonly enableTestSubscription: boolean;
    private readonly testSubscriptionIntervalMinutes: number;

    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepo: Repository<Transaction>,
        private readonly dataSource: DataSource,
        private readonly iapProductService: IapProductService,
        private readonly configService: ConfigService,
        private readonly userCoinService: UserCoinService,
    ) {
        this.enableTestSubscription = this.configService.get<boolean>(
            'ENABLE_TEST_SUBSCRIPTION',
        );
        this.testSubscriptionIntervalMinutes = this.configService.get<number>(
            'TEST_SUBSCRIPTION_INTERVAL_MINUTES',
        );
    }

    private getIosSubscriptionPeriod(
        storeProductId: string | null | undefined,
    ): ResetPeriod | null {
        if (!storeProductId) return null;

        const id = storeProductId.toLowerCase().trim();

        if (
            id.includes('week') ||
            id.includes('7day') ||
            id.includes('weekly') ||
            id.endsWith('.weekly')
        ) {
            return ResetPeriod.Weekly;
        }

        if (
            id.includes('month') ||
            id.includes('30day') ||
            id.includes('monthly') ||
            id.endsWith('.monthly')
        ) {
            return ResetPeriod.Monthly;
        }

        if (
            id.includes('year') ||
            id.includes('annual') ||
            id.includes('365') ||
            id.includes('yearly') ||
            id.endsWith('.yearly')
        ) {
            return ResetPeriod.Yearly;
        }

        this.logger.warn(
            `Cannot determine subscription period from storeProductId: ${storeProductId}`,
        );
        return null;
    }

    private async checkAndResetSubscriptionCoins(
        userId: string,
        subscription: Transaction,
    ): Promise<void> {
        const now = new Date();

        const lastReset =
            subscription.lastCoinResetAt || subscription.createdAt;
        const platform = subscription.store;

        let shouldReset = false;
        let resetPeriod: ResetPeriod | null = null;
        let coinsToAdd = 0;

        if (platform === IapStore.ANDROID) {
            ({ shouldReset, resetPeriod, coinsToAdd } =
                await this.handleAndroidReset(subscription, lastReset, now));
        } else if (platform === IapStore.IOS) {
            ({ shouldReset, resetPeriod, coinsToAdd } =
                await this.handleIosReset(subscription, lastReset, now));
        } else {
            this.logger.warn(`Unsupported platform for reset: ${platform}`);
            return;
        }

        if (!shouldReset || !resetPeriod || coinsToAdd <= 0) {
            return;
        }

        await this.dataSource.transaction(async (manager) => {
            this.logger.log(
                `Resetting ${coinsToAdd} coins for ${platform} subscription ` +
                    `${subscription.id} (${resetPeriod}) user=${userId}`,
            );

            await this.userCoinService.addCoins({
                manager,
                userId,
                amount: coinsToAdd,
                coinType: CoinType.PERMANENT,
                description: `${resetPeriod} subscription coin reset (${platform})`,
                referenceType: CoinReferenceType.IAP,
                referenceId: subscription.id,
            });

            await manager.getRepository(Transaction).update(subscription.id, {
                lastCoinResetAt: now,
            });

            this.logger.log(
                `Reset completed: ${coinsToAdd} coins → user ${userId}`,
            );
        });
    }

    private async handleAndroidReset(
        sub: Transaction,
        lastReset: Date,
        now: Date,
    ): Promise<{
        shouldReset: boolean;
        resetPeriod: ResetPeriod;
        coinsToAdd: number;
    }> {
        const planId = sub.basePlanId || '';
        let resetPeriod: ResetPeriod | null = null;
        let shouldReset = false;

        const isTest = this.enableTestSubscription;

        if (isTest) {
            const intervalMin = this.testSubscriptionIntervalMinutes || 5;
            shouldReset = shouldResetByInterval(lastReset, now, intervalMin);
        } else if (planId.includes('weekly')) {
            resetPeriod = ResetPeriod.Weekly;
            shouldReset = shouldResetWeekly(lastReset, now);
        } else if (planId.includes('monthly')) {
            resetPeriod = ResetPeriod.Monthly;
            shouldReset = shouldResetMonthly(lastReset, now);
        } else if (planId.includes('yearly')) {
            resetPeriod = ResetPeriod.Yearly;
            shouldReset = shouldResetYearly(lastReset, now);
        }

        let coinsToAdd = 0;
        if (shouldReset && resetPeriod) {
            const calc = await this.iapProductService.calculateCoinsForProduct({
                storeProductId: sub.storeProductId,
                basePlanId: sub.basePlanId,
            });
            coinsToAdd = calc.coinsToAdd;
        }

        return { shouldReset, resetPeriod, coinsToAdd };
    }

    private async handleIosReset(
        sub: Transaction,
        lastReset: Date,
        now: Date,
    ): Promise<{
        shouldReset: boolean;
        resetPeriod: ResetPeriod | null;
        coinsToAdd: number;
    }> {
        const productId = sub.storeProductId || '';
        const period = this.getIosSubscriptionPeriod(productId);

        let shouldReset = false;
        let resetPeriod: ResetPeriod | null = null;

        const isTest = this.enableTestSubscription;

        if (isTest) {
            const intervalMin = this.testSubscriptionIntervalMinutes || 5;
            shouldReset = shouldResetByInterval(lastReset, now, intervalMin);
        } else if (period === ResetPeriod.Weekly) {
            resetPeriod = ResetPeriod.Weekly;
            shouldReset = shouldResetWeekly(lastReset, now);
        } else if (period === ResetPeriod.Monthly) {
            resetPeriod = ResetPeriod.Monthly;
            shouldReset = shouldResetMonthly(lastReset, now);
        } else if (period === ResetPeriod.Yearly) {
            resetPeriod = ResetPeriod.Yearly;
            shouldReset = shouldResetYearly(lastReset, now);
        }

        let coinsToAdd = 0;
        if (shouldReset && resetPeriod) {
            const calc = await this.iapProductService.calculateCoinsForProduct({
                storeProductId: sub.storeProductId,
                basePlanId: null,
            });
            coinsToAdd = calc.coinsToAdd;
        }

        return { shouldReset, resetPeriod, coinsToAdd };
    }

    async getSubscriptionStatus(userId: string): Promise<{
        isSubUser: boolean;
        basePlanId: string | null;
        expiresAt: string | null;
    }> {
        const now = new Date();

        const activeSubscription = await this.transactionRepo.findOne({
            where: {
                userId: userId,
                expiryTime: MoreThan(now),
                status: TransactionStatus.ACTIVE,
            },
            order: {
                expiryTime: 'DESC',
            },
            select: [
                'id',
                'basePlanId',
                'storeProductId',
                'createdAt',
                'lastCoinResetAt',
                'expiryTime',
                'store',
            ],
        });

        if (activeSubscription) {
            await this.checkAndResetSubscriptionCoins(
                userId,
                activeSubscription,
            );

            return {
                isSubUser: true,
                basePlanId: activeSubscription.basePlanId,
                expiresAt: activeSubscription.expiryTime.toISOString(),
            };
        }

        return {
            isSubUser: false,
            basePlanId: null,
            expiresAt: null,
        };
    }
}
