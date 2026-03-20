import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_SERVICE_ACCOUNT } from 'src/config/firebase.config';

@Injectable()
export class FirebaseService {
    private readonly logger = new Logger(FirebaseService.name);
    private readonly messaging: admin.messaging.Messaging;

    constructor() {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(
                    FIREBASE_SERVICE_ACCOUNT as admin.ServiceAccount,
                ),
            });
            this.logger.log('Firebase Admin initialized successfully');
        }

        this.messaging = admin.messaging();
    }

    getMessaging() {
        return this.messaging;
    }

    async sendToSingle(
        token: string,
        title: string,
        body: string,
        data: Record<string, string> = {},
    ): Promise<string> {
        const message: admin.messaging.Message = {
            token,
            notification: { title, body },
            data,
            android: { priority: 'high' },
            // apns: { headers: { 'apns-priority': '10' } }, // nếu muốn hỗ trợ iOS tốt hơn
        };

        try {
            const response = await this.messaging.send(message);
            this.logger.debug(`Sent to single token ${token}: ${response}`);
            return response;
        } catch (error) {
            this.logger.error(`Failed to send to ${token}`, error);
            throw error; // hoặc return null tùy business logic
        }
    }

    async sendToMultiple(
        tokens: string[],
        title: string,
        body: string,
        data: Record<string, string> = {},
    ): Promise<{
        successCount: number;
        failureCount: number;
        failedTokens: string[];
    }> {
        if (!tokens.length) {
            return { successCount: 0, failureCount: 0, failedTokens: [] };
        }

        // FCM multicast giới hạn 500 tokens/lần
        const batches = this.chunkArray(tokens, 500);

        let totalSuccess = 0;
        let totalFailure = 0;
        const allFailedTokens: string[] = [];

        for (const batch of batches) {
            const message: admin.messaging.MulticastMessage = {
                tokens: batch,
                notification: { title, body },
                data,
                // android: { priority: 'high' } // không hỗ trợ ở MulticastMessage
            };

            try {
                const batchResponse =
                    await this.messaging.sendEachForMulticast(message);

                totalSuccess += batchResponse.successCount;
                totalFailure += batchResponse.failureCount;

                batchResponse.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const failedToken = batch[idx];
                        allFailedTokens.push(failedToken);
                        this.logger.warn(
                            `Failed token ${failedToken}: ${resp.error?.message}`,
                        );
                    }
                });
            } catch (error) {
                this.logger.error('Multicast batch failed', error);
                // Có thể quyết định retry hoặc mark all batch failed
                allFailedTokens.push(...batch);
                totalFailure += batch.length;
            }
        }

        this.logger.log(
            `Multicast result: ${totalSuccess} success / ${totalFailure} failed`,
        );

        return {
            successCount: totalSuccess,
            failureCount: totalFailure,
            failedTokens: allFailedTokens,
        };
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const result: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    }
}
