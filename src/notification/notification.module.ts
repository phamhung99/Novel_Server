import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserNotificationThrottling } from './entities/user-notification-throttling.entity';

@Module({
    providers: [NotificationService],
    imports: [
        FirebaseModule,
        TypeOrmModule.forFeature([UserNotificationThrottling]),
    ],
    exports: [NotificationService],
})
export class NotificationModule {}
