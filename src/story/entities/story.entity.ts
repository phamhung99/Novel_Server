import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    OneToOne,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { StoryType } from '../../common/enums/story-type.enum';
import { StoryStatus } from '../../common/enums/story-status.enum';
import { Chapter } from './chapter.entity';
import { StoryGeneration } from './story-generation.entity';

@Entity('story')
export class Story {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'author_id' })
    authorId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'author_id' })
    author: User;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    synopsis: string;

    @Column({
        type: 'enum',
        enum: StoryType,
        default: StoryType.NOVEL,
    })
    type: StoryType;

    @Column({ type: 'simple-array', nullable: true })
    genres: string[];

    @Column({ name: 'cover_image', nullable: true })
    coverImage: string;

    @Column({ type: 'int', default: 0 })
    views: number;

    @Column({
        type: 'decimal',
        precision: 3,
        scale: 2,
        default: 0,
        nullable: true,
    })
    rating: number;

    @Column({
        type: 'enum',
        enum: StoryStatus,
        default: StoryStatus.PRIVATE,
    })
    status: StoryStatus;

    @Column({ name: 'is_public', default: false })
    isPublic: boolean;

    @Column({ name: 'approved_by', nullable: true })
    approvedBy: string;

    @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
    approvedAt: Date;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date;

    @OneToMany(() => Chapter, (chapter) => chapter.story)
    chapters: Chapter[];

    @OneToOne(() => StoryGeneration, { nullable: true })
    @JoinColumn({ name: 'generation_id' })
    generation?: StoryGeneration;
}
