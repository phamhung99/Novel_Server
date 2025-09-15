import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenAIApiService } from './providers/openai-api.service';

@Module({
    controllers: [AiController],
    providers: [AiService, OpenAIApiService],
})
export class AiModule {}
