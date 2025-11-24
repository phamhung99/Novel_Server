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

export interface ChapterStructure {
    summary: string;
    directions: string[];
    writingStyle: string;
    tone: string;
    plotLogic: string;
    emotionalMotif: string;
    mainCharacterArc: string;
    subCharacterArc: string;
    antagonistAction: string;
    emotionChart: string;
    philosophicalSubtheme: string;
}

export interface ChapterStructureResponse {
    chapterNumber: number;
    title: string;
    content: string;
    structure: ChapterStructure;
    raw: string;
}
