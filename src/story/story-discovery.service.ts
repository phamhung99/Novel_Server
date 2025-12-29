import { BadRequestException, Injectable } from '@nestjs/common';
import { Brackets, DataSource, Repository } from 'typeorm';
import { DiscoverStoriesDto } from './dto/discover-stories.dto';
import {
    LibraryType,
    StorySort,
    StoryStatusFilter,
} from 'src/common/enums/app.enum';
import { StoryVisibility } from 'src/common/enums/story-visibility.enum';
import { StoryStatus } from 'src/common/enums/story-status.enum';
import { Category } from './entities/categories.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Story } from './entities/story.entity';
import { Chapter } from './entities/chapter.entity';

@Injectable()
export class StoryDiscoveryService {
    constructor(
        private dataSource: DataSource,
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>,
    ) {}

    async getUserLibrary(
        userId: string,
        type: LibraryType,
        { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
    ) {
        const offset = (page - 1) * limit;

        // ===== Query chính (story-level, giống getRecentStories) =====
        const qb = this.dataSource
            .getRepository(Story)
            .createQueryBuilder('s')
            .leftJoin('s.author', 'a')
            .leftJoin('s.likes', 'likes', 'likes.userId = :userId', { userId })
            .leftJoin('s.generation', 'generation')
            .leftJoin('story_summary', 'ss', 'ss.story_id = s.id')
            .leftJoin('s.storyCategories', 'sc')
            .leftJoin('sc.category', 'cat')
            .leftJoin(
                'reading_history',
                'rh',
                'rh.story_id = s.id AND rh.user_id = :userId',
                { userId },
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

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) AS "categories"`,

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name))
                FILTER (WHERE sc.isMainCategory = true) -> 0 AS "mainCategory"`,

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
            .groupBy(
                's.id, a.id, likes.id, ss.likes_count, ss.views_count, generation.prompt,  rh.lastReadAt, rh.lastReadChapter',
            );

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

        // ===== Query chapters riêng (giống hệt getRecentStories) =====
        const storyIds = stories.map((s) => s.storyId);

        let chaptersMap: Record<string, any[]> = {};

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

        const items = stories.map((story) => ({
            ...story,
            chapters: chaptersMap[story.storyId] || [],
            lastReadAt: story.lastReadAt || null,
            lastReadChapter: story.lastReadChapter || null,
            canEdit: story.authorId === userId,
        }));

        return { page, limit, total, items };
    }

    async getTopTrending(
        userId: string,
        { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
    ) {
        const offset = (page - 1) * limit;

        // Query chính: lấy top story theo views_count giảm dần từ story_summary
        const qb = this.dataSource
            .getRepository(Story)
            .createQueryBuilder('s')
            .leftJoin('s.author', 'a')
            .leftJoin('s.likes', 'likes', 'likes.userId = :userId', { userId })
            .leftJoin('s.generation', 'generation')
            .innerJoin('story_summary', 'ss', 'ss.story_id = s.id')
            .leftJoin('s.storyCategories', 'sc')
            .leftJoin('sc.category', 'cat')
            .leftJoin(
                'reading_history',
                'rh',
                'rh.story_id = s.id AND rh.user_id = :userId',
                { userId },
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

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) AS "categories"`,

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name))
            FILTER (WHERE sc.isMainCategory = true) -> 0 AS "mainCategory"`,

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
            .where('s.visibility = :visibility', {
                visibility: StoryVisibility.PUBLIC,
            })
            .andWhere('s.status = :status', { status: StoryStatus.PUBLISHED })
            .groupBy(
                's.id, a.id, likes.id, ss.likes_count, ss.views_count, generation.prompt, rh.lastReadAt, rh.lastReadChapter, ss.views_last_60_days',
            )
            .orderBy('ss.views_last_60_days', 'DESC')
            .addOrderBy('ss.likes_count', 'DESC')
            .addOrderBy('s.updatedAt', 'DESC')
            .offset(offset)
            .limit(limit);

        const stories = await qb.getRawMany();
        const total = await qb.offset(0).limit(undefined).getCount();

        // Lấy chapters giống như trong getUserLibrary
        const storyIds = stories.map((s) => s.storyId);
        let chaptersMap: Record<string, any[]> = {};

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

        const items = stories.map((story) => ({
            ...story,
            chapters: chaptersMap[story.storyId] || [],
            lastReadAt: story.lastReadAt || null,
            lastReadChapter: story.lastReadChapter || null,
            canEdit: story.authorId === userId,
        }));

        return { page, limit, total, items };
    }

    async getTopTrendingByCategory(
        userId: string,
        categoryId: string,
        { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
    ) {
        const offset = (page - 1) * limit;

        const qb = this.dataSource
            .getRepository(Story)
            .createQueryBuilder('s')
            .leftJoin('s.author', 'a')
            .leftJoin('s.likes', 'likes', 'likes.userId = :userId', { userId })
            .leftJoin('s.generation', 'generation')
            .innerJoin('story_summary', 'ss', 'ss.story_id = s.id')

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

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) AS "categories"`,

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name))
             FILTER (WHERE sc.is_main_category = true) 
             -> 0 AS "mainCategory"`,

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
            .where('s.visibility = :visibility', {
                visibility: StoryVisibility.PUBLIC,
            })
            .andWhere('s.status = :status', { status: StoryStatus.PUBLISHED })
            .groupBy(
                's.id, a.id, likes.id, ss.likes_count, ss.views_count, generation.prompt, rh.lastReadAt, rh.lastReadChapter, ss.views_last_60_days',
            )
            .orderBy('ss.views_last_60_days', 'DESC')
            .addOrderBy('ss.likes_count', 'DESC')
            .addOrderBy('s.updatedAt', 'DESC')
            .offset(offset)
            .limit(limit)
            .setParameters({ userId, categoryId });

        const stories = await qb.getRawMany();

        const total = await qb.offset(0).limit(undefined).getCount();

        const storyIds = stories.map((s) => s.storyId);
        let chaptersMap: Record<string, any[]> = {};

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

        const items = stories.map((story) => ({
            ...story,
            chapters: chaptersMap[story.storyId] || [],
            lastReadAt: story.lastReadAt || null,
            lastReadChapter: story.lastReadChapter || null,
            canEdit: story.authorId === userId,
        }));

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
            page = 1,
            limit = 20,
        }: DiscoverStoriesDto,
    ) {
        const offset = (page - 1) * limit;

        // Subquery đếm chính xác số chapter của từng story
        const chapterCountSubQuery = this.dataSource
            .getRepository(Chapter)
            .createQueryBuilder('ch')
            .select('ch.story_id', 'story_id')
            .addSelect('COUNT(ch.id)', 'chapter_count')
            .groupBy('ch.story_id');

        const qb = this.dataSource
            .getRepository(Story)
            .createQueryBuilder('s')
            .leftJoin('s.author', 'a')
            .leftJoin('s.likes', 'likes', 'likes.userId = :userId', { userId })
            .leftJoin('s.generation', 'generation')
            .leftJoin('story_summary', 'ss', 'ss.story_id = s.id')

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
                `(${chapterCountSubQuery.getQuery()})`,
                'chapcnt',
                'chapcnt.story_id = s.id',
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

                'ss.likes_count AS "likesCount"',
                'ss.views_count AS "viewsCount"',

                // Số chapter thực tế
                'COALESCE(chapcnt.chapter_count::integer, 0) AS "chapterCount"',

                // isCompleted chính xác
                '(COALESCE(chapcnt.chapter_count::integer, 0) = COALESCE((generation.prompt ->> \'numberOfChapters\')::int, 0)) AS "isCompleted"',
            ])
            .where('s.visibility = :visibility', {
                visibility: StoryVisibility.PUBLIC,
            })
            .andWhere('s.status = :status', { status: StoryStatus.PUBLISHED });

