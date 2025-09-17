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

    @Column({ name: 'store_product_id' })
    storeProductId: string;

    @Column()
    description: string;

    @Column({ name: 'period_type' })
    periodType: string;

    @Column({ name: 'period_number', type: 'int' })
    periodNumber: number;

    @Column({ name: 'generation_number', type: 'int' })
    generationNumber: number;

    @Column({ type: 'float' })
    price: number;

    @Column()
    type: string;

    @Column({ name: 'image_url' })
    imageUrl: string;

    @Column({ name: 'display_order', type: 'int' })
    displayOrder: number;

    @Column({ type: 'boolean' })
    selling: boolean;

    @Column({ name: 'package_name' })
    packageName: string;

    @Column({ name: 'country_tier', type: 'int' })
    countryTier: number;

    @Column({ type: 'int' })
    version: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
