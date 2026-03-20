import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { UserModule } from 'src/user/user.module';

@Module({
    controllers: [DashboardController],
    providers: [DashboardService],
    imports: [UserModule],
})
export class DashboardModule {}
