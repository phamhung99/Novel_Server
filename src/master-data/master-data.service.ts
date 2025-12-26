import { BadRequestException, Injectable } from '@nestjs/common';
import { StoryService } from 'src/story/story.service';
import { ERROR_MESSAGES } from 'src/common/constants/app.constant';

@Injectable()
export class MasterDataService {
    constructor(private readonly storyService: StoryService) {}

    async getMasterData(userId: string): Promise<any> {
        if (!userId) {
            throw new BadRequestException(ERROR_MESSAGES.USER_ID_REQUIRED);
        }

        const categories = await this.storyService.getAllCategories();

        return {
            categories,
        };
    }
}
