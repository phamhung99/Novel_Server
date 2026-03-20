import {
    Entity,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Column,
    PrimaryGeneratedColumn,
    Index,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Story } from './story.entity';

@Entity('story_likes')
@Index(['userId', 'storyId'], { unique: true })
export class StoryLikes {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'varchar', nullable: true })
    userId: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @Column({ name: 'story_id', type: 'uuid' })
    storyId: string;

    @ManyToOne(() => Story, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'story_id' })
    story: Story;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
