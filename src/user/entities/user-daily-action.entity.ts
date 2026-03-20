import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { User } from './user.entity';
import { ActionType } from 'src/common/enums/app.enum';

@Entity('user_daily_actions')
export class UserDailyAction {
    @PrimaryColumn({ name: 'user_id', type: 'varchar' })
    userId: string;

    @PrimaryColumn({
        name: 'action_type',
        type: 'enum',
        enum: ActionType,
        enumName: 'action_type_enum',
    })
    actionType: ActionType;

    @PrimaryColumn({ name: 'action_date', type: 'date' })
    actionDate: string;

    @Column({ name: 'count', type: 'int', default: 0 })
    count: number;

    @Column({ name: 'last_action_at', type: 'timestamptz', nullable: true })
    lastActionAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @ManyToOne(() => User, (user) => user.dailyActions, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
