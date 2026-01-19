import { IsString, IsOptional, IsArray, IsNumber, IsIn } from 'class-validator';

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

export class InitializeStoryDto {
    @IsString()
    storyPrompt: string;

    @IsArray()
    @IsString({ each: true })
    genres: string[];

    @IsNumber()
    numberOfChapters: number;

    @IsOptional()
    @IsIn(['grok', 'gpt', 'gemini'])
    aiProvider: 'grok' | 'gpt' | 'gemini' = 'gemini';
}

class CategoryDto {
    id: string;
    name: string;
}

export class InitializeStoryResponseDto {
    id: string;
    title: string;
    synopsis: string;
    numberOfChapters: number;
    metadata: any;
    mainCategory: CategoryDto;
    categories: CategoryDto[];
    coverImageUrl: string;
}
