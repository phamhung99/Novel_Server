import { forwardRef, Module } from '@nestjs/common';
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
import { CoinTransaction } from './entities/coin-transaction.entity';
import { Transaction } from 'src/payments/entities/transaction.entity';
import { PaymentsModule } from 'src/payments/payments.module';
import { StoryModule } from 'src/story/story.module';
import { AppFeedback } from './entities/app-feedback.entity';
import { Report } from './entities/report.entity';
import { UserCoinService } from './user-coin.service';
import { UserSubscriptionService } from './user-subscription.service';
import { UserRewardService } from './user-reward.service';
import { UserReportService } from './user-report.service';

@Module({
    controllers: [UserController],
    providers: [
        UserService,
        MediaService,
        DoSpacesService,
        UserCoinService,
        UserSubscriptionService,
        UserRewardService,
        UserReportService,
    ],
    imports: [
        TypeOrmModule.forFeature([
            User,
            UserCategoryPreference,
            ReadingHistory,
            StoryGeneration,
            Chapter,
            UserCoins,
            UserDailyAction,
            CoinTransaction,
            Transaction,
            AppFeedback,
            Report,
        ]),
        forwardRef(() => PaymentsModule),
        forwardRef(() => StoryModule),
    ],
    exports: [
        UserService,
        TypeOrmModule,
        UserCoinService,
        UserSubscriptionService,
        UserRewardService,
        UserReportService,
    ],
})
export class UserModule {}
