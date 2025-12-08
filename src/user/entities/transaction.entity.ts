import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { IapStore } from 'src/common/enums/app.enum';

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'order_id', unique: true })
    orderId: string;

    @Column()
    store: IapStore;

    @Column({ name: 'store_product_id' })
    storeProductId: string;

    @Column({ name: 'base_plan_id', nullable: true })
    basePlanId: string;

    @Column({ name: 'purchase_token' })
    purchaseToken: string;

    @Column({ name: 'purchase_time', type: 'timestamptz' })
    purchaseTime: Date;

    @Column({ name: 'expiry_time', type: 'timestamptz', nullable: true })
    expiryTime: Date | null;

    @Column({ default: 1 })
    quantity: number;

    @Column({ name: 'amount_paid', type: 'float', nullable: true })
    amountPaid: number | null;

    @Column({ nullable: true, length: 8 })
    currency: string | null;

    @Column()
    status: string;

    @Column({ name: 'subscription_state', nullable: true })
    subscriptionState: string | null;

    @Column({ name: 'store_payload', type: 'jsonb' })
    storePayload: any;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
