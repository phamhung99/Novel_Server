import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Story } from 'src/story/entities/story.entity';

@Entity('reading_history')
export class ReadingHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Story)
    @JoinColumn({ name: 'story_id' })
    story: Story;

    @Column({ type: 'uuid', nullable: true, name: 'last_read_chapter' })
    lastReadChapter: string;

    @Column({ type: 'timestamptz', nullable: true, name: 'last_read_at' })
    lastReadAt: Date;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;
}
