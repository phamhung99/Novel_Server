import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class UserNotificationService {
    private readonly logger = new Logger(UserNotificationService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) {}

    async getFcmTokensForDailyCheckIn(): Promise<
        Array<{ userId: string; fcmToken: string }>
    > {
        const rows = await this.userRepo
            .createQueryBuilder('u')
            .select(['u.id AS "userId"', 'u.fcm_token AS "fcmToken"'])
            .where('u.deletedAt IS NULL')
            .andWhere('u.fcm_token IS NOT NULL')
            .andWhere("TRIM(u.fcm_token) <> ''")
            .getRawMany<{ userId: string; fcmToken: string }>();

        const result = rows
            .map((row) => ({
                userId: row.userId,
                fcmToken: (row.fcmToken || '').trim(),
            }))
            .filter(
                (item): item is { userId: string; fcmToken: string } =>
                    item.userId && item.fcmToken.length > 0,
            );

        this.logger.log(
            `Loaded ${result.length} valid (userId + fcmToken) pairs for daily check-in reminder`,
        );

        return result;
    }
}
