import {
    Body,
    Controller,
    Post,
    Query,
    Headers,
    BadRequestException,
    Get,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { ComicGenerateRequestDto } from './dto/comic-generate-request.dto';
import { ComicImageRequestDto } from './dto/comic-image-request.dto';
import { GptUserComicGenerationDto } from './dto/gpt-user-comic-generation.dto';
import { ComicSceneResponseDto } from './dto/comic-scene-response.dto';
import { UserService } from 'src/user/user.service';
import { PromotionCodeService } from 'src/promotion-code/promotion-code.service';

@Controller('/ai')
export class AiController {
    constructor(
        private readonly aiService: AiService,
        private readonly userService: UserService,
        private readonly promotionCodeService: PromotionCodeService,
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

        await this.userService.checkComicCooldown(userId, comicRequest.prompt);

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

        await this.userService.checkComicCooldown(
            userId,
            comicRequest.scenePrompt,
        );

        return this.aiService.createComicImages(
            comicRequest,
            userId,
            isSubUser,
        );
    }

    @Post('/comic/report')
    async reportComic(
        @Headers('x-user-id') userId: string,
        @Body() reportData: any,
    ): Promise<any> {
        return;
    }

    @Get('/plus-lightning')
    async checkUser(
        @Query('promotionCode') promotionCode: string,
        @Headers('x-user-id') userId: string,
    ): Promise<boolean> {
        let isSuccess = false;

        const promoExists =
            await this.promotionCodeService.existsByPromotionCode(
                promotionCode,
            );
        if (promoExists) {
            isSuccess = await this.userService.addPlusLightning(
                userId,
                promotionCode,
                200,
            );
        }

        return isSuccess;
    }
}
