// story-category.entity.ts
import { Entity, Column, ManyToOne, PrimaryColumn, Index, JoinColumn } from 'typeorm';
import { Story } from './story.entity';
import { Category } from './categories.entity';

@Entity('story_categories')
@Index(['storyId', 'categoryId'], { unique: true })
export class StoryCategory {
    @PrimaryColumn('uuid', { name: 'story_id' })
    storyId: string;

    @PrimaryColumn('uuid', { name: 'category_id' })
    categoryId: string;

    @Column({ name: 'is_main_category', type: 'boolean', default: false })
    isMainCategory: boolean;

    @ManyToOne(() => Story, (story) => story.storyCategories, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'story_id' })
    story: Story;

    @ManyToOne(() => Category, (category) => category.storyCategories, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'category_id' })
    category: Category;
}
