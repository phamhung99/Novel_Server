import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(30)
    username?: string;
}
