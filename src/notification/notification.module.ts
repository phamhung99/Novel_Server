import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { FirebaseModule } from 'src/firebase/firebase.module';

@Module({
    providers: [NotificationService],
    imports: [FirebaseModule],
    exports: [NotificationService],
})
export class NotificationModule {}
