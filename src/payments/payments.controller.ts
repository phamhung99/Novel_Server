import { Controller, Get, Post, Headers, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';
import { VerifyGooglePlayPurchaseDto } from './dto/verify-google-play-purchase.dto';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Post('/purchase/verify')
    @SkipTransform()
    async verifyGooglePlayPurchase(
        @Headers('x-user-id') userId: string,
        @Body() dto: VerifyGooglePlayPurchaseDto,
    ) {
        return this.paymentsService.verifyGooglePlayPurchase({
            userId,
            purchaseToken: dto.purchaseToken,
            type: dto.type,
        });
    }

    // @Post('/webhooks/google-play')
    // async handleGooglePlayWebhook(@Body() body: any) {
    //     return this.paymentsService.handleGooglePlayWebhook(body);
    // }

    @Get('/plus-coin')
    async checkUser(): Promise<boolean> {
        return true;
    }
}
