import { IsArray, ArrayNotEmpty } from 'class-validator';

export class UpdateUserGenresDto {
    @IsArray()
    @ArrayNotEmpty()
    categoryIds: string[];
}
