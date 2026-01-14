import { IsEnum, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { StorySource } from 'src/common/enums/app.enum';

export class PaginationDto {
    @IsOptional()
    @IsPositive()
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsPositive()
    @Type(() => Number)
    limit?: number = 20;

    @IsOptional()
    @IsString()
    keyword?: string;

    @IsOptional()
    @IsEnum(StorySource)
    source?: StorySource;

    @IsOptional()
    @IsString()
    authorId?: string;

    @IsOptional()
    @IsString()
    sort?: string;
}
