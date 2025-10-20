import { IsString, IsInt, Min } from 'class-validator';

export class CreateChapterDto {
    @IsInt()
    @Min(1)
    index: number;

    @IsString()
    title: string;

    @IsString()
    content: string;
}
