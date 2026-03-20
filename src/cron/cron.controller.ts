import { Controller, Get } from '@nestjs/common';
import { CronService } from './cron.service';

@Controller('cron')
export class CronController {
    constructor(private readonly cronService: CronService) {}

    @Get('')
    async runAllScheduledTasks() {
        try {
            await this.cronService.runAllScheduledTasks();
            return {
                success: true,
                message: 'All scheduled tasks executed successfully',
            };
        } catch (error) {
            return {
                success: false,
                message: 'Failed to execute all scheduled tasks',
                error: error.message,
            };
        }
    }
}
