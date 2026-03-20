import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from './user.entity';

export enum ReportEntityType {
    STORY = 'story',
}

export enum ReportReason {
    COPYRIGHT_VIOLATION = 'copyright_violation',
    INAPPROPRIATE_CONTENT = 'inappropriate_content',
    GRAMMAR_ISSUES = 'grammar_issues',
    MISSING_CHAPTERS = 'missing_chapters',
    DUPLICATE_CHAPTERS = 'duplicate_chapters',
    POOR_QUALITY = 'poor_quality',
    OTHER = 'other',
}

@Entity('reports')
export class Report {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', name: 'reporter_id' })
    @Index()
    reporterId: string;

    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reporter_id' })
    reporter: User;

    @Column({
        type: 'enum',
        enum: ReportEntityType,
        default: ReportEntityType.STORY,
    })
    entityType: ReportEntityType;

    @Column({ type: 'varchar', nullable: true })
    entityId: string | null;

    @Column({
        type: 'enum',
        enum: ReportReason,
    })
    @Index()
    reason: ReportReason;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
