import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserGenres } from './entities/user-genres.entity';
import { ReadingHistory } from './entities/reading-history.entity';

@Module({
    controllers: [UserController],
    providers: [UserService],
    imports: [TypeOrmModule.forFeature([User, UserGenres, ReadingHistory])],
    exports: [UserService, TypeOrmModule],
})
export class UserModule {}
