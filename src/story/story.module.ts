import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { Story } from './entities/story.entity';
import { Chapter } from './entities/chapter.entity';
import { StoryGeneration } from './entities/story-generation.entity';
import { ChapterGeneration } from './entities/chapter-generation.entity';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Story,
            Chapter,
            StoryGeneration,
            ChapterGeneration,
        ]),
        AiModule,
    ],
    controllers: [StoryController],
    providers: [StoryService],
    exports: [StoryService],
})
export class StoryModule {}
