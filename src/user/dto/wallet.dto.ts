export class TemporaryCoinDto {
    id: string;
    amount: number;
    source: string;
    expiresAt: string;
    createdAt: string;
}

export class WalletDto {
    totalCoins: number;
    permanentCoins: number;
    temporaryCoins: TemporaryCoinDto[];
}
