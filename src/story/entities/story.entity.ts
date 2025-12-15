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
    ManyToMany,
    JoinTable,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { StoryType } from '../../common/enums/story-type.enum';
import { StoryStatus } from '../../common/enums/story-status.enum';
import { Chapter } from './chapter.entity';
import { StoryGeneration } from './story-generation.entity';
import { StoryVisibility } from 'src/common/enums/story-visibility.enum';
import { StorySource } from 'src/common/enums/app.enum';
import { StoryLikes } from './story-likes.entity';
import { StoryViews } from './story-views.entity';
import { UserAudioPreference } from './user-audio-preference.entity';
import { Category } from './categories.entity';

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
        enum: StorySource,
        default: StorySource.AI,
    })
    sourceType: StorySource;

    @Column({ name: 'approved_by', nullable: true })
    approvedBy: string;

    @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
    approvedAt: Date;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason: string;

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

    @OneToMany(() => StoryViews, (storyViews) => storyViews.story)
    views: StoryViews[];

    @OneToMany(
        () => UserAudioPreference,
        (audioPreference) => audioPreference.story,
    )
    audioPreferences: UserAudioPreference[];

    @ManyToMany(() => Category, (category) => category.stories)
    @JoinTable({
        name: 'story_categories',
        joinColumn: { name: 'story_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
    })
    categories: Category[];
}
