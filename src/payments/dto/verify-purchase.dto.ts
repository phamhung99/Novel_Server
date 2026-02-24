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

    @IsOptional()
    isXcodeTest?: boolean;
}

export class VerifyPurchaseParamsDto {
    userId: string;
    receipt: string;
    type: IapProductType;
    platform: IapStore;
    xcodeTest?: boolean;
}
