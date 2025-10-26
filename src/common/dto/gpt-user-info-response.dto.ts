export class GptUserInfoResponseDto {
    userId: string;

    remainingSubGen: number;

    maxSubGen: number;

    remainingOnetimeGen: number;

    subGenResetAt: number;

    needConvertIapPlan: boolean;

    imgGenInDayNum: number;

    genTicketNum: number;

    comicGeneratedCountToday: number;

    freeComicGenCountToday: number;

    proComicGenCountToday: number;

    username: string;

    firstName: string;

    lastName: string;

    profileImage: string;

    static from(
        user: any,
        maxSubGen: number,
        needConvertIapPlan: boolean,
        subGenResetAt: number,
        comicGeneratedCountToday: number,
        freeComicGenCountToday: number,
        proComicGenCountToday: number,
    ): GptUserInfoResponseDto {
        const dto = new GptUserInfoResponseDto();
        dto.userId = user.id;
        dto.firstName = user.firstName || '';
        dto.lastName = user.lastName || '';
        dto.remainingSubGen = user.getRemainingSubGen();
        dto.remainingOnetimeGen = user.getRemainingOnetimeGen();
        dto.maxSubGen = maxSubGen;
        dto.needConvertIapPlan = needConvertIapPlan;
        dto.subGenResetAt = subGenResetAt;
        dto.comicGeneratedCountToday = comicGeneratedCountToday;
        dto.freeComicGenCountToday = freeComicGenCountToday;
        dto.proComicGenCountToday = proComicGenCountToday;
        dto.username = user.username;
        dto.profileImage = user.profileImage;
        return dto;
    }
}
