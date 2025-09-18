import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('gpt_iap_product')
export class GptIapProduct {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'store_product_id', nullable: true })
    storeProductId?: string;

    @Column({ nullable: true })
    description?: string;

    @Column({ name: 'period_type', nullable: true })
    periodType?: string;

    @Column({ name: 'period_number', type: 'int', nullable: true })
    periodNumber?: number;

    @Column({ name: 'generation_number', type: 'int', nullable: true })
    generationNumber?: number;

    @Column({ type: 'float', nullable: true })
    price?: number;

    @Column({ nullable: true })
    type?: string;

    @Column({ name: 'image_url', nullable: true })
    imageUrl?: string;

    @Column({ name: 'display_order', type: 'int', nullable: true })
    displayOrder?: number;

    @Column({ type: 'boolean', nullable: true })
    selling?: boolean;

    @Column({ name: 'package_name', nullable: true })
    packageName?: string;

    @Column({ name: 'country_tier', type: 'int', nullable: true })
    countryTier?: number;

    @Column({ type: 'int', nullable: true })
    version?: number;

    @CreateDateColumn({ name: 'created_at', nullable: true })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', nullable: true })
    updatedAt: Date;
}
