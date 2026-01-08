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
    private readonly imagenModels = new Set([
        'imagen-4.0-generate-001',
        'imagen-4.0-ultra-generate-001',
        'imagen-4.0-fast-generate-001',
    ]);

    private readonly geminiImageModels = new Set([
        'gemini-2.5-flash-image',
        'gemini-3-pro-image-preview',
    ]);
    private readonly providerName = 'gemini';

    private readonly defaultModel = 'imagen-4.0-fast-generate-001';
    private readonly sampleCount = 1;

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

    async generateImage(prompt: string, model?: string): Promise<string> {
        // Default model logic moved inside
        const effectiveModel = model ?? this.defaultModel;

        console.log('Using this model: ', effectiveModel);

        if (
            !this.imagenModels.has(effectiveModel) &&
            !this.geminiImageModels.has(effectiveModel)
        ) {
            this.logger.warn(
                `Unsupported model: ${effectiveModel}. Falling back to default: ${this.defaultModel}`,
            );
        }

        if (this.imagenModels.has(effectiveModel)) {
            return this.generateWithImagen(
                prompt,
                effectiveModel,
                this.sampleCount,
            );
        }

        if (this.geminiImageModels.has(effectiveModel)) {
            return this.generateWithGeminiNative(prompt, effectiveModel);
        }

        // This should actually be unreachable if defaultModel is always valid
        throw new Error(`Invalid model after fallback: ${effectiveModel}`);
    }

    private async generateWithImagen(
        prompt: string,
        model: string,
        sampleCount: number,
    ): Promise<string> {
        try {
            const requestBody = {
                instances: [{ prompt }],
                parameters: {
                    sampleCount,
                },
            };

            const response = await this.client.post(
                `/models/${model}:predict?key=${this.apiKey}`,
                requestBody,
            );

            const predictions = response.data.predictions ?? [];
            if (predictions.length === 0) {
                throw new Error('No predictions returned from Imagen API');
            }

            const b64Image = predictions[0].bytesBase64Encoded;
            if (!b64Image) {
                throw new Error('No valid image data returned');
            }

            return b64Image;
        } catch (error) {
            this.logger.error('Imagen generation failed', { model, error });
            throw error;
        }
    }

    private async generateWithGeminiNative(
        prompt: string,
        model: string,
    ): Promise<string> {
        try {
            const requestBody = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    candidateCount: 1,
                },
            };

            const response = await this.client.post(
                `/models/${model}:generateContent?key=${this.apiKey}`,
                requestBody,
            );

            const candidates = response.data.candidates ?? [];
            if (candidates.length === 0) {
                throw new Error('No candidates returned from Gemini image API');
            }

            const parts = candidates[0].content?.parts ?? [];
            const imagePart = parts.find((p: any) => p.inlineData?.data);

            if (!imagePart?.inlineData?.data) {
                throw new Error('No image data found in Gemini response');
            }

            // inlineData.data là base64 thuần (không prefix)
            return imagePart.inlineData.data;
        } catch (error) {
            this.logger.error('Gemini native image generation failed', {
                model,
                error,
            });
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
