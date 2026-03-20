import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { AppNotificationType } from 'src/common/enums/app.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { UserNotificationThrottling } from './entities/user-notification-throttling.entity';
import { Repository, In } from 'typeorm';
import { getCurrentDateString } from 'src/common/utils/date.utils';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    private readonly MAX_NOTIFICATIONS_PER_DAY = 5;
    private readonly NOTIFICATION_COOLDOWN_MINUTES = 120; // minutes

    constructor(
        private readonly firebaseService: FirebaseService,

        @InjectRepository(UserNotificationThrottling)
        private readonly throttlingRepository: Repository<UserNotificationThrottling>,
    ) {}

    // ────────────────────────────────────────────────
    // Helper: Kiểm tra & cập nhật throttling cho 1 user
    // ────────────────────────────────────────────────
    private async canSendNotification(userId: string): Promise<boolean> {
        const today = getCurrentDateString(); // YYYY-MM-DD

        let record = await this.throttlingRepository.findOne({
            where: { userId, currentDate: today },
        });

        if (!record) {
            record = this.throttlingRepository.create({
                userId,
                currentDate: today,
                sentTodayCount: 0,
                lastSentAt: null,
            });
            await this.throttlingRepository.save(record);
            return true;
        }

        const now = new Date();

        // 1. Đã gửi quá giới hạn trong ngày
        if (record.sentTodayCount >= this.MAX_NOTIFICATIONS_PER_DAY) {
            this.logger.debug(
                `User ${userId} reached daily limit (${record.sentTodayCount}/${this.MAX_NOTIFICATIONS_PER_DAY})`,
            );
            return false;
        }

        // 2. Chưa đủ cooldown
        if (record.lastSentAt) {
            const minutesDiff =
                (now.getTime() - record.lastSentAt.getTime()) / 1000 / 60;
            if (minutesDiff < this.NOTIFICATION_COOLDOWN_MINUTES) {
                this.logger.debug(
                    `User ${userId} is on cooldown (last sent ${minutesDiff.toFixed(1)} min ago)`,
                );
                return false;
            }
        }

        return true;
    }

    private async updateThrottlingAfterSend(userId: string): Promise<void> {
        const today = getCurrentDateString(); // YYYY-MM-DD

        let throttling = await this.throttlingRepository.findOne({
            where: { userId },
        });

        if (throttling) {
            // currentDate is string -> compare as string
            if (throttling.currentDate !== today) {
                throttling.currentDate = today; // string
                throttling.sentTodayCount = 0;
            }

            this.logger.debug(
                `throttling.currentDate: ${throttling.currentDate}, today: ${today}, sentTodayCount: ${throttling.sentTodayCount}`,
            );
            throttling.lastSentAt = new Date();
            throttling.sentTodayCount += 1;

            await this.throttlingRepository.save(throttling);
        } else {
            throttling = this.throttlingRepository.create({
                userId,
                currentDate: today, // string
                lastSentAt: new Date(),
                sentTodayCount: 1,
            });

            await this.throttlingRepository.save(throttling);
        }
    }

    // ────────────────────────────────────────────────
    // Gửi cho 1 device (thường gắn với 1 user)
    // ────────────────────────────────────────────────
    async sendToSingleWithThrottle(
        userId: string,
        fcmToken: string,
        title: string,
        body: string,
        data: Record<string, string> = {},
    ): Promise<{ sent: boolean; reason?: string }> {
        const canSend = await this.canSendNotification(userId);

        if (!canSend) {
            return { sent: false, reason: 'throttled' };
        }

        try {
            await this.firebaseService.sendToSingle(
                fcmToken,
                title,
                body,
                data,
            );
            await this.updateThrottlingAfterSend(userId);
            return { sent: true };
        } catch (err) {
            this.logger.error(
                `Failed to send notification to user ${userId}`,
                err,
            );
            return { sent: false, reason: 'firebase_error' };
        }
    }

    // ────────────────────────────────────────────────
    // Gửi cho nhiều device (có thể nhiều user)
    // ────────────────────────────────────────────────
    async sendToMultipleWithThrottle(
        items: Array<{
            userId: string;
            fcmToken: string;
        }>,
        title: string,
        body: string,
        data: Record<string, string> = {},
    ): Promise<{
        successCount: number;
        throttledCount: number;
        failedCount: number;
    }> {
        if (items.length === 0) {
            return { successCount: 0, throttledCount: 0, failedCount: 0 };
        }

        const userIds = [...new Set(items.map((i) => i.userId))];
        const today = getCurrentDateString();

        // Lấy tất cả record throttling của các user liên quan trong ngày hôm nay
        const throttlingRecords = await this.throttlingRepository.find({
            where: {
                userId: In(userIds),
                currentDate: today,
            },
        });

        const throttlingMap = new Map<string, UserNotificationThrottling>();
        throttlingRecords.forEach((r) => throttlingMap.set(r.userId, r));

        const now = new Date();
        const allowedTokens: string[] = [];
        const throttledUsers = new Set<string>();

        for (const item of items) {
            const { userId, fcmToken } = item;

            const record = throttlingMap.get(userId);

            // Nếu chưa có record hôm nay → cho phép
            if (!record) {
                allowedTokens.push(fcmToken);
                continue;
            }

            // Đã vượt giới hạn ngày
            if (record.sentTodayCount >= this.MAX_NOTIFICATIONS_PER_DAY) {
                throttledUsers.add(userId);
                continue;
            }

            // Kiểm tra cooldown
            if (record.lastSentAt) {
                const diffMin =
                    (now.getTime() - record.lastSentAt.getTime()) / 1000 / 60;
                if (diffMin < this.NOTIFICATION_COOLDOWN_MINUTES) {
                    throttledUsers.add(userId);
                    continue;
                }
            }

            allowedTokens.push(fcmToken);
        }

        // Gửi hàng loạt cho các token được phép
        let successCount = 0;
        let failedCount = 0;

        if (allowedTokens.length > 0) {
            try {
                const result = await this.firebaseService.sendToMultiple(
                    allowedTokens,
                    title,
                    body,
                    data,
                );
                successCount = result.successCount;
                failedCount = result.failureCount;
            } catch (err) {
                this.logger.error('Bulk send failed', err);
                failedCount += allowedTokens.length;
            }
        }

        // Cập nhật throttling cho những user đã thực sự nhận được noti
        // (ở đây đơn giản hóa: update tất cả user có token được gửi)
        // Nếu muốn chính xác hơn → cần map lại token → user và chỉ update user thành công
        const sentUserIds = new Set(
            items
                .filter((i) => allowedTokens.includes(i.fcmToken))
                .map((i) => i.userId),
        );

        await Promise.all(
            [...sentUserIds].map((userId) =>
                this.updateThrottlingAfterSend(userId),
            ),
        );

        return {
            successCount,
            throttledCount: throttledUsers.size,
            failedCount,
        };
    }

    async sendDailyCheckInGiftReminder(
        userDevicePairs: Array<{ userId: string; fcmToken: string }>,
    ): Promise<{
        successCount: number;
        throttledCount: number;
        failedCount: number;
    }> {
        const title = 'Daily Gift 🎁';
        const body = `Claim your free coins now! Don't let them expire.`;
        const dataPayload: Record<string, string> = {
            type: AppNotificationType.CHECK_IN,
            action: 'claim_gift',
            screen: 'Rewards',
        };

        this.logger.log(
            `Sending daily check-in reminder to ${userDevicePairs.length} devices`,
        );

        const result = await this.sendToMultipleWithThrottle(
            userDevicePairs,
            title,
            body,
            dataPayload,
        );

        this.logger.log(
            `Daily check-in result → success: ${result.successCount}, throttled: ${result.throttledCount}, failed: ${result.failedCount}`,
        );

        return result;
    }
}
