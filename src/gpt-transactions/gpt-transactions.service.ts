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
}
