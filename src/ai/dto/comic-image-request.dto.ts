import { IsArray, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ImageModel } from '../enum/models.enum';

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
}
