import { Controller, Headers, Body, Post } from '@nestjs/common';
import { GptTransactionsService } from './gpt-transactions.service';
import { GptTransaction } from './entity/gpt-transaction.entity';
import { GptUserInfoResponseDto } from 'src/common/dto/gpt-user-info-response.dto';
import { GptIapProduct } from 'src/iap-product/entity/gpt-iap-product.entity';
import { IapProductService } from 'src/iap-product/iap-product.service';
import { UserService } from 'src/user/user.service';

@Controller('/iap')
export class GptTransactionsController {
    constructor(
        private readonly gptTransactionsService: GptTransactionsService,
        private readonly iapProductService: IapProductService,
        private readonly userService: UserService,
    ) {}

    @Post('/order/list')
    async submitIapOrderList(
        @Body() transactions: GptTransaction[],
        @Headers('X-USER-ID') userId: string,
        @Headers('X-VERSION') version = 1,
        @Headers('X-PACKAGE') packageName: string,
        @Headers('X-LANGUAGE') language: string,
    ): Promise<GptUserInfoResponseDto> {
        if (transactions && transactions.length > 0) {
            const oneTimeProducts: GptIapProduct[] =
                await this.iapProductService.getOneTimeProducts();
            const tokenMap = new Map<string, string>();

            let addedGen = 0;

            for (const transaction of transactions) {
                if (tokenMap.has(transaction.purchaseToken)) {
                    continue;
                } else {
                    tokenMap.set(
                        transaction.purchaseToken,
                        transaction.orderId,
                    );
                }

                const dbTransactions =
                    await this.gptTransactionsService.findByUserIdAndPurchaseToken(
                        userId,
                        transaction.purchaseToken,
                    );

                if (!dbTransactions || dbTransactions.length === 0) {
                    const dbTransaction =
                        await this.gptTransactionsService.createAndSaveTransaction(
                            {
                                ...transaction,
                                userId,
                            },
                        );

                    const boughtIaps = oneTimeProducts.filter(
                        (p) =>
                            p.storeProductId.toLowerCase() ===
                            transaction.productId.toLowerCase(),
                    );

                    if (boughtIaps.length > 0) {
                        const genNum = boughtIaps[0].generationNumber;
                        addedGen += genNum * dbTransaction.quantity;
                    }
                }
            }

            await this.userService.addOnetimeGen(userId, addedGen);
        }

        await this.userService.createOrUpdateUser(
            userId,
            version,
            packageName,
            language,
            null,
        );

        return await this.userService.getUserInfo(userId);
    }
}
