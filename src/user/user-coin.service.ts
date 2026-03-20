import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, MoreThan, Repository } from 'typeorm';
import { UserCoins } from './entities/user-coins.entity';
import { CoinTransaction } from './entities/coin-transaction.entity';
import {
    CoinReferenceType,
    CoinTransactionType,
    CoinType,
} from 'src/common/enums/app.enum';
import { TEMPORARY_COIN_DAYS } from 'src/common/constants/app.constant';
import { addDays } from 'src/common/utils/date.utils';
import { WalletDto } from './dto/wallet.dto';
import { PaginationDto } from 'src/story/dto/pagination.dto';

const coinTransactionTitles: Record<CoinReferenceType, string> = {
    [CoinReferenceType.IAP]: 'In-App Purchase',
    [CoinReferenceType.LOGIN]: 'Daily Login Bonus',
    [CoinReferenceType.WATCH_AD_COIN]: 'Ad Watch Coin Reward',
    [CoinReferenceType.CHAPTER_UNLOCK]: 'Chapter Unlock',
    [CoinReferenceType.ADMIN_ADJUST]: 'Admin Adjustment',
    [CoinReferenceType.REFUND]: 'Refund',
    [CoinReferenceType.GIFT_CODE]: 'Gift Code Reward',
};

@Injectable()
export class UserCoinService {
    private readonly logger = new Logger(UserCoinService.name);

    constructor(
        @InjectRepository(UserCoins)
        private readonly userCoinsRepository: Repository<UserCoins>,
        @InjectRepository(CoinTransaction)
        private readonly coinTransactionRepo: Repository<CoinTransaction>,
        private readonly dataSource: DataSource,
    ) {}

    private getTransactionTitle(referenceType: CoinReferenceType): string {
        return coinTransactionTitles[referenceType] ?? 'Coin Transaction';
    }

