// import { Controller, Get } from '@nestjs/common';
// import { CronService } from './cron.service';

// @Controller('cron')
// export class CronController {
//     constructor(private readonly cronService: CronService) {}

//     @Get('update-summaries')
//     async updateAllSummaries() {
//         try {
//             await this.cronService.updateStorySummary();
//             return {
//                 success: true,
//                 message: 'All story summaries updated successfully',
//             };
//         } catch (error) {
//             return {
//                 success: false,
//                 message: 'Failed to update story summaries',
//                 error: error.message,
//             };
//         }
//     }
// }
