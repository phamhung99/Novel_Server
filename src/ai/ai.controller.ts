import {
    Body,
    Controller,
    Post,
    Query,
    Headers,
    BadRequestException,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { ComicGenerateRequestDto } from './dto/comic-generate-request.dto';
import { ComicImageRequestDto } from './dto/comic-image-request.dto';
import { GptUserComicGenerationDto } from './dto/gpt-user-comic-generation.dto';
import { ComicSceneResponseDto } from './dto/comic-scene-response.dto';
import { UserService } from 'src/user/user.service';

@Controller('/ai')
export class AiController {
    constructor(
        private readonly aiService: AiService,
        private readonly userService: UserService,
    ) {}

    @Post('/comic/generate')
    async createComicConversation(
        @Headers('x-user-id') userId: string,
        @Query('isSubUser') isSubUser: boolean = false,
        @Body() comicRequest: ComicGenerateRequestDto,
    ): Promise<GptUserComicGenerationDto> {
        if (!userId) {
            throw new BadRequestException('userId is required');
        }

        await this.userService.checkComicCooldown(userId);

        return this.aiService.generateComic(comicRequest, isSubUser, userId);
    }

    @Post('/comic/images/result')
    async createComicImages(
        @Headers('x-user-id') userId: string,
        @Query('isSubUser') isSubUser: boolean = false,
        @Body() comicRequest: ComicImageRequestDto,
    ): Promise<ComicSceneResponseDto> {
        if (!userId) {
            throw new BadRequestException('userId is required');
        }

        await this.userService.checkComicCooldown(userId);

        return this.aiService.createComicImages(comicRequest, userId);
    }
}
