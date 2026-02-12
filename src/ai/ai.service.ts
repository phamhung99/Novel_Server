import { Injectable } from '@nestjs/common';
import { StoryGenerationApiService } from './providers/story-generation-api.service';

export interface GenerateRawContentDto {
    prompt: string;
    systemPrompt?: string;
    aiProvider?: string;
}

@Injectable()
export class AiService {
    constructor(
        private readonly storyGenerationApiService: StoryGenerationApiService,
    ) {}

    async generateRawContent(dto: GenerateRawContentDto): Promise<string> {
        return await this.storyGenerationApiService.generateRawContent(dto);
    }
}