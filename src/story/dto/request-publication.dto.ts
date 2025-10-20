import { IsString, IsOptional } from 'class-validator';

export class RequestPublicationDto {
    @IsOptional()
    @IsString()
    message?: string;
}
