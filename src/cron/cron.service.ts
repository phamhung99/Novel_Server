import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoryLikes } from '../story/entities/story-likes.entity';
import { ChapterViews } from '../story/entities/chapter-views.entity';
import { Story } from 'src/story/entities/story.entity';
import { ChapterState } from 'src/story/entities/chapter-states.entity';
import { Chapter } from 'src/story/entities/chapter.entity';

@Injectable()
export class CronService {
    private readonly logger = new Logger(CronService.name);

    constructor(
        @InjectRepository(Story)
        private storyRepo: Repository<Story>,

        @InjectRepository(ChapterViews)
        private chapterViewRepo: Repository<ChapterViews>,

        @InjectRepository(StoryLikes)
        private storyLikeRepo: Repository<StoryLikes>,

        @InjectRepository(ChapterState)
        private chapterStateRepo: Repository<ChapterState>,

        @InjectRepository(Chapter)
        private chapterRepo: Repository<Chapter>,
    ) {}

    async updateTrendingScores(): Promise<void> {
        this.logger.log('Starting trending_score update for all stories...');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        try {
            const cvTable = this.chapterViewRepo.metadata.tablePath;
            const slTable = this.storyLikeRepo.metadata.tablePath;
            const csTable = this.chapterStateRepo.metadata.tablePath;
            const chTable = this.chapterRepo.metadata.tablePath;
            const storyTable = this.storyRepo.metadata.tablePath;

            await this.storyRepo.query(
                `
                    -- Define time reference for filtering recent activity
                    WITH recent AS (
                        SELECT $1::timestamptz AS start_date
                    ),

                    -- 1. Chapter 2 views (0.2 points per view)
                    -- Indicates initial engagement beyond first chapter
                    chapter2_views AS (
                        SELECT 
                            cv.story_id,
                            COUNT(*) * 0.2 AS chapter2_view_score
                        FROM ${cvTable} cv
                        INNER JOIN ${chTable} ch ON cv.chapter_id = ch.id
                        WHERE ch.index = 2
                            AND cv.viewed_at >= (SELECT start_date FROM recent)
                        GROUP BY cv.story_id
                    ),

                    -- 2. Deep chapter views (chapter >= 3, 1.0 point per view)
                    -- Indicates sustained reader interest and deep reading
                    deep_chapter_views AS (
                        SELECT 
                            cv.story_id,
                            COUNT(*) * 1.0 AS deep_chapter_view_score
                        FROM ${cvTable} cv
                        INNER JOIN ${chTable} ch ON cv.chapter_id = ch.id
                        WHERE ch.index >= 3
                            AND cv.viewed_at >= (SELECT start_date FROM recent)
                        GROUP BY cv.story_id
                    ),

                    -- 3. Library additions (3 points per add)
                    -- Shows strong interest - users want to track/save the story
                    library_adds AS (
                        SELECT 
                        sl.story_id AS story_id,
                        COUNT(*) * 3 AS library_add_score
                        FROM ${slTable} sl
                        WHERE sl.created_at >= (SELECT start_date FROM recent)
                        GROUP BY sl.story_id
                    ),

                    -- 4. User chapter unlocks grouped by story
                    -- First, count how many chapters each user unlocked per story
                    user_unlocks AS (
                        SELECT 
                        ch.story_id,
                        cs.user_id,
                        COUNT(DISTINCT cs.chapter_id) AS unlocked_count
                        FROM ${csTable} cs
                        INNER JOIN ${chTable} ch ON cs.chapter_id = ch.id
                        WHERE cs.unlocked_at >= (SELECT start_date FROM recent)
                        GROUP BY ch.story_id, cs.user_id
                    ),

                    -- Calculate unlock engagement scores with multipliers
                    -- 1-2 unlocks: 5 points (testing engagement)
                    -- 3+ unlocks: 7 points (committed reader, willing to pay)
                    unlock_scores AS (
                        SELECT 
                        story_id,
                        SUM(
                            CASE 
                            WHEN unlocked_count BETWEEN 1 AND 2 THEN 5
                            WHEN unlocked_count >= 3 THEN 7
                            ELSE 0
                            END
                        ) AS unlock_engagement_score
                        FROM user_unlocks
                        GROUP BY story_id
                    ),

                    aggregated_scores AS (
                        SELECT 
                        s.id AS story_id,
                        COALESCE(c2.chapter2_view_score, 0) +
                        COALESCE(dcv.deep_chapter_view_score, 0) +
                        COALESCE(la.library_add_score, 0) +
                        COALESCE(us.unlock_engagement_score, 0) AS trending_score
                        FROM ${storyTable} s
                        LEFT JOIN chapter2_views c2 ON s.id = c2.story_id
                        LEFT JOIN deep_chapter_views dcv ON s.id = dcv.story_id
                        LEFT JOIN library_adds la ON s.id = la.story_id
                        LEFT JOIN unlock_scores us ON s.id = us.story_id
                    )

                    UPDATE ${storyTable} s
                    SET trending_score = ags.trending_score
                    FROM aggregated_scores ags
                    WHERE s.id = ags.story_id
                        AND s.deleted_at IS NULL;
                `,
                [thirtyDaysAgo],
            );

            this.logger.log('Successfully completed trending_score update');
        } catch (error) {
            this.logger.error('Error updating trending_score', error);
            this.logger.debug('SQL executed with params:', [thirtyDaysAgo]);
            throw error;
        }
    }

