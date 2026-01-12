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
import { UserCoins } from './entities/user-coins.entity';
import { CoinType } from 'src/common/enums/app.enum';
import { MediaService } from 'src/media/media.service';

@Injectable()
export class UserService extends BaseCrudService<User> {
    constructor(
        @InjectRepository(User) userRepo: Repository<User>,
        @InjectRepository(UserCategoryPreference)
        private readonly userCategoryPreferenceRepo: Repository<UserCategoryPreference>,
        private readonly dataSource: DataSource,
        @InjectRepository(UserCoins)
        private readonly userCoinsRepository: Repository<UserCoins>,
        private mediaService: MediaService,
    ) {
        super(userRepo);
    }

    protected getEntityName(): string {
        return 'User';
    }

    protected getUniqueField(): keyof User {
        return;
    }

    private generateRandomUsername(): string {
        const adjectives = [
            'Sunny',
            'Happy',
            'Cute',
            'Cool',
            'Wild',
            'Brave',
            'Swift',
            'Gentle',
            'Quiet',
            'Bright',
            'Mystic',
            'Silver',
            'Golden',
            'Shadow',
            'Frost',
        ];

        const nouns = [
            'Panda',
            'Tiger',
            'Fox',
            'Wolf',
            'Eagle',
            'Shark',
            'Dragon',
            'Cat',
            'Rabbit',
            'Penguin',
            'Koala',
            'Lion',
            'Bear',
            'Owl',
            'Phoenix',
        ];

        const adjective =
            adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const number = Math.floor(Math.random() * 9000) + 1000; // 1000-9999

        return `${adjective}${noun}_${number}`;
    }

    async findByEmail(email: string): Promise<User> {
        return this.repository.findOne({ where: { email } });
    }

    async findByEmailForLogin(email: string): Promise<User> {
        return this.repository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.email = :email', { email })
            .getOne();
    }

    async createOrUpdateUser({
        userId,
        language,
        platform,
    }: {
        userId: string;
        language: string;
        platform: string;
    }): Promise<User> {
        let user = await this.repository.findOne({
            where: { id: userId },
            relations: [
                'userCategoryPreferences',
                'userCategoryPreferences.category',
            ],
        });

        if (!user) {
            const randomUsername = this.generateRandomUsername();

            user = this.repository.create({
                id: userId,
                username: randomUsername,
                country: language,
                platform: platform,
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
                    's.visibility AS "visibility"',

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
                    's.likes_count AS "likesCount"',
                    's.views_count AS "viewsCount"',
                    `(COUNT(*) OVER() = COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)) AS "isCompleted"`,
                ])
                .where('rh.user_id = :userId', { userId })
                .andWhere('s.status = :status', {
                    status: StoryStatus.PUBLISHED,
                })
                .groupBy(
                    's.id, a.id, rh.lastReadAt, rh.lastReadChapter, likes.id, s.likes_count, s.views_count, generation.prompt',
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
                    .innerJoin('c.story', 's')
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
                        'isLock', (
                            cs.chapter_id IS NULL               
                            AND s.author_id != :userId             
                            )
                        )
                        ORDER BY c.index ASC
                    ) AS chapters`,
                    ])
                    .where('c.story_id IN (:...storyIds)', { storyIds })
                    .setParameters({ userId })
                    .groupBy('c.story_id')
                    .getRawMany();

                chaptersMap = Object.fromEntries(
                    chapters.map((row) => [row.storyId, row.chapters]),
                );
            }

            const items = await Promise.all(
                stories.map(async (story) => ({
                    ...story,
                    coverImage: undefined,
                    coverImageUrl: story.coverImage
                        ? await this.mediaService.getMediaUrl(story.coverImage)
                        : null,
                    chapters: chaptersMap[story.storyId] || [],
                    canEdit: story.authorId === userId,
                })),
            );

            return { page, limit, total, items };
        } catch (error) {
            console.error('Failed to get recent stories:', error);
            throw new BadRequestException('Cannot fetch recent stories');
        }
    }

    async getUserInfo(user: User): Promise<any> {
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const now = new Date();

        // Get all coin records for this user
        const coinRecords = await this.userCoinsRepository.find({
            where: { userId: user.id },
            order: { createdAt: 'ASC' },
        });

        // 1. Tính permanent (thường không expire)
        const permanentCoins = coinRecords
            .filter((c) => c.type === CoinType.PERMANENT)
            .reduce((sum, c) => sum + c.remaining, 0);

        // 2. Tính temporary còn hiệu lực
        const activeTemporary = coinRecords.filter(
            (c) =>
                c.type === CoinType.TEMPORARY &&
                c.expiresAt &&
                c.expiresAt > now,
        );

        const temporaryCoinsForDisplay = activeTemporary.map((c) => ({
            amount: c.remaining,
            expiresAt: c.expiresAt!.toISOString(),
        }));

        const activeTemporaryAmount = activeTemporary.reduce(
            (sum, c) => sum + c.remaining,
            0,
        );

        // 3. Total = permanent + temporary còn hạn
        const totalCoins = permanentCoins + activeTemporaryAmount;

        // Preferred categories (sorted by some order — you may want to add order column later)
        const preferredCategories =
            user.userCategoryPreferences
                ?.map((pref) => ({
                    id: pref.categoryId,
                    name: pref.category?.name ?? 'Unknown',
                    displayOrder:
                        pref.category?.displayOrder ?? Number.MAX_SAFE_INTEGER,
                }))
                ?.sort((a, b) => a.displayOrder - b.displayOrder) ?? [];

        const profileImageUrl = await this.mediaService.getMediaUrl(
            user.profileImage,
        );

        user.profileImage = undefined;

        return {
            ...user,
            profileImageUrl,
            subscription: {
                isSubUser: false,
                basePlanId: null,
            },
            wallet: {
                totalCoins,
                permanentCoins,
                temporaryCoins: temporaryCoinsForDisplay,
            },
            preferredCategories,
        };
    }
}
