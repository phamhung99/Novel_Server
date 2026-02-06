import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { IapProductType, IapStore } from 'src/common/enums/app.enum';

export class VerifyPurchaseDto {
    @IsString()
    @IsNotEmpty()
    purchaseToken: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(IapProductType)
    type: IapProductType;
}

export class VerifyPurchaseParamsDto {
    userId: string;
    purchaseToken: string;
    type: IapProductType;
    platform: IapStore;
}
