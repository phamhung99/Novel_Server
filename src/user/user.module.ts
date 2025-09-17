import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GptUser } from './entities/gpt-user.entity';
import { GptTransactionsModule } from 'src/gpt-transactions/gpt-transactions.module';
import { UserComicGenerations } from './entities/user_comic_generations.entity';
import { IapProductModule } from 'src/iap-product/iap-product.module';

@Module({
    controllers: [UserController],
    providers: [UserService],
    imports: [
        TypeOrmModule.forFeature([GptUser, UserComicGenerations]),
        GptTransactionsModule,
        IapProductModule,
    ],
})
export class UserModule {}
