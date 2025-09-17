import { Injectable } from '@nestjs/common';
import { OpenAIApiService } from './providers/openai-api.service';
import { ChatModel, ImageModel } from 'src/ai/enum/models.enum';
import { GptUserComicGenerationDto } from './dto/gpt-user-comic-generation.dto';
import { ComicGenerateRequestDto } from './dto/comic-generate-request.dto';
import { ComicImageRequestDto } from './dto/comic-image-request.dto';
import { ComicSceneResponseDto } from './dto/comic-scene-response.dto';
import { Platform } from './enum/platform.enum';
import { GeminiApiService } from './providers/gemini-api.service';

@Injectable()
export class AiService {
    constructor(
        private openAIApiService: OpenAIApiService,
        private geminiApiService: GeminiApiService,
    ) {}

    async generateComic(
        comicRequest: ComicGenerateRequestDto,
        isSubUser: boolean,
    ): Promise<GptUserComicGenerationDto> {
        const platform = comicRequest.platform || Platform.GEMINI;

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
        isSubUser: boolean,
    ): Promise<ComicSceneResponseDto> {
        const model = comicRequest.platform || ImageModel.DALLE_3;

        const response = await this.openAIApiService.callOpenAIImageAPI(
            comicRequest.scenePrompt,
            model,
            comicRequest.characterPrompts,
            comicRequest.type,
            comicRequest.isDevMode,
        );

        return this.openAIApiService.parseOpenAIImageResponse(response);
    }
}
