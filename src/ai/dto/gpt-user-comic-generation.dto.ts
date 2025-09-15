import {
    IsOptional,
    IsString,
    IsBoolean,
    IsNumber,
    IsArray,
    IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GptUserComicSceneGenerationDto } from './gpt-user-comic-scene-generation.dto';

export class GptUserComicGenerationDto {
    @IsOptional()
    @IsNumber()
    id?: number;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsDateString()
    createdAt?: Date;

    @IsOptional()
    @IsString()
    prompt?: string;

    @IsOptional()
    @IsString()
    comicName?: string;

    @IsOptional()
    @IsNumber()
    lastStep?: number;

    @IsOptional()
    @IsBoolean()
    blocked?: boolean;

    @IsOptional()
    @IsString()
    platform?: string;

    @IsOptional()
    @IsString()
    characterPrompts?: string;

    @IsOptional()
    @IsString()
    characterResult?: string;

    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsArray()
    @Type(() => GptUserComicSceneGenerationDto)
    comicSceneGenerations?: GptUserComicSceneGenerationDto[] = [];
}
