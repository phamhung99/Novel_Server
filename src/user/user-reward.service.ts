import {
    forwardRef,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserDailyAction } from './entities/user-daily-action.entity';
import {
    ActionType,
    CoinReferenceType,
    CoinType,
} from 'src/common/enums/app.enum';
import { ERROR_MESSAGES, MS_PER_DAY } from 'src/common/constants/app.constant';
import {
    AdInfoDto,
    RewardResponseDto,
    WatchAdsResponseDto,
    WatchAdsUnlockChapterResponseDto,
    WeekDayDto,
} from './dto/weekly-checkin.dto';

import { UserCoinService } from './user-coin.service';
import { UserSubscriptionService } from './user-subscription.service';
import { ChapterUnlockService } from 'src/story/chapter/chapter-unlock.service';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

@Injectable()
export class UserRewardService {
    private readonly logger = new Logger(UserRewardService.name);

    private readonly STREAK_REWARDS = [10, 15, 40, 10, 15, 15, 30] as const;
    private readonly PREMIUM_STREAK_REWARDS = [
        100, 100, 100, 100, 100, 100, 100,
    ] as const;
    private readonly AD_REWARD_COINS = 10;
    private readonly MAX_AD_VIEWS_COIN_PER_DAY = 5;
    private readonly MAX_AD_VIEWS_UNLOCK_PER_DAY = 5;

    constructor(
        @InjectRepository(UserDailyAction)
        private readonly userDailyActionRepo: Repository<UserDailyAction>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly dataSource: DataSource,
        private readonly userCoinService: UserCoinService,
        private readonly userSubscriptionService: UserSubscriptionService,
        @Inject(forwardRef(() => ChapterUnlockService))
        private readonly chapterUnlockService: ChapterUnlockService,
        private readonly userService: UserService,
    ) {}

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

    async recordDailyCheckInAndGrantBonus(userId: string) {
        const todayStr = new Date().toISOString().split('T')[0];

        return this.dataSource.transaction(async (manager) => {
            const repo = manager.getRepository(UserDailyAction);

            await this.userService.getActiveUserOrFail(userId);

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
                const { isSubUser } =
                    await this.userSubscriptionService.getSubscriptionStatus(
                        userId,
                    );

                const { todayBonus, todayPremiumBonus, currentStreak } =
                    await this.calculateLoginStreakAndBonus(userId, isSubUser);

                if (todayBonus !== null && todayBonus > 0) {
                    this.logger.log(
                        `Granting login bonus of ${todayBonus} coins to user ${userId} for login on ${todayStr}`,
                    );

                    await this.userCoinService.addCoins({
                        manager,
                        userId,
                        amount: todayBonus,
                        coinType: CoinType.TEMPORARY,
                        description: `Daily login streak bonus (day ${currentStreak})`,
                        referenceType: CoinReferenceType.LOGIN,
                    });
                }

                if (todayPremiumBonus !== null && todayPremiumBonus > 0) {
                    this.logger.log(
                        `Granting premium login bonus of ${todayPremiumBonus} coins to user ${userId} for login on ${todayStr}`,
                    );

                    await this.userCoinService.addCoins({
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
                const updatedCoins =
                    await this.userCoinService.calculateUserCoins(userId, {
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
            await this.userCoinService.addCoins({
                manager,
                userId,
                amount: this.AD_REWARD_COINS,
                coinType: CoinType.TEMPORARY,
                description: `Ad reward - view #${todayAction.count}`,
                referenceType: CoinReferenceType.WATCH_AD_COIN,
            });

            const updatedCoins = await this.userCoinService.calculateUserCoins(
                userId,
                {
                    manager,
                },
            );

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

            const unlockResult =
                await this.chapterUnlockService.unlockChapterWithAds({
                    userId,
                    chapterId,
                    manager,
                });

            if (!unlockResult.success) {
                return {
                    success: false,
                    message: unlockResult.message,
                    data: {
                        adInfo: {
                            coinsGranted: 0,
                            currentViews: todayAction?.count || 0,
                            maxViews: this.MAX_AD_VIEWS_UNLOCK_PER_DAY,
                        },
                        chapterId: chapterId,
                    },
                };
            }

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

    async getReward(userId: string): Promise<RewardResponseDto> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
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

        const wallet = await this.userCoinService.calculateUserCoins(userId);

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

    async getAdUnlockChapterStatus(userId: string): Promise<AdInfoDto> {
        const today = new Date().toISOString().split('T')[0];

        const unlockAction = await this.userDailyActionRepo.findOne({
            where: {
                userId,
                actionType: ActionType.WATCH_AD_UNLOCK,
                actionDate: today,
            },
        });

        const currentViews = unlockAction?.count ?? 0;

        return {
            coinsGranted: 0,
            currentViews,
            maxViews: this.MAX_AD_VIEWS_UNLOCK_PER_DAY,
        };
    }

    async getAdEarnCoinStatus(userId: string): Promise<AdInfoDto> {
        const today = new Date().toISOString().split('T')[0];

        const coinAction = await this.userDailyActionRepo.findOne({
            where: {
                userId,
                actionType: ActionType.WATCH_AD_COIN,
                actionDate: today,
            },
        });

        const currentViews = coinAction?.count ?? 0;

        return {
            coinsGranted: this.AD_REWARD_COINS,
            currentViews,
            maxViews: this.MAX_AD_VIEWS_COIN_PER_DAY,
        };
    }
}
