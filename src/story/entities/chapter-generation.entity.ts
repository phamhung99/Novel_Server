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

    @Column({ name: 'story_generation_id', nullable: true })
    storyGenerationId: string;

    @ManyToOne(
        () => StoryGeneration,
        (storyGen) => storyGen.chapterGenerations,
        {
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'story_generation_id' })
    storyGeneration: StoryGeneration;

    @Column({ name: 'chapter_id', nullable: true })
    chapterId: string;

    @ManyToOne(() => Chapter, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'chapter_id' })
    chapter: Chapter;

    @Column({ name: 'chapter_number', type: 'int' })
    chapterNumber: number;

    @Column({ name: 'prompt', type: 'text', nullable: true })
    prompt: string;

    @Column({ name: 'generated_content', type: 'text', nullable: true })
    generatedContent: string;

    @Column({ name: 'structure', type: 'jsonb', nullable: true })
    structure: Record<string, any>;

    @Column({ name: 'tokens_used', type: 'int', nullable: true })
    tokensUsed: number;

    @Column({
        name: 'cost_usd',
        type: 'decimal',
        precision: 10,
        scale: 4,
        nullable: true,
    })
    costUsd: number;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @Column({ name: 'request_id', nullable: true })
    requestId: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
