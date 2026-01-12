import { IsString, IsOptional } from 'class-validator';

export class GenerateCoverImageDto {
    @IsString()
    @IsOptional()
    prompt: string;

    @IsString()
    @IsOptional()
    model?: string;
}
