import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
} from 'class-validator';
import { ChatModel } from 'src/ai/enum/models.enum';

export class ComicGenerateRequestDto {
    @IsString()
    prompt: string;

    @IsOptional()
    @IsEnum(ChatModel)
    platform?: ChatModel;

    @IsInt()
    type: number;

    @IsBoolean()
    isFreeComic: boolean;
}
