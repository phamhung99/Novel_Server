// import { Injectable, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import axios, { AxiosInstance } from 'axios';
// import { IStoryGenerationProvider } from './story-generation-provider.interface';

// @Injectable()
// export class GeminiApiService implements IStoryGenerationProvider {
//     private readonly logger = new Logger(GeminiApiService.name);
//     private client: AxiosInstance;
//     private readonly apiKey: string;
//     private readonly modelName = 'gemini-2.5';
//     private readonly providerName = 'gemini';

//     constructor(private configService: ConfigService) {
//         this.apiKey = this.configService.get<string>('GEMINI_API_KEY');

//         this.client = axios.create({
//             baseURL: 'https://api.gemini.ai/v1',
//             headers: {
//                 Authorization: `Bearer ${this.apiKey}`,
//                 'Content-Type': 'application/json',
//             },
//         });
//     }

//     async generateContent(
//         systemPrompt: string,
//         userPrompt: string,
//         responseSchema?: object,
//     ): Promise<string> {
//         try {
//             const requestBody: any = {
//                 model: this.modelName,
//                 messages: [
//                     { role: 'system', content: systemPrompt },
//                     { role: 'user', content: userPrompt },
//                 ],
//                 temperature: 0.7,
//                 max_tokens: 4000,
//             };

//             if (responseSchema) {
//                 requestBody.response_format = {
//                     type: 'json_schema',
//                     json_schema: {
//                         name: 'response',
//                         schema: responseSchema,
//                         strict: true,
//                     },
//                 };
//             }

//             const response = await this.client.post(
//                 '/chat/completions',
//                 requestBody,
//             );

//             return response.data.choices[0].message.content;
//         } catch (error) {
//             this.logger.error('Error calling Gemini API:', error);
//             throw error;
//         }
//     }

//     getProviderName(): string {
//         return this.providerName;
//     }

//     getModelName(): string {
//         return this.modelName;
//     }
// }
