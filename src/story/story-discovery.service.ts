import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DiscoverStoriesDto } from './dto/discover-stories.dto';
import {
    LibraryType,
    PublishedWithin,
    StorySort,
    StoryStatusFilter,
} from 'src/common/enums/app.enum';
import { StoryVisibility } from 'src/common/enums/story-visibility.enum';
import { StoryStatus } from 'src/common/enums/story-status.enum';
import { Category } from './entities/categories.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Story } from './entities/story.entity';
import { Chapter } from './entities/chapter.entity';
import { ChapterViews } from './entities/chapter-views.entity';
import { MediaService } from 'src/media/media.service';
import { PaginatedStoryPreviewResponse } from './dto/paginated-story-preview.response';
import { enrichStoriesToPreviewDto } from 'src/common/mappers/story-preview.mapper';

@Injectable()
export class StoryDiscoveryService {
    constructor(
        private dataSource: DataSource,
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>,
        private mediaService: MediaService,
        @InjectRepository(Story)
        private storyRepository: Repository<Story>,
    ) {}

    async getUserLibrary(
        userId: string,
        type: LibraryType,
        { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
    ): Promise<PaginatedStoryPreviewResponse> {
        const offset = (page - 1) * limit;

        // ===== Query chính (story-level, giống getRecentStories) =====
        const qb = this.dataSource
            .getRepository(Story)
            .createQueryBuilder('s')
            .leftJoin('s.author', 'a')
            .leftJoin('s.likes', 'likes', 'likes.userId = :userId', { userId })
            .leftJoin('s.generation', 'generation')
            .leftJoin('s.storyCategories', 'sc')
            .leftJoin('sc.category', 'cat')
            .leftJoin(
                'reading_history',
                'rh',
                'rh.story_id = s.id AND rh.user_id = :userId',
                { userId },
            )
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
                's.createdAt AS "createdAt"',
                's.updatedAt AS "updatedAt"',
                's.visibility AS "visibility"',
                's.likes_count AS "likesCount"',
                's.views_count AS "viewsCount"',
                's.sourceType AS "sourceType"',
                's.tags AS "hashtags"',

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) AS "categories"`,

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name))
                FILTER (WHERE sc.isMainCategory = true) -> 0 AS "mainCategory"`,

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
            .groupBy('s.id')
            .addGroupBy('a.id')
            .addGroupBy('likes.id')
            .addGroupBy('s.likes_count')
            .addGroupBy('s.views_count')
            .addGroupBy('generation.prompt')
            .addGroupBy('rh.lastReadAt')
            .addGroupBy('rh.lastReadChapter')
            .addGroupBy('ss.chapter_count');

        // ===== Filter theo type =====
        if (type === LibraryType.CREATED) {
            qb.where('s.author_id = :userId', { userId }).orderBy(
                's.created_at',
                'DESC',
            );
        } else if (type === LibraryType.LIKED) {
            qb.innerJoin(
                'story_likes',
                'sl',
                'sl.story_id = s.id AND sl.user_id = :userId',
                { userId },
            )
                .addGroupBy('sl.created_at')
                .orderBy('sl.created_at', 'DESC');
        } else {
            throw new BadRequestException('Invalid library type');
        }

        qb.offset(offset).limit(limit);

        const stories = await qb.getRawMany();
        const total = await qb.getCount();

        const items = await enrichStoriesToPreviewDto(
            stories,
            this.mediaService,
            userId,
        );

        return { page, limit, total, items };
    }

