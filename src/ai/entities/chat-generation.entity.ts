import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export enum ChatGenerationStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@Entity('chat_generation')
export class ChatGeneration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', name: 'request_id', nullable: true })
    @Index()
    requestId: string | null;

    @Column({ type: 'text', nullable: false })
    prompt: string;

    @Column({
        type: 'enum',
        enum: ChatGenerationStatus,
        default: ChatGenerationStatus.PENDING,
    })
    status: ChatGenerationStatus;

    @Column({ type: 'text', nullable: true })
    response: string | null;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;
}
