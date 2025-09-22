import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromotionCode } from './entity/promotion-code.entity';

@Injectable()
export class PromotionCodeService {
    constructor(
        @InjectRepository(PromotionCode)
        private readonly promotionCodeRepository: Repository<PromotionCode>,
    ) {}

    async existsByPromotionCode(promotionCode: string): Promise<boolean> {
        const count = await this.promotionCodeRepository.count({
            where: { promotionCode },
        });
        return count > 0;
    }
}
