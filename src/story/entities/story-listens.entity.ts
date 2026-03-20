import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Story } from './story.entity';
import { Chapter } from './chapter.entity';

@Entity('story_listens')
export class StoryListens {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'varchar', nullable: true })
    userId: string | null;

    @Column({ name: 'story_id', type: 'uuid' })
    storyId: string;

    @Column({ name: 'chapter_id', type: 'uuid' })
    chapterId: string;

    @Column()
    voice: string;

    @Column({
        name: 'listened_at',
        type: 'timestamptz',
        default: () => 'now()',
    })
    listenedAt: Date;

    @Column({
        name: 'progress_percent',
        type: 'decimal',
        precision: 5,
        scale: 2,
    })
    progressPercent: string;

    // Relations
    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @ManyToOne(() => Story, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'story_id' })
    story: Story;

    @ManyToOne(() => Chapter, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'chapter_id' })
    chapter: Chapter;
}
