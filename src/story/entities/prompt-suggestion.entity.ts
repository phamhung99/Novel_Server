import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { Category } from './categories.entity';

@Entity('prompt_suggestions')
export class PromptSuggestion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'category_id', nullable: false })
    categoryId: string;

    @ManyToOne(() => Category, { nullable: false })
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @Column({ type: 'text', nullable: false })
    prompt: string;

    @Column({ type: 'int', default: 0, name: 'display_order' })
    displayOrder: number;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;
}
