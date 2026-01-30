import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { IapProductType } from 'src/common/enums/app.enum';

export class VerifyGooglePlayPurchaseDto {
    @IsString()
    @IsNotEmpty()
    purchaseToken: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(IapProductType)
    type: IapProductType;
}
