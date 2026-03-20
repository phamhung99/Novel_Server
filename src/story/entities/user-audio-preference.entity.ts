import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Story } from './story.entity';
import { Chapter } from './chapter.entity';

@Entity('user_audio_preference')
export class UserAudioPreference {
    @PrimaryColumn({ name: 'user_id', type: 'varchar' })
    userId: string;

    @PrimaryColumn({ name: 'chapter_id', type: 'uuid' })
    chapterId: string;

    @Column({ name: 'story_id', type: 'uuid' })
    storyId: string;

    @Column()
    voice: string;

    @ManyToOne(() => User, (user) => user.audioPreferences, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Story, (story) => story.audioPreferences, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'story_id' })
    story: Story;

    @ManyToOne(() => Chapter, (chapter) => chapter.audioPreferences, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'chapter_id' })
    chapter: Chapter;
}
