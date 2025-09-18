import { Injectable } from '@nestjs/common';
import { GptTransaction } from './entity/gpt-transaction.entity';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class GptTransactionsService {
    constructor(
        @InjectRepository(GptTransaction)
        private readonly transactionRepository: Repository<GptTransaction>,
    ) {}

    async getLatestIapTransaction(
        userId: string,
    ): Promise<GptTransaction | null> {
        return this.transactionRepository.findOne({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async getLatestSubscriptionTransaction(
        userId: string,
        subProductIds: string[],
    ): Promise<GptTransaction | null> {
        return this.transactionRepository.findOne({
            where: { userId, productId: In(subProductIds) },
            order: { purchaseTime: 'DESC' },
        });
    }

    async findByOrderId(orderId: string): Promise<GptTransaction[]> {
        return this.transactionRepository.find({
            where: { orderId },
        });
    }

    async findByUserIdAndPurchaseToken(
        userId: string,
        purchaseToken: string,
    ): Promise<GptTransaction[]> {
        return this.transactionRepository.find({
            where: { userId, purchaseToken },
        });
    }

    async createAndSaveTransaction(
        transaction: Partial<GptTransaction> & { userId: string },
    ): Promise<GptTransaction> {
        const dbTransaction = this.transactionRepository.create({
            userId: transaction.userId,
            orderId: transaction.orderId,
            productId: transaction.productId,
            purchaseTime: transaction.purchaseTime,
            purchaseToken: transaction.purchaseToken,
            quantity:
                transaction.quantity && transaction.quantity > 0
                    ? transaction.quantity
                    : 1,
        });

        return await this.transactionRepository.save(dbTransaction);
    }
}
