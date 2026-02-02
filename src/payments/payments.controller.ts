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
        return this.paymentsService.verifyPurchase({
            userId,
            purchaseToken: dto.purchaseToken,
            type: dto.type,
        });
    }

    // @Post('/webhooks/google-play')
    // async handleWebhook(@Body() body: any) {
    //     return this.paymentsService.handleGooglePlayWebhook(body);
    // }

    @Get('/plus-coin')
    async checkUser(): Promise<boolean> {
        return true;
    }
}
