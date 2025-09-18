import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { GptUser } from './entities/gpt-user.entity';
import { UserComicGenerations } from './entities/user_comic_generations.entity';
import { GptTransactionsService } from 'src/gpt-transactions/gpt-transactions.service';
import { GptUserInfoResponseDto } from '../common/dto/gpt-user-info-response.dto';
import { getStartOfDay, getUnixTimestamp } from 'src/common/utils/date.utils';
import { TIMESTAMP_7DAY } from 'src/common/constants/date.constants';
import { GenerationType } from 'src/common/enums/app.enum';
import { IapProductService } from 'src/iap-product/iap-product.service';
import { LightningActionType } from 'src/common/enums/app.enum';
import {
    COMIC_COOLDOWN_MS,
    LIGHTNING_VALUES,
} from 'src/common/constants/app.constant';

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

    getLightningSubtractValueByType(type: LightningActionType): number {
        return LIGHTNING_VALUES[type] ?? 3;
    }

    async subtractLightningForComicAction(
        userId: string,
        action: LightningActionType,
    ): Promise<void> {
        const lightningSubtractValue =
            this.getLightningSubtractValueByType(action);

        const user = await this.userRepository.findOneBy({ id: userId });
        await this.subtractLighting(user, lightningSubtractValue);
    }

    async subtractLighting(user: GptUser, subtractedGen: number) {
        if (
            !user ||
            (user.remainingSubGen < subtractedGen &&
                user.remainingOnetimeGen < subtractedGen)
        ) {
            throw new BadRequestException(
                "You don't have lightning to use this feature. Please buy lightning or premium plan to continue!",
            );
        }

        if (user.remainingSubGen >= subtractedGen) {
            await this.userRepository.update(user.id, {
                remainingSubGen: user.remainingSubGen - subtractedGen,
            });

            const updatedUser = await this.userRepository.findOneBy({
                id: user.id,
            });

            const subProducts = await this.IapProductService.getSubProducts();

            const subProductIds = subProducts.map((p) => p.storeProductId);

            const latestSub =
                await this.gptTransactionsService.getLatestSubscriptionTransaction(
                    updatedUser.id,
                    subProductIds,
                );

            if (!latestSub) return;

            const sameTransactions =
                await this.gptTransactionsService.findByOrderId(
                    latestSub.orderId,
                );

            for (const tmpTransaction of sameTransactions) {
                if (tmpTransaction.userId !== updatedUser.id) {
                    const sameUser = await this.userRepository.findOneBy({
                        id: tmpTransaction.userId,
                    });
                    if (sameUser) {
                        sameUser.remainingSubGen = updatedUser.remainingSubGen;
                        sameUser.subGenResetAt = updatedUser.subGenResetAt;
                        await this.userRepository.save(sameUser);
                    }
                }
            }
        } else if (user.remainingOnetimeGen >= subtractedGen) {
            user.remainingOnetimeGen -= subtractedGen;
            await this.userRepository.save(user);
        } else {
            throw new BadRequestException(
                "You don't have lightning to use this feature. Please buy lightning or premium plan to continue!",
            );
        }
    }

    async increaseComicGeneratedCountToday({
        userId,
        isPro,
        genType = GenerationType.TEXT,
        platform,
    }: {
        userId: string;
        isPro: boolean;
        genType?: GenerationType;
        platform: string;
    }): Promise<void> {
        const newGen = this.comicGenRepository.create({
            userId,
            isPro,
            genType,
            platform,
            createdAt: new Date(),
        });
        await this.comicGenRepository.save(newGen);
    }

    async hasReachedDailyComicLimit(
        userId: string,
        limit: number,
    ): Promise<boolean> {
        const count = await this.comicGenRepository.count({
            where: {
                userId,
                createdAt: MoreThanOrEqual(getStartOfDay(new Date())),
                genType: GenerationType.TEXT,
            },
        });
        return count >= limit;
    }

    async increaseImageGeneratedCountToday(
        userId: string,
        isPro: boolean,
        genType: GenerationType = GenerationType.IMAGE,
        platform: string,
    ): Promise<void> {
        const newGen = this.comicGenRepository.create({
            userId,
            isPro,
            genType,
            platform,
            createdAt: new Date(),
        });
        await this.comicGenRepository.save(newGen);
    }

    async checkComicCooldown(userId: string): Promise<void> {
        const lastGen = await this.comicGenRepository.findOne({
            where: { userId },
            order: { createdAt: 'DESC' },
        });

        if (lastGen) {
            const now = new Date();
            const diffMs = now.getTime() - lastGen.createdAt.getTime();
            if (diffMs < COMIC_COOLDOWN_MS) {
                throw new BadRequestException(
                    `Please wait ${COMIC_COOLDOWN_MS / 1000} seconds before making another request.`,
                );
            }
        }
    }

    async addOnetimeGen(userId: string, addedGen: number): Promise<void> {
        if (!addedGen || addedGen <= 0) return;
        const user = await this.findById(userId);
        if (user) {
            user.remainingOnetimeGen =
                (user.remainingOnetimeGen || 0) + addedGen;
            await this.userRepository.save(user);
        }
    }
}
