import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Story } from './story.entity';

@Entity('chapter')
export class Chapter {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'story_id' })
    storyId: string;

    @ManyToOne(() => Story, (story) => story.chapters, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'story_id' })
    story: Story;

    @Column({ type: 'int' })
    index: number;

    @Column()
    title: string;

    @Column({ type: 'text' })
    content: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
