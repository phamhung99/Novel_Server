import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
} from 'class-validator';
import { Platform } from '../../common/enums/platform.enum';

export class ComicGenerateRequestDto {
    @IsString()
    prompt: string;

    @IsOptional()
    @IsEnum(Platform)
    platform?: Platform;

    @IsInt()
    type: number;

    @IsBoolean()
    isFreeComic: boolean;
}
