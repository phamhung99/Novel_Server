import { User } from 'src/user/entities/user.entity';
import {
    Entity,
    Column,
    PrimaryColumn,
    UpdateDateColumn,
    JoinColumn,
    OneToOne,
} from 'typeorm';

@Entity('user_notification_throttling')
export class UserNotificationThrottling {
    @PrimaryColumn({ name: 'user_id', type: 'varchar' })
    userId: string;

    @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true })
    lastSentAt: Date;

    @Column({ name: 'sent_today_count', type: 'int', default: 0 })
    sentTodayCount: number;

    @Column({
        name: 'current_date',
        type: 'date',
        default: () => 'CURRENT_DATE',
    })
    currentDate: string;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
        default: () => 'now()',
    })
    updatedAt: Date;

    @OneToOne(() => User, (user) => user.notificationThrottling, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
