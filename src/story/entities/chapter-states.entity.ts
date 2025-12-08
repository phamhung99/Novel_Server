import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Chapter } from './chapter.entity';

@Entity('chapter_states')
export class ChapterState {
    @PrimaryColumn({ name: 'user_id', type: 'varchar' })
    userId: string;

    @PrimaryColumn({ name: 'chapter_id', type: 'uuid' })
    chapterId: string;

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
