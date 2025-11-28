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

    @Column({ name: 'story_id', nullable: true })
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
    aiProvider: string;

    @Column({ name: 'ai_model' })
    aiModel: string;

    @Column({ type: 'jsonb' })
    prompt: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    response: Record<string, any>;

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

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    // Story Attributes
    @Column({ nullable: true })
    title?: string;

    @Column({ type: 'text', nullable: true })
    synopsis?: string;

    @Column({ type: 'simple-array', nullable: true })
    genres?: string[];

    @Column({ nullable: true })
    setting?: string;

    @Column({ name: 'main_character', nullable: true })
    mainCharacter?: string;

    @Column({ name: 'sub_characters', type: 'text', nullable: true })
    subCharacters?: string;

    @Column({ nullable: true })
    antagonist?: string;

    @Column({ nullable: true })
    motif?: string;

    @Column({ nullable: true })
    tone?: string;

    @Column({ name: 'writing_style', nullable: true })
    writingStyle?: string;

    @Column({ name: 'plot_logic', nullable: true })
    plotLogic?: string;

    @Column({ name: 'hidden_theme', type: 'text', nullable: true })
    hiddenTheme?: string;

    @Column({ name: 'prompt_version', type: 'int', default: 1 })
    promptVersion: number;

    @Column({ name: 'request_id', nullable: true })
    requestId: string;

    // removed in future versions
    @Column({ name: 'plot_theme', type: 'text', nullable: true })
    plotTheme?: string;

    // removed in future versions
    @Column({ name: 'additional_context', type: 'text', nullable: true })
    additionalContext?: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @OneToMany(
        () => ChapterGeneration,
        (chapterGen) => chapterGen.storyGeneration,
    )
    chapterGenerations: ChapterGeneration[];
}
