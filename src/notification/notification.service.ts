import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { AppNotificationType } from 'src/common/enums/app.enum';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(private readonly firebaseService: FirebaseService) {}

    async sendToMultiple(
        deviceTokens: string[],
        title: string,
        body: string,
        data: Record<string, string> = {},
    ) {
        return this.firebaseService.sendToMultiple(
            deviceTokens,
            title,
            body,
            data,
        );
    }

    /**
     * Sends the daily check-in gift reminder notification
     * Usually called by a cron job around reset time (e.g. 00:05 or 08:00)
     */
    async sendDailyCheckInGiftReminder(
        deviceTokens: string[],
    ): Promise<{ successCount: number; failureCount: number }> {
        const title = 'Daily Gift 🎁';
        const body = `Claim your free coins now! Don't let them expire.`;

        const dataPayload: Record<string, string> = {
            type: AppNotificationType.CHECK_IN,
            action: 'claim_gift',
            screen: 'Rewards',
        };

        try {
            this.logger.log(
                `Sending daily check-in reminder to ${deviceTokens.length} devices`,
            );

            const result = await this.sendToMultiple(
                deviceTokens,
                title,
                body,
                dataPayload,
            );

            this.logger.log(
                `Daily check-in notification sent → success: ${result.successCount}, failed: ${result.failureCount}`,
            );

            return {
                successCount: result.successCount,
                failureCount: result.failureCount,
            };
        } catch (error) {
            this.logger.error(
                'Failed to send daily check-in notification',
                error,
            );
            throw error;
        }
    }
}
