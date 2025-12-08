import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Story } from './story.entity';

@Entity('story_views')
export class StoryViews {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Story, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'story_id' })
    story: Story;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @Column({ name: 'viewed_at', type: 'timestamptz', nullable: true })
    viewedAt?: Date;
}
