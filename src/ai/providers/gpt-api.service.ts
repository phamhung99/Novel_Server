import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IStoryGenerationProvider } from './story-generation-provider.interface';
import { GenerateRawContentDto } from '../dto/generate-raw-content.dto';
import { GenerateContentResult } from '../dto/generate-content-result.dto';

/**
 * GPT API Service for Story Generation
 * Implements story generation using OpenAI GPT-4 model
 */
@Injectable()
export class GptApiService implements IStoryGenerationProvider {
    private readonly logger = new Logger(GptApiService.name);
    private client: AxiosInstance;
    private readonly apiKey: string;
    private readonly modelName = 'gpt-4o-mini';
    private readonly imageModelName = 'dall-e-3';
    private readonly providerName = 'gpt';

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('OPENAI_API_KEY');

        this.client = axios.create({
            baseURL: 'https://api.openai.com/v1',
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
                max_tokens: dto.maxTokens || 2000,
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
                throw new Error('No choices returned from OpenAI API');
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

            this.logger.error('Error calling OpenAI API:', {
                message: errorDetail,
                status: error.response?.status,
                model: dto.model || this.modelName,
            });

            throw error;
        }
    }

    async generateImage(
        prompt: string,
        size: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024',
    ): Promise<string> {
        try {
            const response = await this.client.post('/images/generations', {
                model: this.imageModelName,
                prompt,
                size,
                n: 1,
            });

            return response.data.data[0].url;
        } catch (error) {
            this.logger.error(
                'Error generating image with OpenAI DALL·E:',
                error,
            );
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
