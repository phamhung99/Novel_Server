import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserNotificationThrottling } from './entities/user-notification-throttling.entity';
import { UserNotificationSettings } from './entities/user-notification-settings.entity';

@Module({
    providers: [NotificationService],
    imports: [
        FirebaseModule,
        TypeOrmModule.forFeature([
            UserNotificationThrottling,
            UserNotificationSettings,
        ]),
    ],
    exports: [NotificationService],
})
export class NotificationModule {}
