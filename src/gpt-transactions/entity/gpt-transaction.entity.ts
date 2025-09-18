import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('gpt_transactions')
export class GptTransaction {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ name: 'order_id' })
    orderId: string;

    @Column({ name: 'product_id' })
    productId: string;

    @Column({ name: 'purchase_time', type: 'bigint', nullable: true })
    purchaseTime: number;

    @Column({ name: 'purchase_token', unique: true })
    purchaseToken: string;

    @Column({ name: 'quantity', type: 'int', default: 1 })
    quantity: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}
