import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindManyOptions, IsNull, Repository } from 'typeorm';
import { IapProduct } from './entities/iap-product.entity';
import { ERROR_MESSAGES } from 'src/common/constants/app.constant';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { IapPeriod, IapProductType, IapStore } from 'src/common/enums/app.enum';

interface FormattedProductDto {
    id: string;
    storeProductId: string;
    basePlanId: string | null;
    baseCoins: number;
    bonusPercentage: number;
    bonusCoins: number;
    price: string;
    displayOrder: number | null;
    description: string | null;
    discountPercentage: number;
    imageUrl: string | null;
    isPopular: boolean;
    originalPrice: string;
    period: IapPeriod | null;
    title: string;
    type: IapProductType;
    benefits: any;
}

interface FormattedProductsResponseDto {
    subscription: FormattedProductDto[];
    onetime: FormattedProductDto[];
}

@Injectable()
export class IapProductService extends BaseCrudService<IapProduct> {
    constructor(
        @InjectRepository(IapProduct)
        private readonly iapProductRepository: Repository<IapProduct>,
    ) {
        super(iapProductRepository);
    }

    protected getEntityName(): string {
        return 'IapProduct';
    }

    protected getUniqueField(): keyof IapProduct {
        return null;
    }

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

        const bonusPercentage = iapProduct.bonusPercentage ?? 0;

        const multiplier = 1 + bonusPercentage / 100;

        const fullCoinsFloat = iapProduct.baseCoins * multiplier;

        const fullCoins = Math.ceil(fullCoinsFloat);

        const coinsToAdd = fullCoins;

        return {
            coinsToAdd,
            iapProduct,
        };
    }

    private calculateDiscount(originalPrice, price) {
        if (!originalPrice || originalPrice <= 0 || price >= originalPrice) {
            return 0;
        }
        return Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    private formatPrice(value: number): string {
        return `$${value}`;
    }

    private formatProducts(
        products: IapProduct[],
    ): FormattedProductsResponseDto {
        const formatted = products.map((product) => {
            const bonusPercentage = product.bonusPercentage ?? 0;
            const bonusCoins = Math.ceil(
                (product.baseCoins * bonusPercentage) / 100,
            );

            const discountPercentage = this.calculateDiscount(
                product.originalPrice,
                product.price,
            );

            return {
                id: product.id,
                storeProductId: product.storeProductId,
                basePlanId: product.basePlanId,
                baseCoins: product.baseCoins,
                bonusPercentage,
                bonusCoins,
                price: this.formatPrice(product.price),
                displayOrder: product.displayOrder,
                description: product.description,
                discountPercentage: discountPercentage,
                imageUrl: product.imageUrl,
                isPopular: product.isPopular,
                originalPrice: this.formatPrice(product.originalPrice),
                period: product.period,
                title: product.title,
                type: product.type,
                benefits: product.benefits,
            };
        });

        const subscription = formatted.filter(
            (p) => p.type === IapProductType.SUBSCRIPTION,
        );

        const onetime = formatted.filter(
            (p) => p.type === IapProductType.ONETIME,
        );

        return {
            subscription,
            onetime,
        };
    }

    async findAllWithDisplayOrder(
        platform: IapStore,
    ): Promise<FormattedProductsResponseDto> {
        const findOptions: FindManyOptions<IapProduct> = {
            order: { displayOrder: 'ASC' },
            where: { isActive: true, store: platform },
        };

        const products = await this.iapProductRepository.find(findOptions);

        const formattedProducts = this.formatProducts(products);

        return formattedProducts;
    }
}
