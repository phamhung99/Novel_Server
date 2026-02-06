import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    AppStoreServerAPIClient,
    Environment,
    SignedDataVerifier,
    JWSTransactionDecodedPayload,
    JWSRenewalInfoDecodedPayload,
} from '@apple/app-store-server-library';
import { IapProductType } from 'src/common/enums/app.enum';

@Injectable()
export class AppStoreService {
    private readonly logger = new Logger(AppStoreService.name);

    private readonly verifier: SignedDataVerifier;
    private readonly apiClient: AppStoreServerAPIClient;

    private readonly bundleId: string;
    private readonly isSandbox: boolean;

    constructor(private configService: ConfigService) {
        const bundleId = this.configService.get<string>('apple.bundleId');
        const appAppleId = this.configService.get<number>('apple.appAppleId');
        const privateKey = this.configService.get<string>('apple.privateKey');
        const keyId = this.configService.get<string>('apple.keyId');
        const issuerId = this.configService.get<string>('apple.issuerId');
        const isSandbox = this.configService.get<boolean>(
            'apple.useSandbox',
            true,
        );

        this.bundleId = bundleId;
        this.isSandbox = isSandbox;

        if (!bundleId || !privateKey || !keyId || !issuerId) {
            throw new Error('Missing Apple Server API credentials');
        }

        const env = isSandbox ? Environment.SANDBOX : Environment.PRODUCTION;

        // SignedDataVerifier để verify JWS local (không gọi API)
        this.verifier = new SignedDataVerifier(
            [], // root certs: thư viện tự load default Apple certs nếu để []
            true, // enableOnlineChecks: true để check revocation nếu cần
            env,
            bundleId,
            appAppleId,
        );

        // API Client để gọi endpoint nếu cần (Get Transaction Info, History, etc.)
        this.apiClient = new AppStoreServerAPIClient(
            privateKey,
            keyId,
            issuerId,
            bundleId,
            env,
        );
    }

    /**
     * Verify signedTransaction (JWS) từ StoreKit 2 client
     * @param signedTransaction - jwsRepresentation từ Transaction ở iOS
     * @param type - SUBSCRIPTION hoặc ONETIME
     */
    async verifyTransaction(
        signedTransaction: string,
        type: IapProductType,
    ): Promise<{
        decoded: JWSTransactionDecodedPayload;
        renewalInfo?: JWSRenewalInfoDecodedPayload;
    }> {
        try {
            // Verify & decode local → nhanh, không gọi mạng
            const decoded =
                await this.verifier.verifyAndDecodeTransaction(
                    signedTransaction,
                );

            let renewalInfo: JWSRenewalInfoDecodedPayload | undefined;
            if (type === IapProductType.SUBSCRIPTION) {
                // Nếu có signedRenewalInfo → verify luôn
                // Thường client gửi kèm nếu là subscription
                // Nếu không có → có thể gọi API lấy sau
            }

            // Optional: check bundleId, productId khớp app của bạn
            if (decoded.bundleId !== this.bundleId) {
                throw new Error('Bundle ID mismatch');
            }

            return { decoded, renewalInfo };
        } catch (err) {
            this.logger.error(`JWS verification failed: ${err.message}`);
            throw new BadRequestException(
                `Invalid Apple transaction signature: ${err.message}`,
            );
        }
    }

    /**
     * Parse dữ liệu decoded để đưa vào processVerifiedPurchase
     */
    parseTransactionData(
        decoded: JWSTransactionDecodedPayload,
        type: IapProductType,
    ): {
        storeProductId: string;
        originalTransactionId: string;
        purchaseTime: number;
        currency: string;
        expiryTime?: number;
        amountPaid?: number;
    } {
        return {
            storeProductId: decoded.productId,
            originalTransactionId: decoded.originalTransactionId,
            purchaseTime: decoded.purchaseDate, // milliseconds
            currency: decoded.currency || 'USD',
            expiryTime:
                type === IapProductType.SUBSCRIPTION
                    ? decoded.expiresDate
                    : undefined,
            amountPaid: decoded.price
                ? Number(decoded.price) / 1000
                : undefined, // price thường là cent → convert
        };
    }

    fakeDecode(type: IapProductType) {
        const randomSuffix = Math.floor(Math.random() * 100000);

        const fakeDecodedSubscription: JWSTransactionDecodedPayload = {
            bundleId: 'com.yourcompany.bedread', // phải khớp với config của bạn
            environment: 'Sandbox', // hoặc "Production"
            transactionId: '2000000123456789',
            originalTransactionId: `2000000098765432${randomSuffix}`,
            productId: 'com.novel.bedread.weekly',
            purchaseDate: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 ngày trước
            signedDate: Date.now(),
            expiresDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // hết hạn sau 7 ngày
            quantity: 1,
            type: 'Auto-Renewable Subscription',
            inAppOwnershipType: 'PURCHASED',
            revocationDate: undefined,
            revocationReason: undefined,
            price: 99000, // 0.99 USD × 100000 (thường là đơn vị 1/1000 cent)
            currency: 'USD',
            offerType: undefined,
            offerIdentifier: undefined,
            subscriptionGroupIdentifier: 'com.novel.bedread.subs',
            // các field khác nếu cần (webOrderLineItemId, isInIntroOfferPeriod, isTrialPeriod, ...)
        };

        const fakeDecodedOnetime: JWSTransactionDecodedPayload = {
            bundleId: 'com.yourcompany.bedread',
            environment: 'Sandbox',
            transactionId: '2000000987654321',
            originalTransactionId: `2000000987654321${randomSuffix}`, // với non-consumable thì thường giống transactionId
            productId: 'com.novel.bedread.coins.1000',
            purchaseDate: Date.now() - 2 * 3600 * 1000, // mua cách đây 2 tiếng
            signedDate: Date.now(),
            expiresDate: undefined, // không có expiry
            quantity: 1,
            type: 'Non-Consumable', // hoặc "Consumable" nếu là coins
            inAppOwnershipType: 'PURCHASED',
            revocationDate: undefined,
            revocationReason: undefined,
            price: 99000, // giả sử 9.99 USD × 100000
            currency: 'USD',
            // không cần subscriptionGroupIdentifier, offerType, expiresDate, ...
        };

        return type === IapProductType.SUBSCRIPTION
            ? fakeDecodedSubscription
            : fakeDecodedOnetime;
    }
}
