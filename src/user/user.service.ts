import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { UserCategoryPreference } from './entities/user-category-preference.entity';
import {
    DEFAULT_PROFILE_IMAGE_URL,
    ERROR_MESSAGES,
} from 'src/common/constants/app.constant';
import { ReadingHistory } from './entities/reading-history.entity';
import { StoryStatus } from 'src/common/enums/story-status.enum';
import { MediaService } from 'src/media/media.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedStoryPreviewResponse } from 'src/story/dto/paginated-story-preview.response';
import { enrichStoriesToPreviewDto } from 'src/common/mappers/story-preview.mapper';
import { Chapter } from 'src/story/entities/chapter.entity';
import { UserCoinService } from './user-coin.service';
import { UserSubscriptionService } from './user-subscription.service';
import { UserRewardService } from './user-reward.service';
import { parseQueryOptions } from 'src/common/utils/parse-query-options.util';

export interface FindAllOptions {
    page: number;
    limit: number;
    filter?: string;
    sort?: string;
    fields?: string;
    searchField?: string;
    searchValue?: string;
}

export interface PaginatedUsersResult {
    users: any[];
    total: number;
}

@Injectable()
export class UserService extends BaseCrudService<User> {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(User) userRepo: Repository<User>,
        @InjectRepository(UserCategoryPreference)
        private readonly userCategoryPreferenceRepo: Repository<UserCategoryPreference>,
        private readonly dataSource: DataSource,
        private readonly mediaService: MediaService,
        private readonly userCoinService: UserCoinService,
        private readonly userSubscriptionService: UserSubscriptionService,
        private readonly userRewardService: UserRewardService,
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
        const number = Math.floor(Math.random() * 9000) + 1000;

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

    async getActiveUserOrFail(userId: string): Promise<User> {
        if (!userId) {
            throw new BadRequestException('User ID is required');
        }

        const user = await this.repository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if (user.deletedAt) {
            throw new NotFoundException(ERROR_MESSAGES.USER_IS_DELETED);
        }

        return user;
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

        const isNewUser = !user;

        if (isNewUser) {
            const randomUsername = this.generateRandomUsername();

            user = this.repository.create({
                id: userId,
                username: randomUsername,
                country: language,
                platform: platform,
            });

            await this.repository.save(user);

            await this.userRewardService.recordDailyCheckInAndGrantBonus(
                user.id,
            );
        }
        return user;
    }

    async findAllWithPagination(
        options: FindAllOptions,
    ): Promise<PaginatedUsersResult> {
        const validKeys: (keyof User)[] = [
            'id',
            'country',
            'ipCountryCode',
            'username',
            'email',
            'profileImage',
            'deletedAt',
            'createdAt',
            'updatedAt',
        ];

        const queryOptions = parseQueryOptions<User>(
            {
                filter: options.filter,
                sort: options.sort,
                fields: options.fields,
                page: options.page,
                limit: options.limit,
                searchField: options.searchField,
                searchValue: options.searchValue,
            },
            validKeys,
        );

        const { data, total } = await this.findAndCount(queryOptions);

        const transformedUsers = data.map((user) => {
            const profileImage = this.mediaService.getMediaUrl(
                user.profileImage,
            );

            return { ...user, profileImage };
        });

        return { users: transformedUsers, total };
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
                    category: { id: true, name: true, displayOrder: true },
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
    }

    async getRecentStories(
        userId: string,
        { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
    ): Promise<PaginatedStoryPreviewResponse> {
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
                    's.canEdit AS "canEdit"',
                    's.isCompleted AS "isCompleted"',
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

        const [coinsData, subscriptionData] = await Promise.all([
            this.userCoinService.calculateUserCoins(user.id),
            this.userSubscriptionService.getSubscriptionStatus(user.id),
        ]);

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
}
