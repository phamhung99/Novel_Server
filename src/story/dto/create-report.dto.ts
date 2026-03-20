import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { ReportReason } from '../../user/entities/report.entity';

export class CreateReportDto {
    @IsEnum(ReportReason)
    @IsNotEmpty()
    reason: ReportReason;

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    description?: string;
}