    async getTopTrending(
        userId: string,
        { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
    ): Promise<PaginatedStoryPreviewResponse> {
        const offset = (page - 1) * limit;

        const qb = this.dataSource
            .getRepository(Story)
            .createQueryBuilder('s')
            .leftJoin('s.author', 'a')
            .leftJoin('s.likes', 'likes', 'likes.userId = :userId', { userId })
            .leftJoin('s.generation', 'generation')
            .leftJoin('s.storyCategories', 'sc')
            .leftJoin('sc.category', 'cat')
            .leftJoin(
                'reading_history',
                'rh',
                'rh.story_id = s.id AND rh.user_id = :userId',
                { userId },
            )
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
            .leftJoin(
                (qb) =>
                    qb
                        .select('cv.story_id')
                        .addSelect('COUNT(cv.id)', 'views_count')
                        .from(ChapterViews, 'cv')
                        .where("cv.viewed_at >= NOW() - INTERVAL '60 days'")
                        .groupBy('cv.story_id'),
                'recent_views',
                'recent_views.story_id = s.id',
            )
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
                's.visibility AS "visibility"',
                's.likes_count AS "likesCount"',
                's.views_count AS "viewsCount"',
                's.trendingScore AS "trendingScore"',
                's.tags AS "hashtags"',

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) AS "categories"`,

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name))
            FILTER (WHERE sc.isMainCategory = true) -> 0 AS "mainCategory"`,

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

            .where('s.visibility = :visibility', {
                visibility: StoryVisibility.PUBLIC,
            })
            .andWhere('s.status = :status', { status: StoryStatus.PUBLISHED })
            .groupBy('s.id')
            .addGroupBy('a.id')
            .addGroupBy('likes.id')
            .addGroupBy('s.likes_count')
            .addGroupBy('s.views_count')
            .addGroupBy('generation.prompt')
            .addGroupBy('rh.lastReadAt')
            .addGroupBy('rh.lastReadChapter')
            .addGroupBy('ss.chapter_count')
            .addGroupBy('recent_views.views_count')
            .addOrderBy('s.trendingScore', 'DESC', 'NULLS LAST')
            .addOrderBy('s.updatedAt', 'DESC')
            .offset(offset)
            .limit(limit);

        const stories = await qb.getRawMany();
        const total = await qb.offset(0).limit(undefined).getCount();

        const items = await enrichStoriesToPreviewDto(
            stories,
            this.mediaService,
            userId,
        );

        return { page, limit, total, items };
    }

    async getTopTrendingByCategory(
        userId: string,
        categoryId: string,
        { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
    ): Promise<PaginatedStoryPreviewResponse> {
        const offset = (page - 1) * limit;

        const qb = this.dataSource
            .getRepository(Story)
            .createQueryBuilder('s')
            .leftJoin('s.author', 'a')
            .leftJoin('s.likes', 'likes', 'likes.userId = :userId', { userId })
            .leftJoin('s.generation', 'generation')
            .innerJoin(
                's.storyCategories',
                'main_sc',
                'main_sc.category_id = :categoryId AND main_sc.is_main_category = true',
                { categoryId },
            )

            .leftJoin('s.storyCategories', 'sc')
            .leftJoin('sc.category', 'cat')

            .leftJoin(
                'reading_history',
                'rh',
                'rh.story_id = s.id AND rh.user_id = :userId',
                { userId },
            )
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
            .leftJoin(
                (qb) =>
                    qb
                        .select('cv.story_id')
                        .addSelect('COUNT(cv.id)', 'views_count')
                        .from(ChapterViews, 'cv')
                        .where("cv.viewed_at >= NOW() - INTERVAL '60 days'")
                        .groupBy('cv.story_id'),
                'recent_views',
                'recent_views.story_id = s.id',
            )
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
                's.visibility AS "visibility"',
                's.likes_count AS "likesCount"',
                's.views_count AS "viewsCount"',
                's.trendingScore AS "trendingScore"',
                's.tags AS "hashtags"',

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) AS "categories"`,

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name))
            FILTER (WHERE sc.isMainCategory = true) -> 0 AS "mainCategory"`,

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
            .where('s.visibility = :visibility', {
                visibility: StoryVisibility.PUBLIC,
            })
            .andWhere('s.status = :status', { status: StoryStatus.PUBLISHED })
            .groupBy('s.id')
            .addGroupBy('a.id')
            .addGroupBy('likes.id')
            .addGroupBy('s.likes_count')
            .addGroupBy('s.views_count')
            .addGroupBy('generation.prompt')
            .addGroupBy('rh.lastReadAt')
            .addGroupBy('rh.lastReadChapter')
            .addGroupBy('ss.chapter_count')
            .addGroupBy('recent_views.views_count')
            .addOrderBy('s.trendingScore', 'DESC', 'NULLS LAST')
            .addOrderBy('s.updatedAt', 'DESC')
            .offset(offset)
            .limit(limit)
            .setParameters({ userId, categoryId });

        const stories = await qb.getRawMany();

        const total = await qb.offset(0).limit(undefined).getCount();

        const items = await enrichStoriesToPreviewDto(
            stories,
            this.mediaService,
            userId,
        );

        return { page, limit, total, items };
    }

    async getAllCategories(): Promise<
        Pick<Category, 'id' | 'name' | 'displayOrder' | 'isActive'>[]
    > {
        return this.categoryRepository.find({
            select: {
                id: true,
                name: true,
                displayOrder: true,
            },
            where: {
                isActive: true,
            },
            order: {
                displayOrder: 'ASC',
            },
        });
    }

