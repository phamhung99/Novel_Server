import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('promotion_codes')
export class PromotionCode {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'promotion_code' })
    promotionCode: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
