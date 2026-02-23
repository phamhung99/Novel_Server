import {
    Injectable,
    HttpException,
    HttpStatus,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoryGenerationApiService } from './providers/story-generation-api.service';
import { GenerateRawContentDto } from './dto/generate-raw-content.dto';
import {
    ChatGeneration,
    ChatGenerationStatus,
} from './entities/chat-generation.entity';

@Injectable()
export class AiService {
    constructor(
        @InjectRepository(ChatGeneration)
        private chatGenerationRepository: Repository<ChatGeneration>,
        private readonly storyGenerationApiService: StoryGenerationApiService,
    ) {}

    async generateRawContent(
        requestId: string,
        dto: GenerateRawContentDto,
    ): Promise<{ message: string }> {
        // Check for duplicate request
        const exists = await this.chatGenerationRepository.findOne({
            where: { requestId },
        });
        if (exists) throw new BadRequestException('Duplicate request');

        // Create initial record
        const chatGeneration = this.chatGenerationRepository.create({
            requestId,
            prompt: dto.prompt,
            status: ChatGenerationStatus.PENDING,
        });

        const savedChatGeneration =
            await this.chatGenerationRepository.save(chatGeneration);

        try {
            const response =
                await this.storyGenerationApiService.generateRawContent(dto);

            // Update with successful response
            await this.chatGenerationRepository.update(
                { id: savedChatGeneration.id },
                {
                    response,
                    status: ChatGenerationStatus.COMPLETED,
                },
            );

            return {
                message: 'Content generated successfully',
            };
        } catch (error) {
            console.error('Error generating raw content:', error);

            // Update with error
            await this.chatGenerationRepository.update(
                { id: savedChatGeneration.id },
                {
                    status: ChatGenerationStatus.FAILED,
                    response: error.message || 'Failed to generate content',
                },
            );

            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: error.message || 'Content generation failed',
                    error: 'Content generation failed',
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    async getGenerationResult(requestId: string): Promise<{ content: string }> {
        const generation = await this.chatGenerationRepository.findOne({
            where: { requestId },
        });

        if (!generation) {
            throw new NotFoundException(
                `No generation results found for requestId ${requestId}`,
            );
        }

        if (generation.status === ChatGenerationStatus.FAILED) {
            throw new BadRequestException(
                generation.response || 'Content generation failed',
            );
        }

        if (generation.status === ChatGenerationStatus.PENDING) {
            throw new HttpException(
                'Content is still being generated. Please try again later.',
                HttpStatus.ACCEPTED,
            );
        }

        // Status is COMPLETED
        return {
            content: generation.response || '',
        };
    }
}
