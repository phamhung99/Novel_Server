export class VerifyPurchaseDataDto {
    coinsAdded: number;

    productId: string;

    transactionId: number;
}

export class VerifyPurchaseResponseDto {
    success: boolean;

    message: string;

    data: VerifyPurchaseDataDto;
}
