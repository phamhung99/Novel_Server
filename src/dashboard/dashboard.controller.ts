import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('stats')
    async getDashboardStats() {
        const [userCount, subscriptions] = await Promise.all([
            this.dashboardService.countNewUsersIn24h(),
            this.dashboardService.getSubscriptionsWithProductIn24h(),
        ]);
        return {
            newUsersIn24h: userCount,
            getSubscriptionsWithProductIn24h: subscriptions,
        };
    }
}
