import { Controller, Get, Post, Headers, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';
import { VerifyPurchaseDto } from './dto/verify-purchase.dto';
import { IapStore } from 'src/common/enums/app.enum';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Post('/purchase/verify')
    @SkipTransform()
    async verifyPurchase(
        @Headers('x-user-id') userId: string,
        @Headers('x-platform') platform: IapStore,
        @Body() dto: VerifyPurchaseDto,
    ) {
        if (platform === IapStore.ANDROID && !dto.purchaseToken) {
            throw new Error('Purchase token is required for Android purchases');
        }

        if (platform === IapStore.IOS && !dto.jws) {
            throw new Error('JWS is required for iOS purchases');
        }

        const receipt = platform === IapStore.IOS ? dto.jws : dto.purchaseToken;

        return this.paymentsService.verifyPurchase({
            userId,
            receipt,
            type: dto.type,
            xcodeTest: dto.isXcodeTest,
            platform,
        });
    }

    @Post('/webhooks/google-play')
    async handleWebhook(@Body() body: any) {
        return this.paymentsService.handleGooglePlayWebhook(body);
    }

    @Post('/webhooks/app-store')
    async handleAppStoreWebhook(@Body() body: any) {
        return this.paymentsService.handleAppStoreWebhook(body);
    }

    @Get('/plus-coin')
    async checkUser(): Promise<boolean> {
        return true;
    }
}
