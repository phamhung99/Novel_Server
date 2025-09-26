import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { GptTransactionsModule } from 'src/gpt-transactions/gpt-transactions.module';
import { IapProductModule } from 'src/iap-product/iap-product.module';
import { UserModule } from 'src/user/user.module';

@Module({
    controllers: [DashboardController],
    providers: [DashboardService],
    imports: [GptTransactionsModule, IapProductModule, UserModule],
})
export class DashboardModule {}
