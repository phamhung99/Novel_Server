import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { UserCategoryPreference } from './entities/user-category-preference.entity';
import { ERROR_MESSAGES } from 'src/common/constants/app.constant';
import { ReadingHistory } from './entities/reading-history.entity';
import { StoryStatus } from 'src/common/enums/story-status.enum';

@Injectable()
export class UserService extends BaseCrudService<User> {
    constructor(
        @InjectRepository(User) userRepo: Repository<User>,
        @InjectRepository(UserCategoryPreference)
        private readonly userCategoryPreferenceRepo: Repository<UserCategoryPreference>,
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

    async getSelectedCategories(userId: string): Promise<string[]> {
        const user = await this.repository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const userCategoryPreferences =
            await this.userCategoryPreferenceRepo.find({
                where: { userId },
                select: {
                    category: {
                        id: true,
                    },
                },
                relations: ['category'],
            });

        return userCategoryPreferences.map((ucp) => ucp.category.id);
    }

    async updateSelectedCategories(
        userId: string,
        categoryIds: string[],
    ): Promise<void> {
        if (!Array.isArray(categoryIds)) {
            throw new BadRequestException('categoryIds must be an array');
        }

        await this.dataSource.transaction(async (manager) => {
            // Xóa tất cả category cũ của user
            await manager.delete(UserCategoryPreference, { userId });

            if (categoryIds.length) {
                const userCategoryPreferences = categoryIds.map((categoryId) =>
                    manager.create(UserCategoryPreference, {
                        userId,
                        categoryId,
                    }),
                );
                await manager.save(userCategoryPreferences);
            }
        });

        return;
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
                .leftJoin('s.categories', 'cat')
                .select([
                    's.id AS "storyId"',
                    's.title AS "title"',
                    's.synopsis AS "synopsis"',
                    's.coverImage AS "coverImage"',
                    's.rating AS "rating"',
                    's.type AS "type"',
                    's.status AS "status"',
                    `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) AS "categories"`,

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
                .andWhere('s.status = :status', {
                    status: StoryStatus.PUBLISHED,
                })
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
