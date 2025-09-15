import { Injectable } from '@nestjs/common';
import { OpenAIApiService } from './providers/openai-api.service';
import { ChatModel, ImageModel } from 'src/ai/enum/models.enum';
import { GptUserComicGenerationDto } from './dto/gpt-user-comic-generation.dto';
import { ComicGenerateRequestDto } from './dto/comic-generate-request.dto';
import { ComicImageRequestDto } from './dto/comic-image-request.dto';
import { ComicSceneResponseDto } from './dto/comic-scene-response.dto';

@Injectable()
export class AiService {
    constructor(private openAIApiService: OpenAIApiService) {}

    async generateComic(
        comicRequest: ComicGenerateRequestDto,
        isSubUser: boolean,
    ): Promise<GptUserComicGenerationDto> {
        const model = comicRequest.platform || ChatModel.GPT_4O_MINI;

        const response = await this.openAIApiService.callOpenAITextAPI(
            comicRequest.prompt,
            model,
        );

        return this.openAIApiService.parseOpenAITextResponse(response);
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
        );

        return this.openAIApiService.parseOpenAIImageResponse(response);
    }
}
