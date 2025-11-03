import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IStoryGenerationProvider } from './story-generation-provider.interface';

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
        max_tokens: 2000,
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

      const response = await this.client.post('/chat/completions', requestBody);

      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error('Error calling OpenAI API:', error);
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
