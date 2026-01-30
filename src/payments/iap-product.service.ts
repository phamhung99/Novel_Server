import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { IapProduct } from './entities/iap-product.entity';
import { ERROR_MESSAGES } from 'src/common/constants/app.constant';

@Injectable()
export class IapProductService {
    constructor(
        @InjectRepository(IapProduct)
        private readonly iapProductRepository: Repository<IapProduct>,
    ) {}

    async calculateCoinsForProduct({
        storeProductId,
        basePlanId,
        manager,
    }: {
        storeProductId: string;
        basePlanId: string;
        manager: EntityManager;
    }) {
        if (!manager) {
            throw new Error(ERROR_MESSAGES.ENTITY_MANAGER_REQUIRED);
        }

        const whereCondition: any = { storeProductId };

        if (basePlanId && basePlanId.trim() !== '') {
            whereCondition.basePlanId = basePlanId;
        } else {
            whereCondition.basePlanId = IsNull();
        }

        const iapProduct = await manager.findOne(IapProduct, {
            where: whereCondition,
        });

        if (!iapProduct) {
            throw new BadRequestException(ERROR_MESSAGES.IAP_PRODUCT_NOT_FOUND);
        }

        const bonusMultiplier = 1 + (iapProduct.bonusPercentage ?? 0) / 100;
        const fullCoins = iapProduct.baseCoins * bonusMultiplier;

        console.log(
            iapProduct.baseCoins,
            iapProduct.bonusPercentage,
            fullCoins,
        );

        const coinsToAdd = fullCoins;

        return {
            coinsToAdd,
            iapProduct,
        };
    }
}
