import { IsArray, ArrayNotEmpty, IsEnum } from 'class-validator';
import { StoryCategory } from 'src/common/enums/app.enum';

export class UpdateUserGenresDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsEnum(StoryCategory, { each: true })
    genres: StoryCategory[];
}
