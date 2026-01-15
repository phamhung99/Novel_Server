import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserCategoryPreference } from './entities/user-category-preference.entity';
import { ReadingHistory } from './entities/reading-history.entity';
import { StoryGeneration } from 'src/story/entities/story-generation.entity';
import { Chapter } from 'src/story/entities/chapter.entity';
import { UserCoins } from './entities/user-coins.entity';
import { MediaService } from 'src/media/media.service';
import { DoSpacesService } from 'src/upload/do-spaces.service';
import { UserDailyAction } from './entities/user-daily-action.entity';

@Module({
    controllers: [UserController],
    providers: [UserService, MediaService, DoSpacesService],
    imports: [
        TypeOrmModule.forFeature([
            User,
            UserCategoryPreference,
            ReadingHistory,
            StoryGeneration,
            Chapter,
            UserCoins,
            UserDailyAction,
        ]),
    ],
    exports: [UserService, TypeOrmModule],
})
export class UserModule {}
