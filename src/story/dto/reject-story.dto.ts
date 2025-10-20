import { IsString } from 'class-validator';

export class RejectStoryDto {
    @IsString()
    reason: string;
}
