import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { UserCategoryPreference } from './entities/user-category-preference.entity';
import {
    ERROR_MESSAGES,
    MS_PER_DAY,
    TEMPORARY_COIN_DAYS,
} from 'src/common/constants/app.constant';
import { ReadingHistory } from './entities/reading-history.entity';
import { StoryStatus } from 'src/common/enums/story-status.enum';
import { Chapter } from 'src/story/entities/chapter.entity';
import { UserCoins } from './entities/user-coins.entity';
import { ActionType, CoinType } from 'src/common/enums/app.enum';
import { MediaService } from 'src/media/media.service';
import { UserDailyAction } from './entities/user-daily-action.entity';
import { addDays } from 'src/common/utils/date.utils';

@Injectable()
export class UserService extends BaseCrudService<User> {
    private readonly logger = new Logger(UserService.name);

    private readonly LOGIN_STREAK_BONUS_SCHEDULE = [
        10, 15, 40, 10, 15, 15, 30,
    ] as const;

    private readonly AD_REWARD_COINS = 50;
    private readonly MAX_AD_VIEWS_PER_DAY = 5;

    constructor(
        @InjectRepository(User) userRepo: Repository<User>,
        @InjectRepository(UserCategoryPreference)
        private readonly userCategoryPreferenceRepo: Repository<UserCategoryPreference>,
        private readonly dataSource: DataSource,
        @InjectRepository(UserCoins)
        private readonly userCoinsRepository: Repository<UserCoins>,
        private mediaService: MediaService,
        @InjectRepository(UserDailyAction)
        private readonly userDailyActionRepo: Repository<UserDailyAction>,
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

    async calculateLoginStreakAndBonus(userId: string): Promise<{
        currentStreak: number;
        todayBonus: number | null;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const loginActions = await this.userDailyActionRepo.find({
            where: { userId, actionType: ActionType.LOGIN },
            order: { actionDate: 'DESC' },
        });

        if (loginActions.length === 0) {
            return {
                currentStreak: 0,
                todayBonus: this.LOGIN_STREAK_BONUS_SCHEDULE[0],
            };
        }

        let streak = 0;
        let previousDate = today;
        let hasLoggedInToday = false;

        for (const action of loginActions) {
            const date = new Date(action.actionDate);
            date.setHours(0, 0, 0, 0);

            const diffDays = Math.floor(
                (previousDate.getTime() - date.getTime()) / MS_PER_DAY,
            );

            if (diffDays === 0) {
                hasLoggedInToday = true;
            } else if (diffDays !== 1) {
                break;
            }

            streak++;
            previousDate = date;
        }

        const currentStreak = hasLoggedInToday ? streak : streak + 1;
        const bonusIndex = streak % 7;

        return {
            currentStreak,
            todayBonus: hasLoggedInToday
                ? null
                : this.LOGIN_STREAK_BONUS_SCHEDULE[bonusIndex],
        };
    }

    async recordDailyCheckInAndGrantBonus(user: User) {
        const userId = user.id;
        const todayStr = new Date().toISOString().split('T')[0];

        return this.dataSource.transaction(async (manager) => {
            const repo = manager.getRepository(UserDailyAction);

            // 1. Tìm hoặc tạo record login hôm nay
            let todayLogin = await repo.findOne({
                where: {
                    userId,
                    actionType: ActionType.LOGIN,
                    actionDate: todayStr,
                },
                lock: { mode: 'pessimistic_write' },
            });

            const isFirstLoginToday = !todayLogin;

            if (isFirstLoginToday) {
                todayLogin = repo.create({
                    userId,
                    actionType: ActionType.LOGIN,
                    actionDate: todayStr,
                    count: 1,
                    lastActionAt: new Date(),
                });
            } else {
                todayLogin.count += 1;
                todayLogin.lastActionAt = new Date();
            }

            await repo.save(todayLogin);

            if (isFirstLoginToday) {
                const { todayBonus } =
                    await this.calculateLoginStreakAndBonus(userId);

                if (todayBonus !== null && todayBonus > 0) {
                    this.logger.log(
                        `Granting login bonus of ${todayBonus} coins to user ${userId} for login on ${todayStr}`,
                    );

                    await this.grantCoins({
                        manager,
                        userId,
                        amount: todayBonus,
                        type: CoinType.TEMPORARY,
                        source: ActionType.LOGIN,
                    });
                }
            }
        });
    }

    private async grantCoins({
        manager,
        userId,
        amount,
        type,
        source,
    }: {
        manager: EntityManager;
        userId: string;
        amount: number;
        type: CoinType;
        source?: string;
    }): Promise<void> {
        if (amount <= 0) return;

        const coinRepo = manager.getRepository(UserCoins);

        const newRecord = coinRepo.create({
            userId,
            type,
            remaining: amount,
            amount: amount,
            expiresAt:
                type === CoinType.TEMPORARY
                    ? addDays(new Date(), TEMPORARY_COIN_DAYS)
                    : null,
            source: source,
        });

        await coinRepo.save(newRecord);
    }

    async getUserInfo(user: User): Promise<any> {
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const coinsData = await this.calculateUserCoins(user.id);

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
        user.userCategoryPreferences = undefined;

        return {
            ...user,
            profileImageUrl,
            subscription: {
                isSubUser: false,
                basePlanId: null,
            },
            wallet: {
                totalCoins: coinsData.totalCoins,
                permanentCoins: coinsData.permanentCoins,
                temporaryCoins: coinsData.temporaryCoins,
            },
            preferredCategories,
        };
    }

    async watchAdsAndGrantBonus(userId: string) {
        const todayStr = new Date().toISOString().split('T')[0];

        return this.dataSource.transaction(async (manager) => {
            const actionRepo = manager.getRepository(UserDailyAction);

            let todayAction = await actionRepo.findOne({
                where: {
                    userId,
                    actionType: ActionType.WATCH_AD,
                    actionDate: todayStr,
                },
                lock: { mode: 'pessimistic_write' },
            });

            if (todayAction && todayAction.count >= this.MAX_AD_VIEWS_PER_DAY) {
                const updatedCoins = await this.calculateUserCoins(userId, {
                    manager,
                });

                return {
                    success: false,
                    message: `You've reached the daily limit of ${this.MAX_AD_VIEWS_PER_DAY} ads. Come back tomorrow!`,
                    data: {
                        coinsGranted: 0,
                        currentViews: todayAction.count,
                        maxViews: this.MAX_AD_VIEWS_PER_DAY,
                        wallet: {
                            totalCoins: updatedCoins.totalCoins,
                            permanentCoins: updatedCoins.permanentCoins,
                            temporaryCoins: updatedCoins.temporaryCoins,
                        },
                    },
                };
            }

            if (!todayAction) {
                todayAction = actionRepo.create({
                    userId,
                    actionType: ActionType.WATCH_AD,
                    actionDate: todayStr,
                    count: 1,
                    lastActionAt: new Date(),
                });
            } else {
                todayAction.count += 1;
                todayAction.lastActionAt = new Date();
            }

            await actionRepo.save(todayAction);

            const coinsToGrant = this.AD_REWARD_COINS;
            await this.grantCoins({
                manager,
                userId,
                amount: coinsToGrant,
                type: CoinType.TEMPORARY,
                source: ActionType.WATCH_AD,
            });

            const updatedCoins = await this.calculateUserCoins(userId, {
                manager,
            });

            return {
                success: true,
                message: `Ad watched successfully! You received ${coinsToGrant} coins.`,
                data: {
                    coinsGranted: coinsToGrant,
                    currentViews: todayAction.count,
                    maxViews: this.MAX_AD_VIEWS_PER_DAY,
                    wallet: {
                        totalCoins: updatedCoins.totalCoins,
                        permanentCoins: updatedCoins.permanentCoins,
                        temporaryCoins: updatedCoins.temporaryCoins,
                    },
                },
            };
        });
    }

    async calculateUserCoins(
        userId: string,
        options: { manager?: EntityManager } = {},
    ): Promise<{
        totalCoins: number;
        permanentCoins: number;
        temporaryCoins: Array<{ amount: number; expiresAt: string }>;
    }> {
        const now = new Date();

        // Chọn repository phù hợp
        const repo = options.manager
            ? options.manager.getRepository(UserCoins)
            : this.userCoinsRepository;

        const coinRecords = await repo.find({
            where: { userId },
            order: { createdAt: 'ASC' },
        });

        // 1. Permanent coins (thường không expire)
        const permanentCoins = coinRecords
            .filter((c) => c.type === CoinType.PERMANENT)
            .reduce((sum, c) => sum + c.remaining, 0);

        // 2. Temporary coins còn hiệu lực
        const activeTemporary = coinRecords.filter(
            (c) =>
                c.type === CoinType.TEMPORARY &&
                c.expiresAt &&
                c.expiresAt > now,
        );

        const temporaryCoinsForDisplay = activeTemporary.map((c) => ({
            id: c.id,
            amount: c.remaining,
            expiresAt: c.expiresAt!.toISOString(),
            createdAt: c.createdAt.toISOString(),
        }));

        const activeTemporaryAmount = activeTemporary.reduce(
            (sum, c) => sum + c.remaining,
            0,
        );

        const totalCoins = permanentCoins + activeTemporaryAmount;

        return {
            totalCoins,
            permanentCoins,
            temporaryCoins: temporaryCoinsForDisplay,
        };
    }
}
