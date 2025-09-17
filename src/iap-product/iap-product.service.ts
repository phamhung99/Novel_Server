import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GptIapProduct } from './entity/gpt-iap-product.entity';

@Injectable()
export class IapProductService {
    constructor(
        @InjectRepository(GptIapProduct)
        private readonly iapProductRepository: Repository<GptIapProduct>,
    ) {}

    async getSubProducts(): Promise<GptIapProduct[]> {
        return this.iapProductRepository.find({
            where: { type: 'SUB' },
        });
    }
}
