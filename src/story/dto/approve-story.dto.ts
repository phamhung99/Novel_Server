import { IsString, IsOptional } from 'class-validator';

export class ApproveStoryDto {
    @IsOptional()
    @IsString()
    note?: string;
}
