export class VerifyPurchaseDataDto {
    coinsAdded: number;

    productId: string;

    transactionId: number;

    user: any;
}

export class VerifyPurchaseResponseDto {
    success: boolean;

    message: string;

    data: VerifyPurchaseDataDto;
}
