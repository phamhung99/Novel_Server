import { User } from 'src/user/entities/user.entity';
import {
    Entity,
    Column,
    PrimaryColumn,
    UpdateDateColumn,
    JoinColumn,
    OneToOne,
} from 'typeorm';

@Entity('user_notification_settings')
export class UserNotificationSettings {
    @PrimaryColumn({ name: 'user_id', type: 'varchar' })
    userId: string;

    @Column({ name: 'is_enabled', type: 'boolean', default: true })
    isEnabled: boolean;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
        default: () => 'now()',
    })
    updatedAt: Date;

    @OneToOne(() => User, (user) => user.notificationSettings, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
