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

    async getFcmTokensForDailyCheckIn(): Promise<string[]> {
        const rows = await this.userRepo
            .createQueryBuilder('u')
            .select('DISTINCT u.fcm_token', 'fcmToken')
            .where('u.deletedAt IS NULL')
            .andWhere('u.fcm_token IS NOT NULL')
            .andWhere(`TRIM(u.fcm_token) <> ''`)
            .getRawMany<{ fcmToken: string }>();

        const tokens = rows
            .map((r) => r.fcmToken?.trim())
            .filter((t): t is string => !!t);

        this.logger.log(
            `Loaded ${tokens.length} FCM tokens for daily check-in reminder`,
        );

        return tokens;
    }
}
