import {
    BadRequestException,
    forwardRef,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, MoreThan, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { UserCategoryPreference } from './entities/user-category-preference.entity';
import {
    DEFAULT_PROFILE_IMAGE_URL,
    ERROR_MESSAGES,
    MS_PER_DAY,
    TEMPORARY_COIN_DAYS,
} from 'src/common/constants/app.constant';
import { ReadingHistory } from './entities/reading-history.entity';
import { StoryStatus } from 'src/common/enums/story-status.enum';
import { UserCoins } from './entities/user-coins.entity';
import {
    ActionType,
    CoinReferenceType,
    CoinTransactionType,
    CoinType,
    TransactionStatus,
} from 'src/common/enums/app.enum';
import { MediaService } from 'src/media/media.service';
import { UserDailyAction } from './entities/user-daily-action.entity';
import {
    addDays,
    shouldResetByInterval,
    shouldResetMonthly,
    shouldResetWeekly,
    shouldResetYearly,
} from 'src/common/utils/date.utils';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedStoryPreviewResponse } from 'src/story/dto/paginated-story-preview.response';
import { enrichStoriesToPreviewDto } from 'src/common/mappers/story-preview.mapper';
import { Chapter } from 'src/story/entities/chapter.entity';
import { WalletDto } from './dto/wallet.dto';
import {
    RewardResponseDto,
    WatchAdsResponseDto,
    WatchAdsUnlockChapterResponseDto,
    WeekDayDto,
} from './dto/weekly-checkin.dto';
import { CoinTransaction } from './entities/coin-transaction.entity';
import { Transaction } from 'src/payments/entities/transaction.entity';
import { PaginationDto } from 'src/story/dto/pagination.dto';
import { IapProductService } from 'src/payments/iap-product.service';
import { ConfigService } from '@nestjs/config';
import { ChapterUnlockService } from 'src/story/chapter/chapter-unlock.service';

const coinTransactionTitles: Record<CoinReferenceType, string> = {
    [CoinReferenceType.IAP]: 'In-App Purchase',
    [CoinReferenceType.LOGIN]: 'Daily Login Bonus',
    [CoinReferenceType.WATCH_AD_COIN]: 'Ad Watch Coin Reward',
    [CoinReferenceType.CHAPTER_UNLOCK]: 'Chapter Unlock',
    [CoinReferenceType.ADMIN_ADJUST]: 'Admin Adjustment',
    [CoinReferenceType.REFUND]: 'Refund',
    [CoinReferenceType.GIFT_CODE]: 'Gift Code Reward',
};

@Injectable()
export class UserService extends BaseCrudService<User> {
    private readonly logger = new Logger(UserService.name);

    private readonly STREAK_REWARDS = [10, 15, 40, 10, 15, 15, 30] as const;

    private readonly PREMIUM_STREAK_REWARDS = [
        100, 100, 100, 100, 100, 100, 100,
    ] as const;

    private readonly AD_REWARD_COINS = 10;
    private readonly MAX_AD_VIEWS_COIN_PER_DAY = 5;
    private readonly MAX_AD_VIEWS_UNLOCK_PER_DAY = 5;

