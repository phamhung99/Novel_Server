import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { Story } from './story.entity';
import { ChapterGeneration } from './chapter-generation.entity';
import { ChapterState } from './chapter-states.entity';
import { ChapterAudio } from './chapter-audio.entity';
import { User } from 'src/user/entities/user.entity';

@Entity('chapter')
@Index('unique_chapter_per_story', ['storyId', 'index'], { unique: true })
export class Chapter {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'story_id' })
    storyId: string;

    @ManyToOne(() => Story, (story) => story.chapters, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'story_id' })
    story: Story;

    @OneToMany(
        () => ChapterGeneration,
        (chapterGeneration) => chapterGeneration.chapter,
        { onDelete: 'CASCADE' },
    )
    chapterGenerations: ChapterGeneration[];

    @Column({ type: 'int' })
    index: number;

    @Column()
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ name: 'created_by', nullable: false })
    createdBy: string;

    @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'created_by' })
    createdByUser: User;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @OneToMany(() => ChapterState, (chapterState) => chapterState.chapter, {
        cascade: true,
    })
    chapterStates: ChapterState[];

    @OneToMany(() => ChapterAudio, (chapterAudio) => chapterAudio.chapter, {
        cascade: true,
    })
    chapterAudios: ChapterAudio[];

    @OneToMany(() => ChapterAudio, (chapterAudio) => chapterAudio.chapter)
    audioPreferences: ChapterAudio[];
}
