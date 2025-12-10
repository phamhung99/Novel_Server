import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { UserGenres } from './entities/user-genres.entity';
import { ERROR_MESSAGES } from 'src/common/constants/app.constant';
import { StoryCategory } from 'src/common/enums/app.enum';
import { ReadingHistory } from './entities/reading-history.entity';

@Injectable()
export class UserService extends BaseCrudService<User> {
    constructor(
        @InjectRepository(User) userRepo: Repository<User>,
        @InjectRepository(UserGenres)
        private readonly userGenresRepo: Repository<UserGenres>,
        private readonly dataSource: DataSource,
        @InjectRepository(ReadingHistory)
        private readonly readingHistoryRepo: Repository<ReadingHistory>,
    ) {
        super(userRepo);
    }

    protected getEntityName(): string {
        return 'User';
    }

    protected getUniqueField(): keyof User {
        return;
    }

    async findByEmail(email: string): Promise<User> {
        return this.repository.findOne({ where: { email } });
    }

    async createOrUpdateUser({
        userId,
        language,
    }: {
        userId: string;
        language: string;
    }): Promise<User> {
        let user = await this.findById(userId, false);
        if (!user) {
            user = this.repository.create({
                id: userId,
                country: language,
            });
        }
        await this.repository.save(user);
        return user;
    }

    async getSelectedGenres(userId: string): Promise<StoryCategory[]> {
        const user = await this.repository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const userGenres = await this.userGenresRepo.find({
            where: { userId },
            select: ['genre'],
        });

        return userGenres.map((ug) => ug.genre as StoryCategory);
    }

    async updateSelectedGenres(
        userId: string,
        genres: StoryCategory[],
    ): Promise<StoryCategory[]> {
        if (!Array.isArray(genres)) {
            throw new BadRequestException('genres must be an array');
        }

        // Transaction: xóa cũ + insert mới
        await this.dataSource.transaction(async (manager) => {
            await manager.delete(UserGenres, { userId });

            if (genres.length) {
                const userGenres = genres.map((genre) =>
                    manager.create(UserGenres, { userId, genre }),
                );
                await manager.save(userGenres);
            }
        });

        return genres;
    }

    async getRecentStories(
        userId: string,
        { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
    ) {
        try {
            const offset = (page - 1) * limit;

            const qb = this.dataSource
                .getRepository(ReadingHistory)
                .createQueryBuilder('rh')
                .innerJoin('rh.story', 's')
                .leftJoin('s.author', 'a')
                .leftJoin('s.likes', 'likes', 'likes.userId = :userId', {
                    userId,
                })
                .leftJoin('story_summary', 'ss', 'ss.story_id = s.id')
                .leftJoin('s.chapters', 'c')
                .select([
                    's.id AS "storyId"',
                    's.title AS "title"',
                    's.synopsis AS "synopsis"',
                    's.coverImage AS "coverImage"',
                    's.rating AS "rating"',
                    's.type AS "type"',
                    'string_to_array(s.genres, \',\') AS "genres"',

                    'a.id AS "authorId"',
                    'a.username AS "authorUsername"',
                    'a.profileImage AS "profileImage"',

                    'rh.lastReadAt AS "lastReadAt"',
                    'rh.lastReadChapter AS "lastReadChapter"',

                    'CASE WHEN likes.id IS NULL THEN false ELSE true END AS "isLike"',

                    'ss.likes_count AS "likesCount"',
                    'ss.views_count AS "viewsCount"',

                    `json_agg(
                    json_build_object('id', c.id, 'title', c.title, 'index', c.index)
                    ORDER BY c.index ASC
                ) AS chapters`,
                ])
                .where('rh.user_id = :userId', { userId })
                .groupBy('s.id')
                .addGroupBy('a.id')
                .addGroupBy('rh.lastReadAt')
                .addGroupBy('rh.lastReadChapter')
                .addGroupBy('likes.id')
                .addGroupBy('ss.likes_count')
                .addGroupBy('ss.views_count')
                .orderBy('rh.lastReadAt', 'DESC')
                .offset(offset)
                .limit(limit);

            const [items, total] = await Promise.all([
                qb.getRawMany(),
                qb.getCount(),
            ]);

            return {
                page,
                limit,
                total,
                items,
            };
        } catch (error) {
            console.error('Failed to get recent stories:', error);
            throw new BadRequestException('Cannot fetch recent stories');
        }
    }
}
