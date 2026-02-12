import { Injectable } from '@nestjs/common';
import { StoryGenerationApiService } from './providers/story-generation-api.service';
import { GenerateRawContentDto } from './dto/generate-raw-content.dto';

@Injectable()
export class AiService {
    constructor(
        private readonly storyGenerationApiService: StoryGenerationApiService,
    ) {}

    async generateRawContent(dto: GenerateRawContentDto): Promise<string> {
        return await this.storyGenerationApiService.generateRawContent(dto);
    }
}
