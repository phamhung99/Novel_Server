// // src/ai/providers/gemini/gemini-api.service.ts
// import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import axios from 'axios';
// import {
//     ComicGenerationResponseDto,
//     ComicScene,
// } from '../dto/comic-generation-response.dto';
// import { API_ENDPOINTS } from 'src/common/constants/api.constants';
// import { ChatModel, ImageModel } from 'src/common/constants/models.constants';

// @Injectable()
// export class GeminiApiService {
//     private readonly geminiApiKey: string;

//     constructor(private configService: ConfigService) {
//         this.geminiApiKey = this.configService.get('geminiApiKey');
//     }

//     formatTokenUsage(usage: any): any {
//         return {
//             promptTokens: usage?.promptTokenCount || 0,
//             completionTokens: usage?.candidatesTokenCount || 0,
//             totalTokens: usage?.totalTokenCount || 0,
//         };
//     }

//     async callGeminiAPI(prompt: string): Promise<string> {
//         if (!this.geminiApiKey) {
//             throw new HttpException(
//                 'Gemini API key is not configured',
//                 HttpStatus.INTERNAL_SERVER_ERROR,
//             );
//         }

//         const url = API_ENDPOINTS.GEMINI.GENERATE_CONTENT(
//             ChatModel.GEMINI_20_FLASH,
//             this.geminiApiKey,
//         );

//         const requestBody = {
//             contents: [
//                 {
//                     parts: [
//                         {
//                             text: prompt,
//                         },
//                     ],
//                 },
//             ],
//             generationConfig: {
//                 temperature: 0.7,
//                 maxOutputTokens: 500,
//             },
//         };

//         try {
//             const response = await axios.post(url, requestBody, {
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//             });

//             return response.data;
//         } catch (error) {
//             throw new HttpException(
//                 `Failed to generate comic content: ${error.response?.data?.error?.message || error.message}`,
//                 HttpStatus.INTERNAL_SERVER_ERROR,
//             );
//         }
//     }

//     async callGeminiImageAPI(prompt: string): Promise<string> {
//         if (!this.geminiApiKey) {
//             throw new HttpException(
//                 'Gemini API key is not configured',
//                 HttpStatus.INTERNAL_SERVER_ERROR,
//             );
//         }

//         const url = API_ENDPOINTS.GEMINI.GENERATE_CONTENT(
//             ImageModel.GEMINI_25_FLASH_IMAGE_PREVIEW,
//             this.geminiApiKey,
//         );

//         const requestBody = {
//             contents: [
//                 {
//                     parts: [
//                         {
//                             text: prompt,
//                         },
//                     ],
//                 },
//             ],
//             generationConfig: {
//                 temperature: 0.7,
//                 maxOutputTokens: 300,
//             },
//         };

//         try {
//             const response = await axios.post(url, requestBody, {
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//             });

//             return response.data;
//         } catch (error) {
//             throw new HttpException(
//                 `Failed to generate image description: ${error.response?.data?.error?.message || error.message}`,
//                 HttpStatus.INTERNAL_SERVER_ERROR,
//             );
//         }
//     }

//     parseGeminiTextResponse(response: any): ComicGenerationResponseDto {
//         const textContent = response.candidates[0].content.parts[0].text;
//         const usage = response.usageMetadata;

//         const lines = textContent.split('\n').filter((line) => line.trim());

//         const title = lines[0].replace('Title:', '').trim();
//         const scenes: ComicScene[] = [];

//         for (let i = 1; i < lines.length; i++) {
//             const sceneLine = lines[i];
//             if (sceneLine.includes('Scene')) {
//                 const id = i;
//                 const description = sceneLine.replace(/Scene \d+:/, '').trim();
//                 scenes.push({ id, description });
//             }
//         }

//         return { title, scenes, tokenUsage: this.formatTokenUsage(usage) };
//     }

//     parseGeminiImageResponse(response: any): {
//         image: string;
//         tokenUsage: any;
//     } {
//         const usage = response.usageMetadata;

//         for (const part of response.candidates[0].content.parts) {
//             if (part.inlineData) {
//                 return {
//                     image: part.inlineData.data,
//                     tokenUsage: this.formatTokenUsage(usage),
//                 };
//             }
//         }

//         throw new HttpException(
//             'Model returned text instead of image. Please try again.',
//             HttpStatus.BAD_REQUEST,
//         );
//     }
// }
