import { BadRequestException, Injectable } from '@nestjs/common';
import { OpenAIApiService } from './providers/openai-api.service';
import { ChatModel, ImageModel } from 'src/common/enums/models.enum';
import { GptUserComicGenerationDto } from './dto/gpt-user-comic-generation.dto';
import { ComicGenerateRequestDto } from './dto/comic-generate-request.dto';
import { ComicImageRequestDto } from './dto/comic-image-request.dto';
import { ComicSceneResponseDto } from './dto/comic-scene-response.dto';
import { Platform } from '../common/enums/platform.enum';
import { GeminiApiService } from './providers/gemini-api.service';
import { UserService } from 'src/user/user.service';
import { GenerationType, LightningActionType } from 'src/common/enums/app.enum';
import { MAX_MSG_COUNT_PER_DAY } from 'src/common/constants/app.constant';
import { ComicStyleType } from 'src/common/enums/comic-style-type.enum';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages.constants';

@Injectable()
export class AiService {
    constructor(
        private openAIApiService: OpenAIApiService,
        private geminiApiService: GeminiApiService,
        private userservice: UserService,
    ) {}

    async generateComic(
        comicRequest: ComicGenerateRequestDto,
        isSubUser: boolean,
        userId: string,
    ): Promise<GptUserComicGenerationDto> {
        const platform = comicRequest.platform || Platform.GEMINI;

        const hasReachedDailyComicLimit =
            await this.userservice.hasReachedDailyComicLimit(
                userId,
                MAX_MSG_COUNT_PER_DAY,
            );

        if (comicRequest.type !== ComicStyleType.COMIC) {
            await this.userservice.subtractLightningForComicAction(
                userId,
                LightningActionType.COMIC_STORY_GENERATION,
            );
        } else if (hasReachedDailyComicLimit && !isSubUser) {
            throw new BadRequestException(
                ERROR_MESSAGES.COMIC_GENERATED_DAILY_LIMIT_REACHED,
            );
        } else if (hasReachedDailyComicLimit && isSubUser) {
            await this.userservice.subtractLightningForComicAction(
                userId,
                LightningActionType.COMIC_STORY_GENERATION,
            );
        } else {
            await this.userservice.increaseComicGeneratedCountToday({
                userId,
                isPro: isSubUser,
                genType: GenerationType.TEXT,
                platform,
            });
        }

        if (platform === Platform.GEMINI) {
            const response = await this.geminiApiService.callGeminiTextAPI(
                comicRequest.prompt,
                ChatModel.GEMINI_20_FLASH,
            );
            return this.geminiApiService.parseGeminiTextResponse(
                response,
                comicRequest,
            );
        }

        if (platform === Platform.OPENAI) {
            const response = await this.openAIApiService.callOpenAITextAPI(
                comicRequest.prompt,
                ChatModel.GPT_4O_MINI,
            );
            return this.openAIApiService.parseOpenAITextResponse(
                response,
                comicRequest,
            );
        }
    }

    async createComicImages(
        comicRequest: ComicImageRequestDto,
        userId: string,
    ): Promise<ComicSceneResponseDto> {
        await this.userservice.subtractLightningForComicAction(
            userId,
            LightningActionType.COMIC_IMAGE_GENERATION,
        );

        await this.userservice.increaseComicGeneratedCountToday({
            userId,
            isPro: false,
            genType: GenerationType.IMAGE,
            platform: Platform.OPENAI,
        });

        const response = await this.openAIApiService.callOpenAIImageAPI(
            comicRequest.scenePrompt,
            ImageModel.DALLE_3,
            comicRequest.characterPrompts,
            comicRequest.type,
            comicRequest.isDevMode,
        );

        return this.openAIApiService.parseOpenAIImageResponse(response);
    }
}
