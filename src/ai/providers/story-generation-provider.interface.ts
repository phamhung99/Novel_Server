import { GenerateContentResult } from '../dto/generate-content-result.dto';
import { GenerateRawContentDto } from '../dto/generate-raw-content.dto';

/**
 * Story Generation Provider Interface
 * Defines the contract for AI providers that support story chapter generation
 *
 * This interface is specific to story generation. Other AI services may implement
 * different interfaces for different purposes (e.g., IComicGenerationProvider, IImageGenerationProvider)
 *
 * Example implementations:
 * - GptApiService (OpenAI GPT-4)
 * - GrokApiService (Grok)
 * - ClaudeApiService (Anthropic Claude) - future
 */
export interface IStoryGenerationProvider {
    /**
     * Generate chapter content using AI
     * @param dto - Configuration object for content generation
     * @returns Generated content as string
     */
    generateContent(dto: GenerateRawContentDto): Promise<GenerateContentResult>;

    generateImage(prompt: string, model?: string): Promise<string>;

    /**
     * Get the provider name
     * @returns Provider name (e.g., 'gpt', 'grok')
     */
    getProviderName(): string;

    /**
     * Get the model name
     * @returns Model name (e.g., 'gpt-4o-mini', 'grok-4')
     */
    getModelName(): string;
}
