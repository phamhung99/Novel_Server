import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { ChapterGeneration } from './chapter-generation.entity';
import { GenerationStatus } from 'src/common/enums/app.enum';

export enum GenerationType {
    CHAPTER = 'chapter',
}

@Entity('story_generation')
export class StoryGeneration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'story_id', nullable: true })
    storyId: string;

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

    @Column({ type: 'text', nullable: true })
    response: string | null;

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

    @Column({ nullable: true })
    title?: string;

    @Column({ type: 'text', nullable: true })
    synopsis?: string;

    @Column({ name: 'prompt_version', type: 'int', default: 1 })
    promptVersion: number;

    @Column({ name: 'request_id', nullable: true, unique: true })
    requestId: string;

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
