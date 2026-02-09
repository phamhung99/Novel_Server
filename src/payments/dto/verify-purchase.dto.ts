import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IapProductType, IapStore } from 'src/common/enums/app.enum';

export class VerifyPurchaseDto {
    @IsString()
    @IsOptional()
    purchaseToken?: string;

    @IsString()
    @IsOptional()
    jws?: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(IapProductType)
    type: IapProductType;
}

export class VerifyPurchaseParamsDto {
    userId: string;
    receipt: string;
    type: IapProductType;
    platform: IapStore;
}
