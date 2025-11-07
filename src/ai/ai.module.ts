import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenAIApiService } from './providers/openai-api.service';
import { GeminiApiService } from './providers/gemini-api.service';
import { UserModule } from 'src/user/user.module';
import { PromotionCodeModule } from 'src/promotion-code/promotion-code.module';
import { GptApiService } from './providers/gpt-api.service';
import { GrokApiService } from './providers/grok-api.service';
import { StoryGenerationProviderFactory } from './providers/story-generation-provider.factory';
import { StoryGenerationApiService } from './providers/story-generation-api.service';
import { StoryGeneration } from '../story/entities/story-generation.entity';

@Module({
    controllers: [AiController],
    providers: [
        AiService,
        OpenAIApiService,
        GeminiApiService,
        GptApiService,
        GrokApiService,
        StoryGenerationProviderFactory,
        StoryGenerationApiService,
    ],
    imports: [
        UserModule,
        PromotionCodeModule,
        TypeOrmModule.forFeature([StoryGeneration]),
    ],
    exports: [StoryGenerationApiService, StoryGenerationProviderFactory],
})
export class AiModule {}
