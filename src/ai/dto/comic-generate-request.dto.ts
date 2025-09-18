import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Platform } from '../../common/enums/platform.enum';
import { ComicStyleType } from 'src/common/enums/comic-style-type.enum';

export class ComicGenerateRequestDto {
    @IsString()
    prompt: string;

    @IsOptional()
    @IsEnum(Platform)
    platform?: Platform;

    @IsEnum(ComicStyleType)
    type: ComicStyleType;

    @IsBoolean()
    isFreeComic: boolean;
}
