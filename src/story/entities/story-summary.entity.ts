import {
    Entity,
    Column,
    OneToOne,
    JoinColumn,
    UpdateDateColumn,
    PrimaryColumn,
} from 'typeorm';
import { Story } from './story.entity';

@Entity('story_summary')
export class StorySummary {
    @PrimaryColumn({ name: 'story_id', type: 'uuid' })
    storyId: string;

    @OneToOne(() => Story, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'story_id' })
    story: Story;

    @Column({ name: 'likes_count', type: 'int', default: 0 })
    likesCount: number;

    @Column({ name: 'views_count', type: 'int', default: 0 })
    viewsCount: number;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
