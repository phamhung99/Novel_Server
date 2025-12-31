import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorySummary } from '../story/entities/story-summary.entity';
import { StoryLikes } from '../story/entities/story-likes.entity';
import { ChapterViews } from '../story/entities/chapter-views.entity';
import { Chapter } from 'src/story/entities/chapter.entity';

@Injectable()
export class CronService {
    private readonly logger = new Logger(CronService.name);

    constructor(
        @InjectRepository(StorySummary)
        private storySummaryRepository: Repository<StorySummary>,
        @InjectRepository(StoryLikes)
        private storyLikesRepository: Repository<StoryLikes>,
        @InjectRepository(ChapterViews)
        private chapterViewsRepository: Repository<ChapterViews>,
    ) {}

    async runAllScheduledTasks() {
        await this.updateStorySummary();
    }

    async updateStorySummary() {
        this.logger.log('Starting story summary update...');

        try {
            const ss = this.storySummaryRepository.metadata.tablePath;
            // const sl = this.storyLikesRepository.metadata.tablePath;
            const cv = this.chapterViewsRepository.metadata.tablePath;
            const chapter =
                this.storySummaryRepository.manager.getRepository(Chapter)
                    .metadata.tablePath;

            await this.storySummaryRepository
                .createQueryBuilder()
                .update(StorySummary)
                .set({
                    //     likesCount: () => `
                    //     COALESCE((
                    //         SELECT COUNT(*)
                    //         FROM ${sl} sl
                    //         WHERE sl.story_id = ${ss}.story_id
                    //     ), 0)
                    // `,
                    //     viewsCount: () => `
                    //     COALESCE((
                    //         SELECT COUNT(*)
                    //         FROM ${cv} cv
                    //         INNER JOIN ${chapter} c ON cv.chapter_id = c.id
                    //         WHERE c.story_id = ${ss}.story_id
                    //     ), 0)
                    // `,
                    viewsLast60Days: () => `
                    COALESCE((
                        SELECT COUNT(*)
                        FROM ${cv} cv
                        INNER JOIN ${chapter} c ON cv.chapter_id = c.id
                        WHERE c.story_id = ${ss}.story_id
                          AND cv.viewed_at >= NOW() - INTERVAL '60 days'
                    ), 0)
                `,
                })
                .execute();

            this.logger.log('Story summary update completed successfully');
        } catch (error) {
            this.logger.error('Error updating story summary', error);
            throw error;
        }
    }
}
