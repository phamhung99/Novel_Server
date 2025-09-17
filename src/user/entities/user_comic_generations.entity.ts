import { GenerationType } from 'src/common/enums/generation-type.enum';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('user_comic_generations')
export class UserComicGenerations {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: string;

    @Column({ type: 'varchar', length: 32 })
    platform: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ default: false })
    isPro: boolean;

    @Column({
        type: 'enum',
        enum: GenerationType,
    })
    genType: GenerationType;
}
