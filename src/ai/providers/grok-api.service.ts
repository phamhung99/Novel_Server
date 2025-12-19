import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IStoryGenerationProvider } from './story-generation-provider.interface';

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
        systemPrompt: string,
        userPrompt: string,
        responseSchema?: object,
    ): Promise<string> {
        try {
            const requestBody: any = {
                model: this.modelName,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.7,
                max_tokens: 4000,
            };

            // Add response_format with JSON schema if provided
            if (responseSchema) {
                requestBody.response_format = {
                    type: 'json_schema',
                    json_schema: {
                        name: 'response',
                        schema: responseSchema,
                        strict: true,
                    },
                };
            }

            const response = await this.client.post(
                '/chat/completions',
                requestBody,
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            this.logger.error('Error calling Grok API:', error);
            throw error;
        }
    }

    async generateImage(prompt: string): Promise<string> {
        try {
            const requestBody = {
                model: this.imageModel,
                prompt,
                n: 1, // Optional, defaults to 1
            };

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
            this.logger.error('Error generating image with Grok API:', error);
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
