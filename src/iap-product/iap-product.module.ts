import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GptIapProduct } from './entity/gpt-iap-product.entity';
import { IapProductService } from './iap-product.service';

@Module({
    imports: [TypeOrmModule.forFeature([GptIapProduct])],
    providers: [IapProductService],
    exports: [IapProductService],
})
export class IapProductModule {}
