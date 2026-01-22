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
        this.logger.log('Bắt đầu cập nhật trending_score cho tất cả truyện...');

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
    async runAllScheduledTasks() {
        await this.updateTrendingScores();
    }
}
