import { IsArray, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ImageModel } from '../../common/enums/models.enum';

export class ComicImageRequestDto {
    @IsInt()
    type: number;

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
