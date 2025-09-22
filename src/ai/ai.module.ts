import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenAIApiService } from './providers/openai-api.service';
import { GeminiApiService } from './providers/gemini-api.service';
import { UserModule } from 'src/user/user.module';
import { PromotionCodeModule } from 'src/promotion-code/promotion-code.module';

@Module({
    controllers: [AiController],
    providers: [AiService, OpenAIApiService, GeminiApiService],
    imports: [UserModule, PromotionCodeModule],
})
export class AiModule {}
