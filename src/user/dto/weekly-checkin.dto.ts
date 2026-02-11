import { WalletDto } from './wallet.dto';

export class WeekDayDto {
    day: number;
    isChecked: boolean;
    coin: number;
    coinPremium: number;
}

export class AdInfoDto {
    coinsGranted: number;
    currentViews: number;
    maxViews: number;
}

export class WeeklyCheckInDto {
    currentDay: number;
    weekDays: WeekDayDto[];
}

export class RewardResponseDto {
    checkIn: WeeklyCheckInDto;
    adInfo: AdInfoDto;
    wallet: WalletDto;
}

export class WatchAdsResponseDto {
    success: boolean;
    message: string;
    data: {
        adInfo: AdInfoDto;
        wallet: WalletDto;
    };
}

export class WatchAdsUnlockChapterResponseDto {
    success: boolean;
    message: string;
    data: {
        adInfo: AdInfoDto;
        chapterId: string;
    };
}
