import {
    Controller,
    Post,
    Body,
    Query,
    Get,
    BadRequestException,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateRawContentDto } from './dto/generate-raw-content.dto';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) {}

    @Post('generate')
    async generateContent(
        @Query('requestId') requestId: string,
        @Body() dto: GenerateRawContentDto,
    ) {
        return await this.aiService.generateRawContent(requestId, dto);
    }

    @Get('generate/result')
    async getGenerationResult(@Query('requestId') requestId: string) {
        if (!requestId) {
            throw new BadRequestException('requestId is required');
        }

        return await this.aiService.getGenerationResult(requestId);
    }
}
