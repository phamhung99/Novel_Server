import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateCoverImageDto {
    @IsString()
    @IsNotEmpty()
    prompt: string;

    @IsString()
    @IsOptional()
    model?: string;
}
