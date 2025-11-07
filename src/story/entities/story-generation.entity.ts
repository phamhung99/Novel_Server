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

export enum GenerationType {
    CHAPTER = 'chapter',
}

export enum GenerationStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@Entity('story_generation')
export class StoryGeneration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'story_id' })
    storyId: string;

    @ManyToOne(() => Story, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'story_id' })
    story: Story;

    @Column({
        type: 'enum',
        enum: GenerationType,
    })
    type: GenerationType;

    @Column({
        type: 'enum',
        enum: GenerationStatus,
        default: GenerationStatus.PENDING,
    })
    status: GenerationStatus;

    @Column({ name: 'ai_provider' })
    aiProvider: string; // 'gpt' or 'grok'

    @Column({ name: 'ai_model' })
    aiModel: string; // e.g., 'gpt-4o-mini', 'grok-4'

    @Column({ type: 'jsonb' })
    prompt: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    response: Record<string, any>;

    @Column({ type: 'int', nullable: true })
    tokensUsed: number;

    @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
    costUsd: number;

    @Column({ type: 'int' })
    chapterNumber: number; // Chapter number being generated

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>; // Additional metadata

    // Story Attributes - persisted for reuse across chapters
    @Column({ nullable: true })
    title?: string;

    @Column({ type: 'text', nullable: true })
    synopsis?: string;

    @Column({ type: 'simple-array', nullable: true })
    genres?: string[];

    @Column({ nullable: true })
    mainCharacter?: string;

    @Column({ type: 'text', nullable: true })
    subCharacters?: string;

    @Column({ nullable: true })
    setting?: string;

    @Column({ nullable: true })
    plotTheme?: string;

    @Column({ nullable: true })
    writingStyle?: string;

    @Column({ type: 'text', nullable: true })
    additionalContext?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(
        () => ChapterGeneration,
        (chapterGen) => chapterGen.storyGeneration,
    )
    chapterGenerations: ChapterGeneration[];
}
