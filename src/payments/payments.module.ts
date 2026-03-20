import { forwardRef, Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { IapProduct } from './entities/iap-product.entity';
import { UserModule } from 'src/user/user.module';
import { GooglePlayService } from 'src/google-play/google-play.service';
import { IapProductService } from './iap-product.service';
import { AppStoreService } from 'src/app-store/app-store.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
    controllers: [PaymentsController],
    imports: [
        TypeOrmModule.forFeature([Transaction, IapProduct]),
        forwardRef(() => UserModule),
        JwtModule.register({}),
    ],
    providers: [
        PaymentsService,
        GooglePlayService,
        IapProductService,
        AppStoreService,
    ],
    exports: [IapProductService],
})
export class PaymentsModule {}
