import { BadRequestException, Injectable } from '@nestjs/common';
import { StoryService } from 'src/story/story.service';
import { ERROR_MESSAGES } from 'src/common/constants/app.constant';
import { UserService } from 'src/user/user.service';

@Injectable()
export class MasterDataService {
    constructor(
        private readonly storyService: StoryService,
        private readonly userService: UserService,
    ) {}

    async getMasterData(userId: string): Promise<any> {
        if (!userId) {
            throw new BadRequestException(ERROR_MESSAGES.USER_ID_REQUIRED);
        }

        const user = await this.userService.findById(userId, false);

        const categories = await this.storyService.getAllCategories();

        await this.userService.recordDailyCheckInAndGrantBonus(user);

        return {
            categories,
        };
    }
}
