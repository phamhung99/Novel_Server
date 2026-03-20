import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { CoinTransactionType } from 'src/common/enums/app.enum';

@Entity('coin_transactions')
@Index(['userId', 'createdAt'])
export class CoinTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'varchar' })
    userId: string;

    @Column({
        name: 'type',
        type: 'enum',
        enum: CoinTransactionType,
        nullable: false,
    })
    type: CoinTransactionType;

    @Column({ name: 'amount', type: 'integer', nullable: false })
    amount: number;

    @Column({ name: 'balance_after', type: 'integer', nullable: false })
    balanceAfter: number;

    @Column({ name: 'reference_type', type: 'varchar', nullable: true })
    referenceType?: string;

    @Column({ name: 'reference_id', type: 'uuid', nullable: true })
    referenceId?: string;

    @Column({ name: 'description', type: 'text', nullable: true })
    description?: string;

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date;

    @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
    expiresAt: Date | null;

    @ManyToOne(() => User, (user) => user.coinTransactions, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
