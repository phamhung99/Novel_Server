import { Entity, PrimaryColumn } from 'typeorm';

@Entity('user_genres')
export class UserGenres {
    @PrimaryColumn({ name: 'user_id' })
    userId: string;

    @PrimaryColumn()
    genre: string;
}