    async calculateUserCoins(
        userId: string,
        options: { manager?: EntityManager } = {},
    ): Promise<WalletDto> {
        const now = new Date();

        const repo = options.manager
            ? options.manager.getRepository(UserCoins)
            : this.userCoinsRepository;

        const coinRecords = await repo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });

        const permanentCoins = coinRecords
            .filter((c) => c.type === CoinType.PERMANENT)
            .reduce((sum, c) => sum + c.remaining, 0);

        const activeTemporary = coinRecords.filter(
            (c) =>
                c.type === CoinType.TEMPORARY &&
                c.expiresAt &&
                c.expiresAt > now,
        );

        const activeTemporaryAmount = activeTemporary.reduce(
            (sum, c) => sum + c.remaining,
            0,
        );

        const totalCoins = permanentCoins + activeTemporaryAmount;

        return {
            totalCoins,
            permanentCoins,
            temporaryCoins: activeTemporaryAmount,
        };
    }

    async addCoins({
        userId,
        amount,
        coinType = CoinType.PERMANENT,
        referenceType,
        referenceId,
        description,
        manager,
    }: {
        userId: string;
        amount: number;
        coinType?: CoinType;
        referenceType: CoinReferenceType;
        referenceId?: string;
        description?: string;
        manager?: EntityManager;
    }): Promise<number> {
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        const execute = async (tx: EntityManager) => {
            const coinRecord = tx.getRepository(UserCoins).create({
                userId,
                type: coinType,
                amount,
                remaining: amount,
                expiresAt:
                    coinType === CoinType.TEMPORARY
                        ? addDays(new Date(), TEMPORARY_COIN_DAYS)
                        : null,
            });

            await tx.getRepository(UserCoins).save(coinRecord);

            const wallet = await this.calculateUserCoins(userId, {
                manager: tx,
            });
            const newTotalBalance = wallet.totalCoins;

            const transaction = tx.getRepository(CoinTransaction).create({
                userId,
                type: CoinTransactionType.ADD,
                amount,
                balanceAfter: newTotalBalance,
                referenceType,
                referenceId,
                description:
                    description ||
                    `Added ${amount} ${coinType} coins from ${referenceType || 'system'}`,
                createdAt: new Date(),
                expiresAt: coinRecord.expiresAt,
            });

            await tx.getRepository(CoinTransaction).save(transaction);

            return newTotalBalance;
        };

        if (manager) {
            return execute(manager);
        }

        return this.dataSource.transaction(execute);
    }

    async spendCoins({
        userId,
        amount,
        referenceType,
        referenceId,
        description,
        manager,
    }: {
        userId: string;
        amount: number;
        referenceType?: string;
        referenceId?: string;
        description: string;
        manager?: EntityManager;
    }): Promise<{ newBalance: number; spentDetails: any[] }> {
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        const execute = async (tx: EntityManager): Promise<any> => {
            const now = new Date();

            const coinRecords = await tx.getRepository(UserCoins).find({
                where: [
                    {
                        userId,
                        type: CoinType.PERMANENT,
                        remaining: MoreThan(0),
                    },
                    {
                        userId,
                        type: CoinType.TEMPORARY,
                        remaining: MoreThan(0),
                        expiresAt: MoreThan(now),
                    },
                ],
                order: {
                    expiresAt: 'ASC',
                },
                lock: { mode: 'pessimistic_write' },
            });

            if (!coinRecords.length) {
                throw new BadRequestException('No available coins');
            }

            let remainingToSpend = amount;
            const spentDetails: Array<{
                id: string;
                type: CoinType;
                amountSpent: number;
                expiresAt?: string;
            }> = [];
            const recordsToUpdate: UserCoins[] = [];

            for (const record of coinRecords) {
                if (remainingToSpend <= 0) break;

                const canSpend = Math.min(remainingToSpend, record.remaining);
                if (canSpend <= 0) continue;

                record.remaining -= canSpend;
                recordsToUpdate.push(record);

                spentDetails.push({
                    id: record.id,
                    type: record.type,
                    amountSpent: canSpend,
                    expiresAt: record.expiresAt?.toISOString(),
                });

                remainingToSpend -= canSpend;
            }

            if (remainingToSpend > 0) {
                throw new BadRequestException(
                    `Insufficient coins. Required: ${amount}, Available: ${amount - remainingToSpend}`,
                );
            }

            if (recordsToUpdate.length > 0) {
                await tx
                    .getRepository(UserCoins)
                    .save(recordsToUpdate, { chunk: 100 });
            }

            const walletAfter = await this.calculateUserCoins(userId, {
                manager: tx,
            });
            const newTotalBalance = walletAfter.totalCoins;

            const transaction = tx.getRepository(CoinTransaction).create({
                userId,
                type: CoinTransactionType.SPEND,
                amount: -amount,
                balanceAfter: newTotalBalance,
                referenceType,
                referenceId,
                description: description,
                createdAt: new Date(),
                expiresAt: null,
            });

            await tx.getRepository(CoinTransaction).save(transaction);

            return {
                newBalance: newTotalBalance,
                spentDetails,
            };
        };

        return manager
            ? execute(manager)
            : this.dataSource.transaction(execute);
    }

    async getCoinTransactions(userId: string, paginationDto: PaginationDto) {
        const { page = 1, limit = 20 } = paginationDto;
        const skip = (page - 1) * limit;

        const [transactions, total] =
            await this.coinTransactionRepo.findAndCount({
                where: { userId },
                order: { createdAt: 'DESC' },
                skip,
                take: limit,
            });

        const items = transactions.map((transaction) => {
            const title = this.getTransactionTitle(
                transaction.referenceType as CoinReferenceType,
            );

            return {
                amount: transaction.amount,
                title: title,
                description: transaction.description,
                createdAt: transaction.createdAt,
                expiresAt: transaction.expiresAt,
            };
        });

        return {
            page,
            limit,
            total,
            items,
        };
    }
}
