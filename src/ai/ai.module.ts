import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { GptApiService } from './providers/gpt-api.service';
import { GrokApiService } from './providers/grok-api.service';
import { StoryGenerationProviderFactory } from './providers/story-generation-provider.factory';
import { StoryGenerationApiService } from './providers/story-generation-api.service';
import { GeminiApiService } from './providers/gemini-api.service';

@Module({
    providers: [
        AiService,
        GptApiService,
        GrokApiService,
        GeminiApiService,
        StoryGenerationProviderFactory,
        StoryGenerationApiService,
    ],
    exports: [StoryGenerationApiService, StoryGenerationProviderFactory],
})
export class AiModule {}
