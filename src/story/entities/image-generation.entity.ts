import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

import { GenerationStatus } from 'src/common/enums/app.enum';

@Entity('image_generation')
export class ImageGeneration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'entity_type' })
    entityType: string;

    @Column({ name: 'entity_id', type: 'uuid' })
    entityId: string;

    @Column({ name: 'purpose' })
    purpose: string;

    @Column({
        name: 'status',
        type: 'enum',
        enum: GenerationStatus,
    })
    status: GenerationStatus;

    @Column({ name: 'prompt', type: 'text' })
    prompt: string;

    @Column({ name: 'image_path', nullable: true })
    imagePath: string | null;

    @Column({ name: 'error_message', nullable: true, type: 'text' })
    errorMessage: string | null;

    @Column({ name: 'request_id', nullable: true })
    requestId: string | null;

    @Column({
        name: 'cost_usd',
        type: 'decimal',
        precision: 10,
        scale: 4,
        default: 0,
        nullable: true,
    })
    costUsd: number;

    @Column({ name: 'attempts', default: 0 })
    attempts: number;

    @Column({ name: 'last_attempt_at', type: 'timestamptz', nullable: true })
    lastAttemptAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
