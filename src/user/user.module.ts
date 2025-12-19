import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserCategoryPreference } from './entities/user-category-preference.entity';
import { ReadingHistory } from './entities/reading-history.entity';
import { StoryGeneration } from 'src/story/entities/story-generation.entity';

@Module({
    controllers: [UserController],
    providers: [UserService],
    imports: [
        TypeOrmModule.forFeature([
            User,
            UserCategoryPreference,
            ReadingHistory,
            StoryGeneration,
        ]),
    ],
    exports: [UserService, TypeOrmModule],
})
export class UserModule {}
