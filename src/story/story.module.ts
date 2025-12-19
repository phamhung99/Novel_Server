import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { Story } from './entities/story.entity';
import { Chapter } from './entities/chapter.entity';
import { StoryGeneration } from './entities/story-generation.entity';
import { ChapterGeneration } from './entities/chapter-generation.entity';
import { AiModule } from '../ai/ai.module';
import { StoryViews } from './entities/story-views.entity';
import { StorySummary } from './entities/story-summary.entity';
import { UserModule } from 'src/user/user.module';
import { Category } from './entities/categories.entity';
import { DoSpacesService } from 'src/upload/do-spaces.service';
import { ChapterService } from './chapter.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Story,
            Chapter,
            StoryGeneration,
            ChapterGeneration,
            StoryViews,
            StorySummary,
            Category,
        ]),
        AiModule,
        forwardRef(() => UserModule),
    ],
    controllers: [StoryController],
    providers: [StoryService, DoSpacesService, ChapterService],
    exports: [StoryService, ChapterService],
})
export class StoryModule {}
