import { ChapterState } from 'src/story/entities/chapter-states.entity';
import { StoryLikes } from 'src/story/entities/story-likes.entity';
import { StoryViews } from 'src/story/entities/story-views.entity';
import {
    Entity,
    Column,
    PrimaryColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';

@Entity('users')
export class User {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true })
    country: string;

    @Column({ name: 'ip_country_code', nullable: true })
    ipCountryCode: string;

    @Column({ nullable: true })
    username: string;

    @Column({ nullable: true, unique: true })
    email: string;

    @Column({ nullable: true })
    password: string;

    @Column({ default: 'user', type: 'varchar' })
    role: string;

    @Column({ name: 'profile_image', nullable: true })
    profileImage: string;

    @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt: Date;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @OneToMany(() => ChapterState, (chapterState) => chapterState.user)
    chapterStates: ChapterState[];

    @OneToMany(() => StoryLikes, (storyLikes) => storyLikes.user)
    storyLikes: StoryLikes[];

    @OneToMany(() => StoryViews, (storyViews) => storyViews.user)
    storyViews: StoryViews[];

    @OneToMany(() => ChapterState, (chapterState) => chapterState.user)
    audioPreferences: ChapterState[];
}
