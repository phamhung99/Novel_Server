import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Chapter } from './chapter.entity';

@Entity('chapter_audio')
export class ChapterAudio {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'chapter_id', type: 'uuid' })
    chapterId: string;

    @ManyToOne(() => Chapter, (chapter) => chapter.chapterAudios, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'chapter_id' })
    chapter: Chapter;

    @Column()
    voice: string;

    @Column({ name: 'audio_url' })
    audioUrl: string;

    @Column()
    duration: number;

    @Column()
    format: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
