import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Story } from './story.entity';
import { ChapterGeneration } from './chapter-generation.entity';
import { ChapterState } from './chapter-states.entity';
import { ChapterAudio } from './chapter-audio.entity';

@Entity('chapter')
export class Chapter {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'story_id' })
    storyId: string;

    @ManyToOne(() => Story, (story) => story.chapters, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'story_id' })
    story: Story;

    @OneToMany(
        () => ChapterGeneration,
        (chapterGeneration) => chapterGeneration.chapter,
        { onDelete: 'CASCADE' },
    )
    chapterGenerations: ChapterGeneration[];

    @Column({ type: 'int' })
    index: number;

    @Column()
    title: string;

    @Column({ type: 'text' })
    content: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @OneToMany(() => ChapterState, (chapterState) => chapterState.chapter)
    chapterStates: ChapterState[];

    @OneToMany(() => ChapterAudio, (chapterAudio) => chapterAudio.chapter)
    chapterAudios: ChapterAudio[];

    @OneToMany(() => ChapterAudio, (chapterAudio) => chapterAudio.chapter)
    audioPreferences: ChapterAudio[];
}
