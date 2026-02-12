import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

export interface GenerateRawContentDto {
    prompt: string;
    systemPrompt?: string;
    aiProvider?: string;
}

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) {}

    @Post('generate')
    async generateContent(@Body() dto: GenerateRawContentDto): Promise<string> {
        return await this.aiService.generateRawContent(dto);
    }
}
