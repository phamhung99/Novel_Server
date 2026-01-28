import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { Story } from './entities/story.entity';
import { Chapter } from './entities/chapter.entity';
import { StoryGeneration } from './entities/story-generation.entity';
import { ChapterGeneration } from './entities/chapter-generation.entity';
import { AiModule } from '../ai/ai.module';
import { UserModule } from 'src/user/user.module';
import { Category } from './entities/categories.entity';
import { DoSpacesService } from 'src/upload/do-spaces.service';
import { ChapterService } from './chapter.service';
import { StoryCategory } from './entities/story-category.entity';
import { StoryCrudService } from './story-crud.service';
import { StoryPublicationService } from './story-publication.service';
import { StoryInteractionService } from './story-interaction.service';
import { StoryGenerationService } from './story-generation.service';
import { StoryDiscoveryService } from './story-discovery.service';
import { ChapterViews } from './entities/chapter-views.entity';
import { MediaService } from 'src/media/media.service';
import { ImageGeneration } from './entities/image-generation.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Story,
            Chapter,
            StoryGeneration,
            ChapterGeneration,
            ChapterViews,
            Category,
            StoryCategory,
            ImageGeneration,
        ]),
        AiModule,
        forwardRef(() => UserModule),
    ],
    controllers: [StoryController],
    providers: [
        StoryService,
        DoSpacesService,
        MediaService,
        ChapterService,
        StoryCrudService,
        StoryPublicationService,
        StoryInteractionService,
        StoryGenerationService,
        StoryDiscoveryService,
    ],
    exports: [StoryService, ChapterService],
})
export class StoryModule {}
