import {
    IsString,
    IsOptional,
    IsEnum,
    IsArray,
    IsUrl,
    IsUUID,
    IsBoolean,
    Min,
    IsInt,
} from 'class-validator';
import { StoryType } from '../../common/enums/story-type.enum';
import { StoryVisibility } from 'src/common/enums/story-visibility.enum';

export class CreateStoryDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    synopsis?: string;

    @IsEnum(StoryType)
    type: StoryType;

    @IsUUID('4')
    mainCategoryId: string;

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    subCategoryIds?: string[];

    @IsEnum(StoryVisibility)
    visibility: StoryVisibility;

    @IsOptional()
    @IsBoolean()
    canEdit?: boolean;

    @IsOptional()
    @IsUrl()
    coverImage?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    freeChaptersCount?: number;

    @IsOptional()
    @IsBoolean()
    isFullyFree?: boolean;
}
