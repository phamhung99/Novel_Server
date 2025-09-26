import { forwardRef, Module } from '@nestjs/common';
import { GptTransactionsService } from './gpt-transactions.service';
import { GptTransactionsController } from './gpt-transactions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GptTransaction } from './entity/gpt-transaction.entity';
import { UserModule } from 'src/user/user.module';
import { IapProductModule } from 'src/iap-product/iap-product.module';

@Module({
    controllers: [GptTransactionsController],
    providers: [GptTransactionsService],
    exports: [GptTransactionsService, TypeOrmModule],
    imports: [
        TypeOrmModule.forFeature([GptTransaction]),
        forwardRef(() => UserModule),
        IapProductModule,
    ],
})
export class GptTransactionsModule {}