    async getDiscoverStories(
        userId: string | null,
        {
            keyword,
            categories,
            status,
            sort = StorySort.POPULAR,
            minchapters,
            publishedWithin,
            published_within,
            page = 1,
            limit = 20,
        }: DiscoverStoriesDto,
    ): Promise<PaginatedStoryPreviewResponse> {
        const offset = (page - 1) * limit;

        // Handle deprecated 'published_within' parameter
        if (published_within) {
            publishedWithin = published_within;
        }

        const qb = this.dataSource
            .getRepository(Story)
            .createQueryBuilder('s')
            .leftJoin('s.author', 'a')
            .leftJoin('s.likes', 'likes', 'likes.userId = :userId', { userId })
            .leftJoin('s.generation', 'generation')
            // All categories
            .leftJoin('s.storyCategories', 'sc')
            .leftJoin('sc.category', 'cat')

            // Main category (is_main_category = true)
            .leftJoin(
                's.storyCategories',
                'main_sc',
                'main_sc.story_id = s.id AND main_sc.is_main_category = true',
            )
            .leftJoin('main_sc.category', 'main_cat')

            // Reading history
            .leftJoin(
                'reading_history',
                'rh',
                'rh.story_id = s.id AND rh.user_id = :userId',
                { userId },
            )
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
            .leftJoin(
                (subQb) =>
                    subQb
                        .select('cv.story_id', 'story_id')
                        .addSelect('COUNT(cv.id)', 'views_count')
                        .from(ChapterViews, 'cv')
                        .where("cv.viewed_at >= NOW() - INTERVAL '60 days'")
                        .groupBy('cv.story_id'),
                'recent_views',
                'recent_views.story_id = s.id',
            )

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
                's.visibility AS "visibility"',
                's.tags AS "hashtags"',

                // All categories array
                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) FILTER (WHERE cat.id IS NOT NULL) AS "categories"`,

                // Main category object (or null)
                `jsonb_build_object('id', main_cat.id, 'name', main_cat.name) AS "mainCategory"`,

                'a.id AS "authorId"',
                'a.username AS "authorUsername"',
                'a.profileImage AS "profileImage"',

                'rh.lastReadAt AS "lastReadAt"',
                'rh.lastReadChapter AS "lastReadChapter"',

                'CASE WHEN likes.id IS NULL THEN false ELSE true END AS "isLike"',

                's.likes_count AS "likesCount"',
                's.views_count AS "viewsCount"',

                'ss.chapter_count AS "chapterCount"',

                `(
                    COALESCE(ss.chapter_count, 0) >= 
                    COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)
                ) AS "isCompleted"`,
            ])
            .where('s.visibility = :visibility', {
                visibility: StoryVisibility.PUBLIC,
            })
            .andWhere('s.status = :status', { status: StoryStatus.PUBLISHED });

        // === Keyword search
        if (keyword && keyword.trim()) {
            const searchTerm = `${keyword.trim().toLowerCase()}%`;

            qb.andWhere('LOWER(s.title) LIKE :searchTerm', { searchTerm });
        }

        let chapterFilterValue: number | undefined = undefined;
        let chapterFilterOperator: string | undefined = undefined;

        if (minchapters && minchapters.toLowerCase() !== 'all') {
            const value = Number(minchapters);

            if (!isNaN(value)) {
                chapterFilterValue = Math.abs(value); // lấy giá trị tuyệt đối để query

                if (value > 0) {
                    // dương → >= (ít nhất)
                    chapterFilterOperator = '>=';
                } else if (value < 0) {
                    // âm → < (ít hơn)
                    chapterFilterOperator = '<';
                }
            }
        }

        if (chapterFilterValue !== undefined && chapterFilterOperator) {
            qb.andWhere(
                `COALESCE(ss.chapter_count, 0) ${chapterFilterOperator} :chapterFilterValue`,
                { chapterFilterValue },
            );
        }

        // === Multi categories filter ===
        if (categories && categories !== 'all') {
            const categoryIds = categories
                .split(',')
                .map((id) => id.trim())
                .filter(Boolean);

            if (categoryIds.length > 0) {
                qb.andWhere('cat.id IN (:...categoryIds)', { categoryIds });
            }
        }

        // === Status filter: completed / ongoing ===
        if (status === StoryStatusFilter.COMPLETED) {
            qb.andWhere(
                `COALESCE(ss.chapter_count, 0) = COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)`,
            );
        } else if (status === StoryStatusFilter.ONGOING) {
            qb.andWhere(
                `COALESCE(ss.chapter_count, 0) < COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)`,
            );
        }

        // === Sorting ===
        switch (sort) {
            case StorySort.POPULAR:
                qb.orderBy('recent_views.views_count', 'DESC', 'NULLS LAST')
                    .addOrderBy('s.likes_count', 'DESC', 'NULLS LAST')
                    .addOrderBy('s.updatedAt', 'DESC');
                break;
            case StorySort.RECENTLY_UPDATED:
                qb.orderBy('s.updatedAt', 'DESC');

                if (
                    publishedWithin &&
                    publishedWithin !== PublishedWithin.ALL
                ) {
                    if (publishedWithin === PublishedWithin.DAYS_400) {
                        qb.andWhere(
                            `s.updatedAt < NOW() - INTERVAL '365 days'`,
                        );
                    } else {
                        const days = Number(publishedWithin);

                        if (!isNaN(days) && days > 0) {
                            qb.andWhere(
                                's.updatedAt >= NOW() - INTERVAL :days DAY',
                                {
                                    days,
                                },
                            );
                        }
                    }
                }
                break;
            case StorySort.RECENTLY_ADDED:
                qb.orderBy('s.createdAt', 'DESC');
                break;
            case StorySort.RELEASE_DATE:
                qb.orderBy('s.approvedAt', 'DESC');

                if (
                    publishedWithin &&
                    publishedWithin !== PublishedWithin.ALL
                ) {
                    if (publishedWithin === PublishedWithin.DAYS_400) {
                        qb.andWhere(
                            `s.approvedAt < NOW() - INTERVAL '365 days'`,
                        );
                    } else {
                        const days = Number(publishedWithin);

                        if (!isNaN(days) && days > 0) {
                            qb.andWhere(
                                's.approvedAt >= NOW() - INTERVAL :days DAY',
                                {
                                    days,
                                },
                            );
                        }
                    }
                }
                break;
            default:
                qb.orderBy('recent_views.views_count', 'DESC', 'NULLS LAST')
                    .addOrderBy('s.likes_count', 'DESC', 'NULLS LAST')
                    .addOrderBy('s.updatedAt', 'DESC');
        }

        qb.groupBy('s.id')
            .addGroupBy('a.id')
            .addGroupBy('likes.id')
            .addGroupBy('s.likes_count')
            .addGroupBy('s.views_count')
            .addGroupBy('recent_views.views_count')
            .addGroupBy('generation.prompt')
            .addGroupBy('rh.lastReadAt')
            .addGroupBy('rh.lastReadChapter')
            .addGroupBy('ss.chapter_count')
            .addGroupBy('main_cat.id')
            .addGroupBy('main_cat.name')
            .addGroupBy('ss.chapter_count')

            .offset(offset)
            .limit(limit)
            .setParameter('userId', userId);

        const stories = await qb.getRawMany();

        const total =
            stories.length > 0
                ? await qb.offset(0).limit(undefined).getCount()
                : 0;

        const items = await enrichStoriesToPreviewDto(
            stories,
            this.mediaService,
            userId,
        );

        return {
            page,
            limit,
            total,
            items,
        };
    }

    async getTopTrendingKeywords(limit = 5): Promise<{ keyword: string }[]> {
        const topTrendingStories = await this.storyRepository
            .createQueryBuilder('s')
            .select(['s."id"'])
            .where('s.visibility = :visibility', {
                visibility: StoryVisibility.PUBLIC,
            })
            .andWhere('s.status = :status', {
                status: StoryStatus.PUBLISHED,
            })
            .orderBy('s.trending_score', 'DESC')
            .limit(3)
            .getRawMany();

        const excludeIds = topTrendingStories.map((row) => row.id);

        const qb = this.storyRepository
            .createQueryBuilder('s')
            .select(['s.title AS keyword', 's.search_score AS score'])
            .where('s.search_score IS NOT NULL')
            .andWhere('s.search_score > 0')
            .andWhere('s.visibility = :visibility', {
                visibility: StoryVisibility.PUBLIC,
            })
            .andWhere('s.status = :status', {
                status: StoryStatus.PUBLISHED,
            });

        if (excludeIds.length > 0) {
            qb.andWhere('s.id NOT IN (:...excludeIds)', { excludeIds });
        }

        const result = await qb
            .orderBy('s.search_score', 'DESC')
            .limit(limit)
            .getRawMany();

        return result.map((row) => ({
            keyword: (row.keyword || '').trim(),
        }));
    }
}
