import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { StoryGeneration } from './story-generation.entity';
import { Chapter } from './chapter.entity';

@Entity('chapter_generation')
export class ChapterGeneration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'story_generation_id' })
    storyGenerationId: string;

    @ManyToOne(() => StoryGeneration, (storyGen) => storyGen.chapterGenerations, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'story_generation_id' })
    storyGeneration: StoryGeneration;

    @Column({ name: 'chapter_id', nullable: true })
    chapterId: string;

    @ManyToOne(() => Chapter, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'chapter_id' })
    chapter: Chapter;

    @Column({ type: 'int' })
    chapterNumber: number;

    @Column({ type: 'text', nullable: true })
    prompt: string;

    @Column({ type: 'text', nullable: true })
    generatedContent: string;

    @Column({ type: 'jsonb', nullable: true })
    structure: Record<string, any>; // Parsed chapter structure

    @Column({ type: 'int', nullable: true })
    tokensUsed: number;

    @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
    costUsd: number;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
