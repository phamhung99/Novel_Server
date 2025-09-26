export class PurchasedPackageDto {
    productId: string;
    quantity: number;
    product: {
        description: string;
        price: number;
        periodType: string;
        periodNumber: number;
        generationNumber: number;
        type: string;
    };
}
