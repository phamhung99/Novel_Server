import { IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
    @IsOptional()
    @IsPositive()
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsPositive()
    @Type(() => Number)
    limit?: number = 10;
}