    private readonly enableTestSubscription: boolean;
    private readonly testSubscriptionIntervalMinutes: number;

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
        @InjectRepository(CoinTransaction)
        private readonly coinTransactionRepo: Repository<CoinTransaction>,
        @InjectRepository(Transaction)
        private readonly transactionRepo: Repository<Transaction>,
        private readonly iapProductService: IapProductService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => ChapterUnlockService))
        private readonly chapterUnlockService: ChapterUnlockService,
    ) {
        super(userRepo);

        this.enableTestSubscription = this.configService.get<boolean>(
            'ENABLE_TEST_SUBSCRIPTION',
        );
        this.testSubscriptionIntervalMinutes = this.configService.get<number>(
            'TEST_SUBSCRIPTION_INTERVAL_MINUTES',
        );
    }

    protected getEntityName(): string {
        return 'User';
    }

    protected getUniqueField(): keyof User {
        return;
    }

    private getTransactionTitle(referenceType: CoinReferenceType): string {
        return coinTransactionTitles[referenceType] ?? 'Coin Transaction';
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

    async findUserRoleById(id: string): Promise<string> {
        const user = await this.repository.findOne({
            where: { id },
            select: ['role'],
        });

        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        return user.role;
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
    ): Promise<PaginatedStoryPreviewResponse> {
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
                .leftJoin(
                    (qb) =>
                        qb
                            .select('c.story_id')
                            .addSelect('COUNT(c.id)', 'chapter_count')
                            .from(Chapter, 'c')
                            .groupBy('c.story_id'),
                    'ss',
                    'ss.story_id = s.id',
                )
                .select([
                    's.id AS "storyId"',
                    's.title AS "title"',
                    's.synopsis AS "synopsis"',
                    's.coverImage AS "coverImage"',
                    's.rating AS "rating"',
                    's.type AS "type"',
                    's.status AS "status"',
                    's.visibility AS "visibility"',
                    's.likes_count AS "likesCount"',
                    's.views_count AS "viewsCount"',
                    's.tags AS "hashtags"',

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

                    'ss.chapter_count AS "chapterCount"',

                    `(
                        COALESCE(ss.chapter_count, 0) >= 
                        COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)
                    ) AS "isCompleted"`,
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
                .addGroupBy('s.likes_count')
                .addGroupBy('s.views_count')
                .addGroupBy('generation.prompt')
                .addGroupBy('ss.chapter_count')
                .orderBy('rh.lastReadAt', 'DESC')
                .offset(offset)
                .limit(limit);

            const stories = await qb.getRawMany();
            const total = await qb.getCount();

            const items = await enrichStoriesToPreviewDto(
                stories,
                this.mediaService,
                userId,
            );

            return { page, limit, total, items };
        } catch (error) {
            console.error('Failed to get recent stories:', error);
            throw new BadRequestException('Cannot fetch recent stories');
        }
    }

    async calculateLoginStreakAndBonus(
        userId: string,
        isSubUser?: boolean,
    ): Promise<{
        currentStreak: number;
        todayBonus: number | null;
        todayPremiumBonus: number | null;
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
                todayBonus: this.STREAK_REWARDS[0],
                todayPremiumBonus: isSubUser
                    ? this.PREMIUM_STREAK_REWARDS[0]
                    : null,
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
                : this.STREAK_REWARDS[bonusIndex],
            todayPremiumBonus:
                hasLoggedInToday || !isSubUser
                    ? null
                    : this.PREMIUM_STREAK_REWARDS[bonusIndex],
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
                const { isSubUser } = await this.getSubscriptionStatus(userId);

                const { todayBonus, todayPremiumBonus, currentStreak } =
                    await this.calculateLoginStreakAndBonus(userId, isSubUser);

                // Grant normal bonus
                if (todayBonus !== null && todayBonus > 0) {
                    this.logger.log(
                        `Granting login bonus of ${todayBonus} coins to user ${userId} for login on ${todayStr}`,
                    );

                    await this.addCoins({
                        manager,
                        userId,
                        amount: todayBonus,
                        coinType: CoinType.TEMPORARY,
                        description: `Daily login streak bonus (day ${currentStreak})`,
                        referenceType: CoinReferenceType.LOGIN,
                    });
                }

                // Grant premium bonus if applicable
                if (todayPremiumBonus !== null && todayPremiumBonus > 0) {
                    this.logger.log(
                        `Granting premium login bonus of ${todayPremiumBonus} coins to user ${userId} for login on ${todayStr}`,
                    );

                    await this.addCoins({
                        manager,
                        userId,
                        amount: todayPremiumBonus,
                        coinType: CoinType.TEMPORARY,
                        description: `Premium daily login streak bonus (day ${currentStreak})`,
                        referenceType: CoinReferenceType.LOGIN,
                    });
                }
            }
        });
    }

    async getSubscriptionStatus(userId: string): Promise<{
        isSubUser: boolean;
        basePlanId: string | null;
        expiresAt: string | null;
    }> {
        const now = new Date();

        const activeSubscription = await this.transactionRepo.findOne({
            where: {
                userId: userId,
                expiryTime: MoreThan(now),
                status: TransactionStatus.ACTIVE,
            },
            order: {
                expiryTime: 'DESC',
            },
            select: [
                'id',
                'basePlanId',
                'storeProductId',
                'createdAt',
                'lastCoinResetAt',
                'expiryTime',
            ],
        });

        if (activeSubscription) {
            // Check and reset coins based on subscription renewal periods
            await this.checkAndResetSubscriptionCoins(
                userId,
                activeSubscription,
            );

            return {
                isSubUser: true,
                basePlanId: activeSubscription.basePlanId,
                expiresAt: activeSubscription.expiryTime.toISOString(),
            };
        }

        return {
            isSubUser: false,
            basePlanId: null,
            expiresAt: null,
        };
    }

    async getUserInfo(user: User): Promise<any> {
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const [coinsData, subscriptionData] = await Promise.all([
            this.calculateUserCoins(user.id),
            this.getSubscriptionStatus(user.id),
        ]);

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
            subscription: subscriptionData,
            wallet: coinsData,
            preferredCategories,
        };
    }

    async watchAdsAndGrantBonus(userId: string): Promise<WatchAdsResponseDto> {
        const todayStr = new Date().toISOString().split('T')[0];

        return this.dataSource.transaction(async (manager) => {
            const actionRepo = manager.getRepository(UserDailyAction);

            let todayAction = await actionRepo.findOne({
                where: {
                    userId,
                    actionType: ActionType.WATCH_AD_COIN,
                    actionDate: todayStr,
                },
                lock: { mode: 'pessimistic_write' },
            });

            if (
                todayAction &&
                todayAction.count >= this.MAX_AD_VIEWS_COIN_PER_DAY
            ) {
                const updatedCoins = await this.calculateUserCoins(userId, {
                    manager,
                });

                return {
                    success: false,
                    message: `You've reached the daily limit of ${this.MAX_AD_VIEWS_COIN_PER_DAY} ads. Come back tomorrow!`,
                    data: {
                        adInfo: {
                            coinsGranted: 0,
                            currentViews: todayAction.count,
                            maxViews: this.MAX_AD_VIEWS_COIN_PER_DAY,
                        },
                        wallet: updatedCoins,
                    },
                };
            }

            if (!todayAction) {
                todayAction = actionRepo.create({
                    userId,
                    actionType: ActionType.WATCH_AD_COIN,
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
            await this.addCoins({
                manager,
                userId,
                amount: this.AD_REWARD_COINS,
                coinType: CoinType.TEMPORARY,
                description: `Ad reward - view #${todayAction.count}`,
                referenceType: CoinReferenceType.WATCH_AD_COIN,
            });

            const updatedCoins = await this.calculateUserCoins(userId, {
                manager,
            });

            return {
                success: true,
                message: `Ad watched successfully! You received ${coinsToGrant} coins.`,
                data: {
                    adInfo: {
                        coinsGranted: coinsToGrant,
                        currentViews: todayAction.count,
                        maxViews: this.MAX_AD_VIEWS_COIN_PER_DAY,
                    },
                    wallet: updatedCoins,
                },
            };
        });
    }

    async watchAdsAndUnlockChapter(
        userId: string,
        chapterId: string,
    ): Promise<WatchAdsUnlockChapterResponseDto> {
        const todayStr = new Date().toISOString().split('T')[0];

        return this.dataSource.transaction(async (manager) => {
            const accessCheck =
                await this.chapterUnlockService.canUserAccessChapter(
                    userId,
                    chapterId,
                );

            if (!accessCheck.chapter) {
                throw new NotFoundException(
                    accessCheck.reason || 'Chapter or story not found',
                );
            }

            if (accessCheck.canAccess) {
                throw new BadRequestException(
                    'You already have access to this chapter',
                );
            }

            const actionRepo = manager.getRepository(UserDailyAction);

            let todayAction = await actionRepo.findOne({
                where: {
                    userId,
                    actionType: ActionType.WATCH_AD_UNLOCK,
                    actionDate: todayStr,
                },
                lock: { mode: 'pessimistic_write' },
            });

            if (
                todayAction &&
                todayAction.count >= this.MAX_AD_VIEWS_UNLOCK_PER_DAY
            ) {
                return {
                    success: false,
                    message: `You've reached the daily limit of ${this.MAX_AD_VIEWS_UNLOCK_PER_DAY} ads. Come back tomorrow!`,
                    data: {
                        adInfo: {
                            coinsGranted: 0,
                            currentViews: todayAction.count,
                            maxViews: this.MAX_AD_VIEWS_UNLOCK_PER_DAY,
                        },
                        chapterId: chapterId,
                    },
                };
            }

            await this.chapterUnlockService.unlockChapter({
                userId,
                storyId: accessCheck.story.id,
                index: accessCheck.chapter.index,
            });

            if (!todayAction) {
                todayAction = actionRepo.create({
                    userId,
                    actionType: ActionType.WATCH_AD_UNLOCK,
                    actionDate: todayStr,
                    count: 1,
                    lastActionAt: new Date(),
                });
            } else {
                todayAction.count += 1;
                todayAction.lastActionAt = new Date();
            }

            await actionRepo.save(todayAction);

            return {
                success: true,
                message: `Ad watched successfully! You unlocked the chapter without spending coins.`,
                data: {
                    adInfo: {
                        coinsGranted: 0,
                        currentViews: todayAction.count,
                        maxViews: this.MAX_AD_VIEWS_UNLOCK_PER_DAY,
                    },
                    chapterId: chapterId,
                },
            };
        });
    }

    async calculateUserCoins(
        userId: string,
        options: { manager?: EntityManager } = {},
    ): Promise<WalletDto> {
        const now = new Date();

        // Chọn repository phù hợp
        const repo = options.manager
            ? options.manager.getRepository(UserCoins)
            : this.userCoinsRepository;

        const coinRecords = await repo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
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

        const activeTemporaryAmount = activeTemporary.reduce(
            (sum, c) => sum + c.remaining,
            0,
        );

        const totalCoins = permanentCoins + activeTemporaryAmount;

        return {
            totalCoins,
            permanentCoins,
            temporaryCoins: activeTemporaryAmount,
        };
    }

    async updateUser(
        id: string,
        updateDto: UpdateUserDto,
        profileImageFile?: Express.Multer.File,
    ) {
        const user = await this.repository.findOne({
            where: { id },
            relations: [
                'userCategoryPreferences',
                'userCategoryPreferences.category',
            ],
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        let newProfileImageKey: string | undefined;

        if (profileImageFile) {
            try {
                const { key } =
                    await this.mediaService.uploadUserProfileImage(
                        profileImageFile,
                    );
                newProfileImageKey = key;
            } catch (err) {
                throw new BadRequestException('Failed to upload profile image');
            }
        }

        const updateData: Partial<User> = { ...updateDto };
        if (newProfileImageKey) {
            updateData.profileImage = newProfileImageKey;
        }

        Object.assign(user, updateData);

        const savedUser = await this.repository.save(user);

        if (
            newProfileImageKey &&
            user.profileImage &&
            user.profileImage !== newProfileImageKey &&
            user.profileImage !== DEFAULT_PROFILE_IMAGE_URL
        ) {
            this.mediaService.delete(user.profileImage).catch((err) => {
                this.logger.error(
                    `Failed to delete old profile image ${user.profileImage}`,
                    err.stack,
                );
            });
        }

        return this.getUserInfo(savedUser);
    }

    async getReward(userId: string): Promise<RewardResponseDto> {
        const user = await this.repository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const streakInfo = await this.calculateLoginStreakAndBonus(userId);
        const { currentStreak, todayBonus } = streakInfo;

        let currentDay = 1;

        if (currentStreak > 0) {
            const remainder = currentStreak % 7;
            currentDay = remainder === 0 ? 7 : remainder;
        }

        const hasCheckedToday = todayBonus === null;

        const weekDays: WeekDayDto[] = this.STREAK_REWARDS.map(
            (coin, index) => {
                const day = index + 1;
                const isChecked =
                    day < currentDay || (day === currentDay && hasCheckedToday);

                return {
                    day,
                    isChecked,
                    coin,
                    coinPremium: this.PREMIUM_STREAK_REWARDS[index],
                };
            },
        );

        const todayStr = new Date().toISOString().split('T')[0];
        const todayAdAction = await this.userDailyActionRepo.findOne({
            where: {
                userId,
                actionType: ActionType.WATCH_AD_COIN,
                actionDate: todayStr,
            },
        });

        const currentViews = todayAdAction?.count || 0;

        const wallet = await this.calculateUserCoins(userId);

        return {
            checkIn: {
                currentDay,
                weekDays,
            },
            adInfo: {
                coinsGranted: this.AD_REWARD_COINS,
                currentViews,
                maxViews: this.MAX_AD_VIEWS_COIN_PER_DAY,
            },
            wallet,
        };
    }

    /**
     * Cộng coin và ghi lịch sử giao dịch
     */
    async addCoins({
        userId,
        amount,
        coinType = CoinType.PERMANENT, // hoặc TEMPORARY
        referenceType,
        referenceId,
        description,
        manager, // optional - dùng trong transaction lớn
    }: {
        userId: string;
        amount: number;
        coinType?: CoinType;
        referenceType: CoinReferenceType;
        referenceId?: string;
        description?: string;
        manager?: EntityManager;
    }): Promise<number> {
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        const execute = async (tx: EntityManager) => {
            // 1. Tạo bản ghi coin mới (theo logic hiện tại của bạn)
            const coinRecord = tx.getRepository(UserCoins).create({
                userId,
                type: coinType,
                amount,
                remaining: amount,
                expiresAt:
                    coinType === CoinType.TEMPORARY
                        ? addDays(new Date(), TEMPORARY_COIN_DAYS)
                        : null,
            });

            await tx.getRepository(UserCoins).save(coinRecord);

            // 2. Tính tổng số dư hiện tại SAU khi cộng
            const wallet = await this.calculateUserCoins(userId, {
                manager: tx,
            });
            const newTotalBalance = wallet.totalCoins;

            // 3. Ghi lịch sử giao dịch
            const transaction = tx.getRepository(CoinTransaction).create({
                userId,
                type: CoinTransactionType.ADD,
                amount,
                balanceAfter: newTotalBalance,
                referenceType,
                referenceId,
                description:
                    description ||
                    `Added ${amount} ${coinType} coins from ${referenceType || 'system'}`,
                createdAt: new Date(),
                expiresAt: coinRecord.expiresAt,
            });

            await tx.getRepository(CoinTransaction).save(transaction);

            return newTotalBalance;
        };

        if (manager) {
            // đang trong transaction lớn → dùng luôn
            return execute(manager);
        }

        // transaction riêng
        return this.dataSource.transaction(execute);
    }

    /**
     * Trừ coin với ưu tiên: temporary (sắp hết hạn trước) → permanent
     * @throws BadRequestException nếu không đủ coin hoặc amount <= 0
     */
    async spendCoins({
        userId,
        amount,
        referenceType,
        referenceId,
        description,
        manager,
    }: {
        userId: string;
        amount: number;
        referenceType?: string;
        referenceId?: string;
        description: string;
        manager?: EntityManager;
    }): Promise<{ newBalance: number; spentDetails: any[] }> {
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        const execute = async (tx: EntityManager): Promise<any> => {
            const now = new Date();

            const coinRecords = await tx.getRepository(UserCoins).find({
                where: [
                    {
                        userId,
                        type: CoinType.PERMANENT,
                        remaining: MoreThan(0),
                    },
                    {
                        userId,
                        type: CoinType.TEMPORARY,
                        remaining: MoreThan(0),
                        expiresAt: MoreThan(now),
                    },
                ],
                order: {
                    expiresAt: 'ASC',
                },
                lock: { mode: 'pessimistic_write' },
            });

            if (!coinRecords.length) {
                throw new BadRequestException('No available coins');
            }

            let remainingToSpend = amount;
            const spentDetails: Array<{
                id: string;
                type: CoinType;
                amountSpent: number;
                expiresAt?: string;
            }> = [];
            const recordsToUpdate: UserCoins[] = [];

            for (const record of coinRecords) {
                if (remainingToSpend <= 0) break;

                const canSpend = Math.min(remainingToSpend, record.remaining);
                if (canSpend <= 0) continue;

                // Chuẩn bị cập nhật (chưa save)
                record.remaining -= canSpend;
                recordsToUpdate.push(record);

                spentDetails.push({
                    id: record.id,
                    type: record.type,
                    amountSpent: canSpend,
                    expiresAt: record.expiresAt?.toISOString(),
                });

                remainingToSpend -= canSpend;
            }

            if (remainingToSpend > 0) {
                throw new BadRequestException(
                    `Insufficient coins. Required: ${amount}, Available: ${amount - remainingToSpend}`,
                );
            }

            // Bulk update – chỉ 1 query (hoặc rất ít query)
            if (recordsToUpdate.length > 0) {
                await tx
                    .getRepository(UserCoins)
                    .save(recordsToUpdate, { chunk: 100 });
            }

            // 3. Tính tổng số dư sau khi trừ
            const walletAfter = await this.calculateUserCoins(userId, {
                manager: tx,
            });
            const newTotalBalance = walletAfter.totalCoins;

            // 4. Ghi lịch sử giao dịch (amount âm để biểu thị trừ)
            const transaction = tx.getRepository(CoinTransaction).create({
                userId,
                type: CoinTransactionType.SPEND,
                amount: -amount,
                balanceAfter: newTotalBalance,
                referenceType,
                referenceId,
                description: description,
                createdAt: new Date(),
                expiresAt: null,
            });

            await tx.getRepository(CoinTransaction).save(transaction);

            return {
                newBalance: newTotalBalance,
                spentDetails,
            };
        };

        return manager
            ? execute(manager)
            : this.dataSource.transaction(execute);
    }

    async getCoinTransactions(userId: string, paginationDto: PaginationDto) {
        const { page = 1, limit = 20 } = paginationDto;
        const skip = (page - 1) * limit;

        const [transactions, total] =
            await this.coinTransactionRepo.findAndCount({
                where: { userId },
                order: { createdAt: 'DESC' },
                skip,
                take: limit,
            });

        const items = transactions.map((transaction) => {
            const title = this.getTransactionTitle(
                transaction.referenceType as CoinReferenceType,
            );

            return {
                amount: transaction.amount,
                title: title,
                description: transaction.description,
                createdAt: transaction.createdAt,
                expiresAt: transaction.expiresAt,
            };
        });

        return {
            page,
            limit,
            total,
            items,
        };
    }

    /**
     * Check and reset subscription coins based on weekly, monthly, or yearly renewal
     */
    private async checkAndResetSubscriptionCoins(
        userId: string,
        subscription: Transaction,
    ): Promise<void> {
        const now = new Date();
        const lastReset =
            subscription.lastCoinResetAt || subscription.createdAt;

        // Determine reset period based on plan (you may need to adjust this logic)
        const planId = subscription.basePlanId;
        let shouldReset = false;
        let resetPeriod: 'weekly' | 'monthly' | 'yearly' | 'test' | null = null;

        // Check if this is a Google Play test subscription (5-minute interval)
        const isTestSubscription =
            subscription.storeProductId?.includes('test') ||
            this.enableTestSubscription;

        if (isTestSubscription) {
            // For Google Play test subscriptions (5-minute renewal)
            resetPeriod = 'test';
            const testIntervalMinutes =
                this.testSubscriptionIntervalMinutes || 5;

            shouldReset = shouldResetByInterval(
                lastReset,
                now,
                testIntervalMinutes,
            );
        } else if (planId?.includes('weekly')) {
            resetPeriod = 'weekly';
            shouldReset = shouldResetWeekly(lastReset, now);
        } else if (planId?.includes('monthly')) {
            resetPeriod = 'monthly';
            shouldReset = shouldResetMonthly(lastReset, now);
        } else if (planId?.includes('yearly')) {
            resetPeriod = 'yearly';
            shouldReset = shouldResetYearly(lastReset, now);
        }

        if (shouldReset && resetPeriod) {
            await this.dataSource.transaction(async (manager) => {
                // Reset coins for the subscription period
                const { coinsToAdd } =
                    await this.iapProductService.calculateCoinsForProduct({
                        storeProductId: subscription.storeProductId,
                        basePlanId: subscription.basePlanId,
                    });

                if (coinsToAdd <= 0) {
                    this.logger.warn(
                        `No coins to add for subscription ${subscription.id} during ${resetPeriod} reset`,
                    );
                    return;
                }

                this.logger.log(
                    `Resetting coins for subscription ${subscription.id} with ${coinsToAdd} coins during ${resetPeriod} reset lastCoinResetAt=${lastReset} now=${now}`,
                );

                await this.addCoins({
                    manager,
                    userId,
                    amount: coinsToAdd,
                    coinType: CoinType.PERMANENT,
                    description: `${resetPeriod} subscription coin reset`,
                    referenceType: CoinReferenceType.IAP,
                    referenceId: subscription.id,
                });

                // Update last reset timestamp
                await manager
                    .getRepository(Transaction)
                    .update(subscription.id, {
                        lastCoinResetAt: now,
                    });

                this.logger.log(
                    `Reset ${coinsToAdd} coins for user ${userId} (${resetPeriod} subscription)`,
                );
            });
        }
    }
}
