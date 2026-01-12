import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import {
    PublishedWithin,
    StorySort,
    StoryStatusFilter,
} from 'src/common/enums/app.enum';

export class DiscoverStoriesDto {
    @IsOptional()
    @IsString()
    keyword?: string;

    @IsOptional()
    @IsString()
    categories?: string;

    @IsOptional()
    @IsEnum(StoryStatusFilter)
    status?: StoryStatusFilter;

    @IsOptional()
    @IsEnum(StorySort)
    sort?: StorySort;

    @IsOptional()
    @IsString()
    minchapters?: string;

    // lets keep both naming conventions for backward compatibility
    @IsOptional()
    @IsEnum(PublishedWithin)
    published_within?: PublishedWithin;

    @IsOptional()
    @IsEnum(PublishedWithin)
    publishedWithin?: PublishedWithin;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;
}
