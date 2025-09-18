import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ImageModel } from '../../common/enums/models.enum';
import { ComicStyleType } from 'src/common/enums/comic-style-type.enum';

export class ComicImageRequestDto {
    @IsEnum(ComicStyleType)
    type: ComicStyleType;

    @IsArray()
    @IsString({ each: true })
    characterPrompts: string[];

    @IsString()
    scenePrompt: string;

    @IsOptional()
    @IsEnum(ImageModel)
    platform?: ImageModel;

    @IsOptional()
    isDevMode?: boolean;
}
