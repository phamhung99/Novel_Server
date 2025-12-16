import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

/**
 * Story attributes defined by user
 * These are used as context for AI chapter generation
 */
export class StoryAttributesDto {
    @IsString()
    title: string;

    @IsString()
    synopsis: string;

    @IsArray()
    @IsString({ each: true })
    genres: string[];

    @IsOptional()
    @IsString()
    mainCharacter?: string;

    @IsOptional()
    @IsString()
    subCharacters?: string;

    @IsOptional()
    @IsString()
    setting?: string;

    @IsOptional()
    @IsString()
    plotTheme?: string;

    @IsOptional()
    @IsString()
    writingStyle?: string;

    @IsOptional()
    @IsString()
    additionalContext?: string;
}

/**
 * Initialize Story with Outline
 * User provides story prompt and genres
 * System generates story outline only (no chapters yet)
 */
export class InitializeStoryDto {
    @IsString()
    storyPrompt: string; // User's story idea/prompt

    @IsArray()
    @IsString({ each: true })
    genres: string[]; // Story genres (e.g., ["Ngôn Tình", "Hệ Thống", "Nữ Cường"])

    @IsNumber()
    numberOfChapters: number; // Total chapters planned (max 10)

    @IsOptional()
    @IsString()
    aiProvider?: 'grok' | 'gpt'; // Default: 'grok'
}

/**
 * Response: Story initialization with outline
 */
export class InitializeStoryResponseDto {
    title: string;
    synopsis: string;
    coverImage: string;
    storyContext: any;
    outline: string;
    message: string;
}
