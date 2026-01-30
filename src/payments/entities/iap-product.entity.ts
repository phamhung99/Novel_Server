import { IapPeriod, IapProductType, IapStore } from 'src/common/enums/app.enum';

import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('iap_product')
export class IapProduct {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: IapStore,
        nullable: false,
    })
    store: IapStore;

    @Column({ name: 'store_product_id', nullable: false })
    storeProductId: string;

    @Column({ name: 'base_plan_id', nullable: true })
    basePlanId: string;

    @Column({
        type: 'enum',
        enum: IapProductType,
        nullable: false,
    })
    type: IapProductType;

    @Column({ nullable: false })
    title: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'float', nullable: false })
    price: number;

    @Column({ type: 'float', name: 'original_price', nullable: true })
    originalPrice: number;

    @Column({ type: 'int', name: 'discount_percentage', nullable: true })
    discountPercentage: number;

    @Column({ type: 'boolean', name: 'is_popular', default: false })
    isPopular: boolean;

    @Column({ type: 'int', name: 'period_number', nullable: true })
    periodNumber: number;

    @Column({ type: 'int', name: 'base_coins', nullable: true })
    baseCoins: number;

    @Column({ type: 'int', name: 'bonus_percentage', nullable: true })
    bonusPercentage: number;

    @Column({
        name: 'period',
        type: 'enum',
        enum: IapPeriod,
        nullable: true,
    })
    period: IapPeriod;

    @Column({ name: 'image_url', nullable: true })
    imageUrl: string;

    @Column({ type: 'int', name: 'display_order', nullable: true })
    displayOrder: number;

    @Column({ type: 'jsonb', nullable: true })
    benefits: any;

    @Column({ type: 'boolean', name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
