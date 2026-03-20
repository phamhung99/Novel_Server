import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Chapter } from './chapter.entity';
import { Story } from './story.entity';

@Index('idx_chapter_views_viewedat_storyid', ['viewedAt', 'story'])
@Entity('chapter_views')
export class ChapterViews {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Chapter, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'chapter_id' })
    chapter: Chapter;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @ManyToOne(() => Story, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'story_id' })
    story: Story;

    @Column({
        name: 'viewed_at',
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    viewedAt: Date;
}