        // === Keyword search
        if (keyword && keyword.trim()) {
            const searchTerm = `%${keyword.trim()}%`;
            qb.andWhere(
                new Brackets((sqb) => {
                    sqb.where('LOWER(s.title) LIKE LOWER(:searchTerm)');
                }),
                { searchTerm },
            );
        }

        if (minchapters !== undefined && minchapters > 0) {
            qb.andWhere(
                'COALESCE(chapcnt.chapter_count::integer, 0) >= :minchapters',
                { minchapters },
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
                "COALESCE(chapcnt.chapter_count::integer, 0) = COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)",
            );
        } else if (status === StoryStatusFilter.ONGOING) {
            qb.andWhere(
                "COALESCE(chapcnt.chapter_count::integer, 0) < COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)",
            );
        }

        // === Sorting ===
        switch (sort) {
            case StorySort.POPULAR:
                qb.orderBy('ss.views_last_60_days', 'DESC')
                    .addOrderBy('ss.likes_count', 'DESC')
                    .addOrderBy('s.updatedAt', 'DESC');
                break;
            case StorySort.RECENTLY_UPDATED:
                qb.orderBy('s.updatedAt', 'DESC');
                break;
            case StorySort.RECENTLY_ADDED:
                qb.orderBy('s.createdAt', 'DESC');
                break;
            case StorySort.RELEASE_DATE:
                // sort theo ngày phê duyệt xuất bản
                qb.orderBy('s.approvedAt', 'DESC');
                break;
            default:
                qb.orderBy('ss.views_last_60_days', 'DESC');
        }

        qb.groupBy('s.id')
            .addGroupBy('a.id')
            .addGroupBy('likes.id')
            .addGroupBy('ss.likes_count')
            .addGroupBy('ss.views_count')
            .addGroupBy('ss.views_last_60_days')
            .addGroupBy('generation.prompt')
            .addGroupBy('rh.lastReadAt')
            .addGroupBy('rh.lastReadChapter')
            .addGroupBy('main_cat.id')
            .addGroupBy('main_cat.name')
            .addGroupBy('chapcnt.chapter_count')

            .offset(offset)
            .limit(limit)
            .setParameter('userId', userId);

        const stories = await qb.getRawMany();

        const total =
            stories.length > 0
                ? await qb.offset(0).limit(undefined).getCount()
                : 0;

        const storyIds = stories.map((s) => s.storyId);
        let chaptersMap: Record<string, any[]> = {};

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

        const items = stories.map((story) => ({
            ...story,
            chapters: chaptersMap[story.storyId] || [],
            lastReadAt: story.lastReadAt || null,
            lastReadChapter: story.lastReadChapter || null,
            canEdit: story.authorId === userId,
        }));

        return {
            page,
            limit,
            total,
            items,
        };
    }
}
