import { IsString, IsOptional, IsNumber, IsObject, IsArray } from 'class-validator';
import { StoryAttributesDto } from './generate-story-outline.dto';

export class GenerateChapterDto {
  @IsString()
  storyId: string;

  @IsNumber()
  chapterNumber: number;

  @IsOptional()
  @IsObject()
  storyAttributes?: StoryAttributesDto; // User-defined story context (optional - can be fetched from DB)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  previousChaptersSummaries?: string[]; // Summaries of all previous chapters for context

  @IsOptional()
  @IsString()
  aiProvider?: 'grok' | 'gpt'; // Default: 'gpt'

  @IsOptional()
  @IsNumber()
  wordCount?: number; // Target word count for chapter
}

export class ChapterStructureResponseDto {
  chapterNumber: number;

  openingHook: string;

  sceneSetting: string;

  characterIntroduction: string;

  plotDevelopment: string;

  content?: string; // Full generated content
}

/**
 * Request 3: Generate complete chapter
 * Using the chapter structure, generate full chapter content + summary + image prompt
 */
export class GenerateCompleteChapterDto {
  @IsString()
  storyId: string;

  @IsNumber()
  chapterNumber: number;

  @IsString()
  chapterStructure: string; // The chapter structure from Request 2

  @IsOptional()
  @IsNumber()
  wordCount?: number; // Target word count (e.g., 1300)

  @IsOptional()
  @IsString()
  aiProvider?: 'grok' | 'gpt'; // Default: 'gpt'
}

/**
 * Response 3: Complete chapter with summary and image prompt
 */
export class CompleteChapterResponseDto {
  chapterNumber: number;
  content: string; // Full chapter content (~1300 words)
  summary: string; // Chapter summary (~200 words)
  imagePrompt: string; // Image generation prompt (~200 characters)
}
