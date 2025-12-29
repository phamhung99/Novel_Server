import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Chapter } from './chapter.entity';

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

    @Column({
        name: 'viewed_at',
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    viewedAt: Date;
}
