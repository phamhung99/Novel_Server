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
    private readonly imageModel = 'imagen-4.0-generate-001';
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

            console.log('Gemini API response data:', response.data);

            return candidates[0].content.parts[0].text;
        } catch (error) {
            this.logger.error(
                'Error calling Gemini API:',
                error.response?.data || error.message,
            );
            throw error;
        }
    }

    async generateImage(prompt: string): Promise<string> {
        try {
            const requestBody = {
                instances: [
                    {
                        prompt,
                    },
                ],
                parameters: {
                    sampleCount: 1,
                    // Optional: add more parameters if needed (aspectRatio, addWatermark: false, etc.)
                    // Example: aspectRatio: "1:1", imageSize: "1K" (depends on exact model support)
                },
            };

            const response = await this.client.post(
                `/models/${this.imageModel}:predict?key=${this.apiKey}`,
                requestBody,
            );

            const predictions = response.data.predictions;
            if (!predictions || predictions.length === 0) {
                throw new Error('No predictions returned from Imagen API');
            }

            // Imagen /predict usually returns base64 PNG/JPEG in bytesBase64Encoded
            const firstPrediction = predictions[0];
            const b64Image = firstPrediction.bytesBase64Encoded;

            if (!b64Image) {
                throw new Error('No valid image data returned from Imagen API');
            }

            console.log('base64: ', b64Image.substring(0, 30) + '...');

            return b64Image;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                this.logger.error('Gemini Imagen API failed:', {
                    status: error.response.status,
                    data: error.response.data,
                });
            } else {
                this.logger.error('Gemini image generation error:', error);
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
