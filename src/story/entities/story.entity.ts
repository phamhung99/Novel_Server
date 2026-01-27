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
import { StoryVisibility } from 'src/common/enums/story-visibility.enum';
import { StorySource } from 'src/common/enums/app.enum';
import { StoryLikes } from './story-likes.entity';
import { UserAudioPreference } from './user-audio-preference.entity';
import { StoryCategory } from './story-category.entity';

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

    @Column({ name: 'cover_image', nullable: true })
    coverImage: string;

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
        default: StoryStatus.DRAFT,
    })
    status: StoryStatus;

    @Column({
        type: 'enum',
        enum: StoryVisibility,
        default: StoryVisibility.PRIVATE,
    })
    visibility: StoryVisibility;

    @Column({
        type: 'enum',
        name: 'source_type',
        enum: StorySource,
        default: StorySource.AI,
    })
    sourceType: StorySource;

    @Column({ type: 'boolean', default: true, name: 'is_fully_free' })
    isFullyFree: boolean;

    @Column({ type: 'int', default: 0, name: 'free_chapters_count' })
    freeChaptersCount: number;

    @Column({ name: 'approved_by', nullable: true })
    approvedBy: string;

    @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
    approvedAt: Date;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason: string;

    @Column({ name: 'likes_count', type: 'int', default: 0 })
    likesCount: number;

    @Column({ name: 'views_count', type: 'int', default: 0 })
    viewsCount: number;

    @Column({
        type: 'decimal',
        precision: 8,
        scale: 3,
        default: 0,
        name: 'trending_score',
    })
    trendingScore: number;

    @Column({
        type: 'decimal',
        precision: 8,
        scale: 3,
        default: 0,
        name: 'search_score',
    })
    searchScore: number;

    @Column({
        type: 'text',
        array: true,
        default: '{}',
        nullable: false,
    })
    tags: string[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
    deletedAt: Date;

    @OneToMany(() => Chapter, (chapter) => chapter.story)
    chapters: Chapter[];

    @OneToOne(() => StoryGeneration, { nullable: true })
    @JoinColumn({ name: 'generation_id' })
    generation?: StoryGeneration;

    @OneToMany(() => StoryLikes, (storyLikes) => storyLikes.story)
    likes: StoryLikes[];

    @OneToMany(
        () => UserAudioPreference,
        (audioPreference) => audioPreference.story,
    )
    audioPreferences: UserAudioPreference[];

    @OneToMany(() => StoryCategory, (storyCategory) => storyCategory.story)
    storyCategories: StoryCategory[];
}
