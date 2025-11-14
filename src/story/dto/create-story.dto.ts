import { IsString, IsOptional, IsEnum, IsArray, IsUrl } from 'class-validator';
import { StoryType } from '../../common/enums/story-type.enum';

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

    @IsOptional()
    is_public?: boolean;

    @IsOptional()
    @IsUrl()
    coverImage?: string;
}
