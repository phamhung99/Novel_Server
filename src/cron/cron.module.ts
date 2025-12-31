import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
// import { CronController } from './cron.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorySummary } from 'src/story/entities/story-summary.entity';
import { StoryLikes } from 'src/story/entities/story-likes.entity';
import { ChapterViews } from 'src/story/entities/chapter-views.entity';

@Module({
    providers: [CronService],
    exports: [CronService],
    // controllers: [CronController],
    imports: [
        TypeOrmModule.forFeature([StorySummary, StoryLikes, ChapterViews]),
    ],
})
export class CronModule {}
