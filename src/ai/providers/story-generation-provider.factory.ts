import { Injectable, BadRequestException } from '@nestjs/common';
import { IStoryGenerationProvider } from './story-generation-provider.interface';
import { GptApiService } from './gpt-api.service';
import { GrokApiService } from './grok-api.service';

/**
 * Story Generation Provider Factory
 * Creates and manages story generation AI provider instances
 * 
 * This factory is specific to story generation. Other features can have their own
 * factories (e.g., ComicGenerationProviderFactory, ImageGenerationProviderFactory)
 */
@Injectable()
export class StoryGenerationProviderFactory {
  constructor(
    private gptApiService: GptApiService,
    private grokApiService: GrokApiService,
  ) {}

  /**
   * Get story generation provider by name
   * @param providerName - 'gpt' or 'grok'
   * @returns IStoryGenerationProvider instance
   * @throws BadRequestException if provider not found
   */
  getProvider(providerName: string = 'gpt'): IStoryGenerationProvider {
    const normalizedName = providerName.toLowerCase().trim();

    switch (normalizedName) {
      case 'gpt':
        return this.gptApiService;
      case 'grok':
        return this.grokApiService;
      default:
        throw new BadRequestException(
          `Unsupported story generation provider: ${providerName}. Supported providers: gpt, grok`,
        );
    }
  }

  /**
   * Get list of available story generation providers
   * @returns Array of provider names
   */
  getAvailableProviders(): string[] {
    return ['gpt', 'grok'];
  }
}
