import { IsString, IsNumber } from 'class-validator';

export class GptUserComicSceneGenerationDto {
    @IsString()
    script: string;

    @IsString()
    scenePrompt: string;

    @IsString()
    title: string;

    @IsNumber()
    order: number;
}
