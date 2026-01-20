import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import { StoryAttributesDto } from './generate-story-outline.dto';

export class GenerateChapterDto {
    @IsOptional()
    @IsObject()
    storyAttributes?: StoryAttributesDto; // User-defined story context (optional - can be fetched from DB)

    @IsOptional()
    @IsString()
    aiProvider?: 'grok' | 'gpt'; // Default: 'gpt'

    @IsOptional()
    @IsNumber()
    wordCount?: number; // Target word count for chapter

    @IsOptional()
    @IsString()
    storyPrompt?: string; // Custom user prompt for chapter generation

    @IsOptional()
    @IsString()
    direction: string; // Additional direction for chapter generation
}

export interface ChapterStructureResponse {
    chapterNumber: number;
    title: string;
    content: string;
    structure: any;
    raw: string;
}

export interface NextOption {
    label: string;
    description: string;
}

export interface ChapterStructure {
    nextOptions: NextOption[];
}

export class GenerateChapterResponseDto {
    id: string;
    storyId: string;
    index: number;
    title: string;
    content: string;
    structure: ChapterStructure;
    createdAt: Date;
    updatedAt: Date;
}