    async updateSearchScores(): Promise<void> {
        this.logger.log(
            'Starting bulk search score calculation for all stories...',
        );

        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);

        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(now.getDate() - 14);

        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(now.getDate() - 90);

        try {
            // Lấy tất cả story đang active + chapter đầu tiên (tránh N+1 bằng left join)
            const storiesWithFirstChapter = await this.storyRepo
                .createQueryBuilder('s')
                .leftJoinAndSelect('s.chapters', 'c', 'c.index = 1')
                .where('s.deletedAt IS NULL')
                .select(['s.id AS "storyId"', 'c.id AS "firstChapterId"'])
                .getRawMany<{
                    storyId: string;
                    firstChapterId: string | null;
                }>();

            if (storiesWithFirstChapter.length === 0) {
                this.logger.log('No active stories found.');
                return;
            }

            const validStories = storiesWithFirstChapter.filter(
                (s) => s.firstChapterId !== null,
            );

            if (validStories.length === 0) {
                this.logger.log('No stories with chapter 1 found.');
                return;
            }

            this.logger.log(
                `Processing ${validStories.length} stories in bulk...`,
            );

            // Lấy TẤT CẢ chapter views cần thiết một lần (lọc từ 90 ngày trước để bao quát tất cả)
            const allRelevantViews = await this.chapterViewRepo
                .createQueryBuilder('cv')
                .innerJoin('cv.chapter', 'ch')
                .where('cv.story_id IN (:...storyIds)', {
                    storyIds: validStories.map((s) => s.storyId),
                })
                .andWhere('cv.viewedAt >= :ninetyDaysAgo', { ninetyDaysAgo })
                .select([
                    'cv.story_id AS "storyId"',
                    'cv.user_id AS "userId"',
                    'cv.viewedAt AS "viewedAt"',
                    'ch.index AS "chapterIndex"',
                ])
                .orderBy('cv.story_id', 'ASC')
                .addOrderBy('cv.user_id', 'ASC')
                .addOrderBy('cv.viewedAt', 'ASC')
                .getRawMany<{
                    storyId: string;
                    userId: string;
                    viewedAt: Date;
                    chapterIndex: number;
                }>();

            console.log(validStories);

            // Group theo story → user → list views (sorted by time)
            const viewsByStoryAndUser = new Map<
                string,
                Map<string, { viewedAt: Date; chapterIndex: number }[]>
            >();

            for (const view of allRelevantViews) {
                const storyKey = view.storyId;
                if (!viewsByStoryAndUser.has(storyKey)) {
                    viewsByStoryAndUser.set(storyKey, new Map());
                }
                const userMap = viewsByStoryAndUser.get(storyKey)!;
                if (!userMap.has(view.userId)) {
                    userMap.set(view.userId, []);
                }
                userMap.get(view.userId)!.push({
                    viewedAt: view.viewedAt,
                    chapterIndex: view.chapterIndex,
                });
            }

            // Tính score cho từng story in-memory
            const scoreUpdates: { id: string; searchScore: number }[] = [];

            for (const { storyId } of validStories) {
                const userViews = viewsByStoryAndUser.get(storyId) || new Map();

                let earlyRetention14dCount = 0;
                let deepRetention7dCount = 0;
                let earlyRetention90dCount = 0;
                let countRecentEarly = 0;
                let countDeep = 0;
                let countLongTermEarly = 0;

                for (const [userId, views] of userViews) {
                    // views đã sort theo thời gian
                    const firstChapterViews = views.filter(
                        (v) => v.chapterIndex === 1,
                    );
                    if (firstChapterViews.length === 0) continue;

                    const firstChapter1Time = firstChapterViews[0].viewedAt;

                    // Early retention 14 ngày
                    if (
                        firstChapter1Time >= fourteenDaysAgo &&
                        firstChapter1Time <= now
                    ) {
                        countRecentEarly++;
                        const continued = views.some(
                            (v) =>
                                v.chapterIndex > 1 &&
                                v.viewedAt <=
                                    new Date(
                                        firstChapter1Time.getTime() +
                                            7 * 24 * 60 * 60 * 1000,
                                    ),
                        );
                        if (continued) earlyRetention14dCount++;
                    }

                    // Deep retention 7 ngày
                    if (
                        firstChapter1Time >= sevenDaysAgo &&
                        firstChapter1Time <= now
                    ) {
                        countDeep++;
                        const reachedCh5 = views.some(
                            (v) => v.chapterIndex >= 5,
                        );
                        if (reachedCh5) deepRetention7dCount++;
                    }

                    // Long-term early 90 ngày
                    if (
                        firstChapter1Time >= ninetyDaysAgo &&
                        firstChapter1Time <= now
                    ) {
                        countLongTermEarly++;
                        const continued = views.some(
                            (v) =>
                                v.chapterIndex > 1 &&
                                v.viewedAt <=
                                    new Date(
                                        firstChapter1Time.getTime() +
                                            7 * 24 * 60 * 60 * 1000,
                                    ),
                        );
                        if (continued) earlyRetention90dCount++;
                    }
                }

                // Tính phần trăm
                const er14 =
                    countRecentEarly > 0
                        ? (earlyRetention14dCount / countRecentEarly) * 100
                        : null;
                const dr7 =
                    countDeep > 0
                        ? (deepRetention7dCount / countDeep) * 100
                        : null;
                const er90 =
                    countLongTermEarly > 0
                        ? (earlyRetention90dCount / countLongTermEarly) * 100
                        : null;

                // Logic tính final score giống bản gốc
                let finalScore = 0;

                const hasRecentEarly = er14 !== null && er14 >= 0;
                const hasDeep = dr7 !== null && dr7 >= 0;
                const hasLongTerm = er90 !== null && er90 >= 0;

                if (hasRecentEarly && hasDeep) {
                    finalScore = ((er14! + dr7!) / 2) * 1.3;
                } else if (hasRecentEarly) {
                    finalScore = er14!;
                } else if (hasDeep) {
                    finalScore = dr7!;
                } else if (hasLongTerm) {
                    finalScore = er90!;
                }

                finalScore = Math.min(finalScore, 100);

                scoreUpdates.push({
                    id: storyId,
                    searchScore: Number(finalScore.toFixed(3)),
                });
            }

            // Bulk update bằng .save() với chunk để tránh N+1 và tối ưu memory/transaction
            if (scoreUpdates.length > 0) {
                const ids = scoreUpdates.map((u) => u.id);
                const scores = scoreUpdates.map((u) => u.searchScore);

                await this.storyRepo.manager.query(
                    `
                        UPDATE comic."story" AS s
                        SET "search_score" = v.score
                        FROM unnest($1::uuid[], $2::numeric[]) AS v(id, score)
                        WHERE s.id = v.id
                    `,
                    [ids, scores],
                );

                this.logger.log(
                    `Updated search scores for ${scoreUpdates.length} stories`,
                );
            }
        } catch (error) {
            this.logger.error('Bulk search score update failed', error);
            throw error;
        }
    }

    async runAllScheduledTasks() {
        // await this.updateTrendingScores();
        await this.updateSearchScores();
    }
}
