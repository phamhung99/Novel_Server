import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IStoryGenerationProvider } from './story-generation-provider.interface';

@Injectable()
export class GeminiApiService implements IStoryGenerationProvider {
    private readonly logger = new Logger(GeminiApiService.name);
    private client: AxiosInstance;
    private readonly apiKey: string;
    private readonly modelName = 'gemini-3-pro-preview';
    // private readonly modelName = 'gemini-2.0-flash-lite';
    private readonly providerName = 'gemini';

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('GEMINI_API_KEY');

        this.client = axios.create({
            baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        });
    }

    async generateContent(
        systemPrompt: string,
        userPrompt: string,
        responseSchema?: object,
    ): Promise<string> {
        try {
            const requestBody: any = {
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 10000,
                },
            };

            if (systemPrompt) {
                requestBody.systemInstruction = {
                    parts: [{ text: systemPrompt }],
                };
            }

            if (responseSchema) {
                requestBody.generationConfig.responseMimeType =
                    'application/json';
                requestBody.generationConfig.responseSchema = responseSchema;
            }

            console.log('Request Body:', JSON.stringify(requestBody, null, 2));

            // URL đúng format
            const response = await this.client.post(
                `/models/${this.modelName}:generateContent?key=${this.apiKey}`,
                requestBody,
            );

            // Kiểm tra an toàn hơn
            const candidates = response.data.candidates;
            if (!candidates || candidates.length === 0) {
                throw new Error('No candidates returned from Gemini API');
            }

            return candidates[0].content.parts[0].text;
        } catch (error) {
            this.logger.error(
                'Error calling Gemini API:',
                error.response?.data || error.message,
            );
            throw error;
        }
    }

    async generateImage(prompt: string, size): Promise<string> {
        return 'text-to-image generation not supported yet';
    }

    getProviderName(): string {
        return this.providerName;
    }

    getModelName(): string {
        return this.modelName;
    }
}
