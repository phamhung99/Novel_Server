import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { Story } from './entities/story.entity';
import { Chapter } from './entities/chapter.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Story, Chapter])],
    controllers: [StoryController],
    providers: [StoryService],
    exports: [StoryService],
})
export class StoryModule {}
