import { BadRequestException, Injectable } from '@nestjs/common';
import { StoryService } from 'src/story/story.service';
import {
    CHAPTER_CREATION_FEE,
    CHAPTER_UNLOCK_FEE,
    ERROR_MESSAGES,
    IMAGE_CREATION_FEE,
    STORY_CREATION_FEE,
} from 'src/common/constants/app.constant';
import { UserService } from 'src/user/user.service';
import { IapProductService } from 'src/payments/iap-product.service';
import { IapStore } from 'src/common/enums/app.enum';

@Injectable()
export class MasterDataService {
    constructor(
        private readonly storyService: StoryService,
        private readonly userService: UserService,
        private readonly iapProductService: IapProductService,
    ) {}

    async getMasterData(userId: string, platform: IapStore): Promise<any> {
        if (!userId) {
            throw new BadRequestException(ERROR_MESSAGES.USER_ID_REQUIRED);
        }

        const [user, categories, iapProducts] = await Promise.all([
            this.userService.findById(userId, false),
            this.storyService.getAllCategories(),
            this.iapProductService.findAllWithDisplayOrder(platform),
        ]);

        await this.userService.recordDailyCheckInAndGrantBonus(user);

        return {
            categories,
            iapProducts,
            chapterUnlockFee: CHAPTER_UNLOCK_FEE,
            chapterCreationFee: CHAPTER_CREATION_FEE,
            storyCreationFee: STORY_CREATION_FEE,
            imageCreationFee: IMAGE_CREATION_FEE,
        };
    }
}
