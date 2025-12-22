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
import { Chapter } from 'src/story/entities/chapter.entity';

@Injectable()
export class UserService extends BaseCrudService<User> {
    constructor(
        @InjectRepository(User) userRepo: Repository<User>,
        @InjectRepository(UserCategoryPreference)
        private readonly userCategoryPreferenceRepo: Repository<UserCategoryPreference>,
        private readonly dataSource: DataSource,
        @InjectRepository(ReadingHistory)
        private readonly readingHistoryRepo: Repository<ReadingHistory>,
        @InjectRepository(Chapter)
        private readonly chapterRepo: Repository<Chapter>,
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

    async getSelectedCategories(userId: string) {
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
                        name: true,
                        displayOrder: true,
                    },
                },
                relations: ['category'],
            });

        return userCategoryPreferences.map((ucp) => ucp.category);
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

            // Query chính (không lấy chapters)
            const qb = this.dataSource
                .getRepository(ReadingHistory)
                .createQueryBuilder('rh')
                .innerJoin('rh.story', 's')
                .leftJoin('s.author', 'a')
                .leftJoin('s.likes', 'likes', 'likes.userId = :userId', {
                    userId,
                })
                .leftJoin('s.generation', 'generation')
                .leftJoin('story_summary', 'ss', 'ss.story_id = s.id')
                .leftJoin('s.storyCategories', 'sc')
                .leftJoin('sc.category', 'cat')
                .select([
                    's.id AS "storyId"',
                    's.title AS "title"',
                    's.synopsis AS "synopsis"',
                    's.coverImage AS "coverImage"',
                    's.rating AS "rating"',
                    's.type AS "type"',
                    's.status AS "status"',
                    's.createdAt AS "createdAt"',
                    's.updatedAt AS "updatedAt"',
                    `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) AS "categories"`,
                    `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) FILTER (WHERE sc.isMainCategory = true) -> 0 AS "mainCategory"`,
                    'a.id AS "authorId"',
                    'a.username AS "authorUsername"',
                    'a.profileImage AS "profileImage"',
                    'rh.lastReadAt AS "lastReadAt"',
                    'rh.lastReadChapter AS "lastReadChapter"',
                    'CASE WHEN likes.id IS NULL THEN false ELSE true END AS "isLike"',
                    'ss.likes_count AS "likesCount"',
                    'ss.views_count AS "viewsCount"',
                    `(COUNT(*) OVER() = COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)) AS "isCompleted"`,
                ])
                .where('rh.user_id = :userId', { userId })
                .andWhere('s.status = :status', {
                    status: StoryStatus.PUBLISHED,
                })
                .groupBy(
                    's.id, a.id, rh.lastReadAt, rh.lastReadChapter, likes.id, ss.likes_count, ss.views_count, generation.prompt',
                )
                .orderBy('rh.lastReadAt', 'DESC')
                .offset(offset)
                .limit(limit);

            const stories = await qb.getRawMany();
            const total = await qb.getCount();

            // Lấy danh sách storyId
            const storyIds = stories.map((s) => s.storyId);

            // Query riêng chapters nếu có story
            let chaptersMap = {};
            if (storyIds.length > 0) {
                const chapters = await this.dataSource
                    .getRepository(Chapter)
                    .createQueryBuilder('c')
                    .leftJoin(
                        'chapter_states',
                        'cs',
                        'cs.chapter_id = c.id AND cs.user_id = :userId',
                        { userId },
                    )
                    .select([
                        'c.story_id AS "storyId"',
                        `json_agg(
                        jsonb_build_object(
                            'id', c.id,
                            'title', c.title,
                            'index', c.index,
                            'createdAt', c.created_at,
                            'updatedAt', c.updated_at,
                            'isLock', cs.chapter_id IS NULL
                        ) ORDER BY c.index ASC
                    ) AS chapters`,
                    ])
                    .where('c.story_id IN (:...storyIds)', { storyIds })
                    .groupBy('c.story_id')
                    .getRawMany();

                chaptersMap = Object.fromEntries(
                    chapters.map((row) => [row.storyId, row.chapters]),
                );
            }

            const items = stories.map((story) => ({
                ...story,
                chapters: chaptersMap[story.storyId] || [],
            }));

            return { page, limit, total, items };
        } catch (error) {
            console.error('Failed to get recent stories:', error);
            throw new BadRequestException('Cannot fetch recent stories');
        }
    }
}
