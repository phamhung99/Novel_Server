import { Body, Controller, Post, Query } from '@nestjs/common';
import { AiService } from './ai.service';
import { ComicGenerateRequestDto } from './dto/comic-generate-request.dto';
import { ComicImageRequestDto } from './dto/comic-image-request.dto';
import { GptUserComicGenerationDto } from './dto/gpt-user-comic-generation.dto';
import { ComicSceneResponseDto } from './dto/comic-scene-response.dto';

@Controller('/ai')
export class AiController {
    constructor(private readonly aiService: AiService) {}

    @Post('/comic/generate')
    createComicConversation(
        @Query('isSubUser') isSubUser: boolean = false,
        @Body() comicRequest: ComicGenerateRequestDto,
    ): Promise<GptUserComicGenerationDto> {
        return this.aiService.generateComic(comicRequest, isSubUser);
    }

    @Post('/comic/images/result')
    createComicImages(
        @Query('isSubUser') isSubUser: boolean = false,
        @Body() comicRequest: ComicImageRequestDto,
    ): Promise<ComicSceneResponseDto> {
        return this.aiService.createComicImages(comicRequest, isSubUser);
    }
}
