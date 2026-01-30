import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { IapProduct } from './entities/iap-product.entity';
import { UserModule } from 'src/user/user.module';
import { GooglePlayService } from 'src/google-play/google-play.service';
import { IapProductService } from './iap-product.service';

@Module({
    controllers: [PaymentsController],
    imports: [TypeOrmModule.forFeature([Transaction, IapProduct]), UserModule],
    providers: [PaymentsService, GooglePlayService, IapProductService],
})
export class PaymentsModule {}
