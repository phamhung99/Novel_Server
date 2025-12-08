import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { CoinType } from 'src/common/enums/app.enum';

@Entity('user_coins')
export class UserCoins {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: CoinType,
    })
    type: CoinType;

    @Column({ name: 'user_id', type: 'varchar' })
    userId: string;

    @Column({ type: 'int' })
    amount: number;

    @Column({ type: 'int' })
    remaining: number;

    @Column()
    source: string;

    @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
    expiresAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
