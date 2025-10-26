import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateUserNameDto {
    @IsString()
    @IsOptional()
    @MaxLength(50, { message: 'First name must be less than 50 characters' })
    firstName?: string;

    @IsString()
    @IsOptional()
    @MaxLength(50, { message: 'Last name must be less than 50 characters' })
    lastName?: string;
}
