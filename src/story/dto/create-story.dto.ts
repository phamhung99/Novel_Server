import { IsString, IsOptional, IsEnum, IsArray, IsUrl } from 'class-validator';
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

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    genres?: string[];

    @IsEnum(StoryVisibility)
    visibility: StoryVisibility;

    @IsOptional()
    @IsUrl()
    coverImage?: string;
}
