import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryLikes } from 'src/story/entities/story-likes.entity';
import { ChapterViews } from 'src/story/entities/chapter-views.entity';
import { Story } from 'src/story/entities/story.entity';
import { ChapterState } from 'src/story/entities/chapter-states.entity';
import { Chapter } from 'src/story/entities/chapter.entity';
import { CronController } from './cron.controller';

@Module({
    providers: [CronService],
    exports: [CronService],
    controllers: [CronController],
    imports: [
        TypeOrmModule.forFeature([
            StoryLikes,
            ChapterViews,
            Story,
            ChapterState,
            Chapter,
        ]),
    ],
})
export class CronModule {}
