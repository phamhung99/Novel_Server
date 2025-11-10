import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserComicGenerations } from './entities/user_comic_generations.entity';
import { User } from './entities/user.entity';

@Module({
    controllers: [UserController],
    providers: [UserService],
    imports: [TypeOrmModule.forFeature([User, UserComicGenerations])],
    exports: [UserService, TypeOrmModule],
})
export class UserModule {}
