import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IStoryGenerationProvider } from './story-generation-provider.interface';
import { GenerateRawContentDto } from '../dto/generate-raw-content.dto';
import { GenerateContentResult } from '../dto/generate-content-result.dto';

/**
 * Grok API Service for Story Generation
 * Implements story generation using Grok model
 */
@Injectable()
export class GrokApiService implements IStoryGenerationProvider {
    private readonly logger = new Logger(GrokApiService.name);
    private client: AxiosInstance;
    private readonly apiKey: string;
    private readonly modelName = 'grok-4';
    private readonly imageModel = 'grok-2-image-1212';
    private readonly providerName = 'grok';

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('GROK_API_KEY');

        this.client = axios.create({
            baseURL: 'https://api.x.ai/v1',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
        });
    }

    async generateContent(
        dto: GenerateRawContentDto,
    ): Promise<GenerateContentResult> {
        try {
            const requestBody: any = {
                model: this.modelName,
                messages: [
                    {
                        role: 'system',
                        content:
                            dto.systemPrompt || 'You are a helpful assistant.',
                    },
                    { role: 'user', content: dto.prompt },
                ],
                temperature: dto.temperature || 0.7,
                max_tokens: dto.maxTokens || 4000,
            };

            // Add response_format with JSON schema if provided
            if (dto.responseSchema) {
                requestBody.response_format = {
                    type: 'json_schema',
                    json_schema: {
                        name: 'response',
                        schema: dto.responseSchema,
                        strict: true,
                    },
                };
            }

            const response = await this.client.post(
                '/chat/completions',
                requestBody,
            );

            const data = response.data;

            if (!data.choices || data.choices.length === 0) {
                throw new Error('No choices returned from Grok API');
            }

            const message = data.choices[0].message;
            const content = message.content || '';

            const usage = data.usage || {};
            const totalTokenCount = usage.total_tokens;

            return {
                content,
                totalTokenCount,
            };
        } catch (error) {
            const errorDetail = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : error.message;

            this.logger.error('Error calling Grok API:', {
                message: errorDetail,
                status: error.response?.status,
                model: dto.model || this.modelName,
            });

            throw error;
        }
    }

    async generateImage(prompt: string): Promise<string> {
        try {
            const requestBody = {
                model: this.imageModel,
                prompt,
            };

            const MAX_PROMPT_LENGTH = 1024;

            if (prompt.length > MAX_PROMPT_LENGTH) {
                throw new BadRequestException(
                    `Prompt too long (${prompt.length} characters). Maximum allowed: ${MAX_PROMPT_LENGTH} characters.`,
                );
            }

            const response = await this.client.post(
                '/images/generations',
                requestBody,
            );
            const imageData = response.data.data[0];

            if (imageData.url) return imageData.url;
            if (imageData.b64_json)
                return `data:image/jpeg;base64,${imageData.b64_json}`;

            throw new Error('No valid image returned from Grok API');
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                this.logger.error('Grok image API failed:', {
                    status: error.response.status,
                    data: error.response.data,
                });
            } else {
                this.logger.error('Grok image error:', error);
            }
            throw error;
        }
    }

    getProviderName(): string {
        return this.providerName;
    }

    getModelName(): string {
        return this.modelName;
    }
}
