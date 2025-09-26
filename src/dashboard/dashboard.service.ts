import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GptTransaction } from 'src/gpt-transactions/entity/gpt-transaction.entity';
import { GptUser } from 'src/user/entities/gpt-user.entity';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { get24HoursAgo } from 'src/common/utils/date.utils';
import { PurchasedPackageDto } from './dto/purchased-package.dto';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(GptUser)
        private readonly userRepository: Repository<GptUser>,
        @InjectRepository(GptTransaction)
        private readonly transactionRepository: Repository<GptTransaction>,
    ) {}

    async countNewUsersIn24h(): Promise<number> {
        const since = get24HoursAgo();
        return this.userRepository.count({
            where: { createdAt: MoreThanOrEqual(since) },
        });
    }

    async getSubscriptionsWithProductIn24h(): Promise<any[]> {
        const since = get24HoursAgo();
        const transactions = await this.transactionRepository
            .createQueryBuilder('t')
            .leftJoinAndMapOne(
                't.product',
                'gpt_iap_product',
                'p',
                't.product_id = p.store_product_id',
            )
            .where('t.created_at >= :since', { since })
            .getMany();

        const mapped = transactions.map((t: any) => ({
            productId: t.productId,
            quantity: t.quantity,
            product: {
                description: t.product?.description ?? null,
                price: t.product?.price ?? null,
                periodType: t.product?.periodType ?? null,
                periodNumber: t.product?.periodNumber ?? null,
                generationNumber: t.product?.generationNumber ?? null,
                type: t.product?.type ?? null,
            },
        }));

        const merged: Record<string, PurchasedPackageDto> = {};
        for (const item of mapped) {
            const key = item.productId;
            if (merged[key]) {
                merged[key].quantity += item.quantity;
            } else {
                merged[key] = { ...item };
            }
        }

        return Object.values(merged);
    }
}
