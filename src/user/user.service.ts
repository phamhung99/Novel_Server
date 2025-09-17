import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { GptUser } from './entities/gpt-user.entity';
import { UserComicGenerations } from './entities/user_comic_generations.entity';
import { GptTransactionsService } from 'src/gpt-transactions/gpt-transactions.service';
import { GptUserInfoResponseDto } from './dto/gpt-user-info-response.dto';
import { getStartOfDay, getUnixTimestamp } from 'src/common/utils/date.utils';
import { TIMESTAMP_7DAY } from 'src/common/constants/date.constants';
import { GenerationType } from 'src/common/enums/generation-type.enum';
import { IapProductService } from 'src/iap-product/iap-product.service';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(GptUser)
        private readonly userRepository: Repository<GptUser>,
        @InjectRepository(UserComicGenerations)
        private readonly comicGenRepository: Repository<UserComicGenerations>,
        private readonly gptTransactionsService: GptTransactionsService,
        private readonly IapProductService: IapProductService,
    ) {}

    async findById(userId: string): Promise<GptUser | null> {
        return this.userRepository.findOne({ where: { id: userId } });
    }

    async createOrUpdateUser(
        userId: string,
        version: number,
        packageName: string,
        language: string,
        ip?: string,
    ): Promise<GptUser> {
        let user = await this.findById(userId);
        if (!user) {
            user = this.userRepository.create({
                id: userId,
                version,
                packageName,
                country: language,
                ptokens: Math.random().toString(36).substring(2),
                ipCountryCode: ip,
            });
        } else {
            user.version = version;
            user.packageName = packageName;
            user.country = language;
            if (ip && !user.ipCountryCode) user.ipCountryCode = ip;
        }
        await this.userRepository.save(user);
        return user;
    }

    async getUserInfo(userId: string): Promise<GptUserInfoResponseDto> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            return GptUserInfoResponseDto.from(null, 0, false, 0, 0, 0, 0);
        }

        const comicGeneratedCountToday = await this.comicGenRepository.count({
            where: {
                userId,
                createdAt: MoreThanOrEqual(getStartOfDay(new Date())),
                genType: GenerationType.TEXT,
            },
        });

        const freeComicGenCountToday = await this.comicGenRepository.count({
            where: {
                userId,
                isPro: false,
                createdAt: MoreThanOrEqual(getStartOfDay(new Date())),
                genType: GenerationType.TEXT,
            },
        });

        const proComicGenCountToday = await this.comicGenRepository.count({
            where: {
                userId,
                isPro: true,
                createdAt: MoreThanOrEqual(getStartOfDay(new Date())),
                genType: GenerationType.TEXT,
            },
        });

        const iapTrans =
            await this.gptTransactionsService.getLatestIapTransaction(userId);

        const isPaidUser = !!iapTrans;
        const needConvertIapPlan = isPaidUser && user.isNewIapPlan();

        const subProducts = await this.IapProductService.getSubProducts();

        const subProductIds = subProducts.map((p) => p.storeProductId);

        const latestSub =
            await this.gptTransactionsService.getLatestSubscriptionTransaction(
                userId,
                subProductIds,
            );

        if (!latestSub) {
            return GptUserInfoResponseDto.from(
                user,
                0,
                needConvertIapPlan,
                0,
                comicGeneratedCountToday,
                freeComicGenCountToday,
                proComicGenCountToday,
            );
        }

        const latestProduct = subProducts.find(
            (p) =>
                p.storeProductId.toLowerCase() ===
                latestSub.productId.toLowerCase(),
        );
        if (!latestProduct) {
            return null;
        }

        const purchaseTime = Math.floor(latestSub.purchaseTime / 1000);
        const purchasePeriod = getUnixTimestamp() - purchaseTime;
        const cycleNum = Math.floor(purchasePeriod / TIMESTAMP_7DAY);
        const latestResetAt = purchaseTime + cycleNum * TIMESTAMP_7DAY;

        const needResetSubGen =
            !user.subGenResetAt ||
            Math.floor(user.subGenResetAt.getTime() / 1000) < latestResetAt;

        if (needResetSubGen) {
            user.remainingSubGen = latestProduct.generationNumber;
            user.subGenResetAt = new Date();
            await this.userRepository.save(user);
        }

        const nextResetAt = latestResetAt + TIMESTAMP_7DAY;
        return GptUserInfoResponseDto.from(
            user,
            latestProduct.generationNumber,
            needConvertIapPlan,
            nextResetAt,
            comicGeneratedCountToday,
            freeComicGenCountToday,
            proComicGenCountToday,
        );
    }

    async getImgGenInDayNum(userId: string): Promise<number> {
        const count = await this.comicGenRepository.count({
            where: {
                userId,
                createdAt: MoreThanOrEqual(getStartOfDay(new Date())),
                genType: GenerationType.IMAGE,
            },
        });
        return count;
    }
}
