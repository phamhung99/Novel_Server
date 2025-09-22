import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionCode } from './entity/promotion-code.entity';
import { PromotionCodeService } from './promotion-code.service';

@Module({
    imports: [TypeOrmModule.forFeature([PromotionCode])],
    providers: [PromotionCodeService],
    exports: [PromotionCodeService],
})
export class PromotionCodeModule {}
