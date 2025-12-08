import {
    IapPeriodType,
    IapProductType,
    IapStore,
} from 'src/common/enums/app.enum';
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

    @Column({ name: 'base_plan_id', nullable: false })
    basePlanId: string;

    @Column({
        name: 'period_type',
        type: 'enum',
        enum: IapPeriodType,
        nullable: false,
    })
    periodType: IapPeriodType;

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

    @Column({ type: 'float', name: 'price', nullable: false })
    price: number;

    @Column({ type: 'float', name: 'original_price', nullable: true })
    originalPrice: number;

    @Column({ name: 'discount_percentage', type: 'int', nullable: true })
    discountPercentage: number;

    @Column({ name: 'is_popular', type: 'boolean', default: false })
    isPopular: boolean;

    @Column({ name: 'period_number', type: 'int', nullable: true })
    periodNumber: number;

    @Column({ name: 'generation_number', type: 'int', nullable: true })
    generationNumber: number;

    @Column({ nullable: true })
    period: string;

    @Column({ nullable: true })
    duration: string;

    @Column({ name: 'image_url', nullable: true })
    imageUrl: string;

    @Column({ name: 'display_order', type: 'int', nullable: true })
    displayOrder: number;

    @Column({ type: 'jsonb', nullable: true })
    benefits: any;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
