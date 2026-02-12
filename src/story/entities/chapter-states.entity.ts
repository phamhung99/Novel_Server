import {
    Entity,
    PrimaryColumn,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Chapter } from './chapter.entity';

@Entity('chapter_states')
export class ChapterState {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @PrimaryColumn({ name: 'user_id', type: 'varchar' })
    userId: string;

    @PrimaryColumn({ name: 'chapter_id', type: 'uuid' })
    chapterId: string;

    @CreateDateColumn({ name: 'unlocked_at', type: 'timestamptz' })
    unlockedAt: Date;

    @ManyToOne(() => User, (user) => user.chapterStates, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Chapter, (chapter) => chapter.chapterStates, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'chapter_id' })
    chapter: Chapter;
}
