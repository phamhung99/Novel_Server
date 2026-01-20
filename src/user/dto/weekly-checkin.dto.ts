import { WalletDto } from './wallet.dto';

export class WeekDayDto {
    day: number;
    isChecked: boolean;
    coin: number;
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
