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
import * as fs from 'fs';
import * as path from 'path';

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

        // Load Apple root certificates
        const certsPath = path.join(process.cwd(), 'certs');
        const rootCerts: Buffer[] = [];

        try {
            const certFiles = [
                'AppleIncRootCertificate.cer',
                'AppleRootCA-G2.cer',
                'AppleRootCA-G3.cer',
            ];

            for (const certFile of certFiles) {
                const certPath = path.join(certsPath, certFile);
                if (fs.existsSync(certPath)) {
                    const cert = fs.readFileSync(certPath);
                    rootCerts.push(cert);
                    this.logger.log(`Loaded certificate: ${certFile}`);
                } else {
                    this.logger.warn(`Certificate not found: ${certFile}`);
                }
            }

            if (rootCerts.length === 0) {
                this.logger.warn(
                    'No root certificates loaded, using library defaults',
                );
            } else {
                this.logger.log(
                    `Loaded ${rootCerts.length} Apple root certificates`,
                );
            }
        } catch (error) {
            this.logger.error(`Failed to load certificates: ${error.message}`);
            this.logger.warn('Using library default certificates');
        }

        // SignedDataVerifier with loaded certificates
        this.verifier = new SignedDataVerifier(
            rootCerts.length > 0 ? rootCerts : [], // Use loaded certs or library defaults
            true, // enableOnlineChecks: true for revocation checks
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
}
