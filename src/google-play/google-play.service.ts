import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import { GOOGLE_SERVICE_ACCOUNT } from 'src/config/google.config';
import {
    ERROR_MESSAGES,
    PACKAGE_NAME_NOVEL,
} from 'src/common/constants/app.constant';
import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';

import {
    GooglePlaySubscriptionPurchaseV2Dto,
    SubscriptionLineItem,
    GooglePlayOneTimePurchaseV2Dto,
} from './dto/google-play.dto';

interface ParsedGooglePlaySubscription {
    storeProductId: string;
    basePlanId: string | undefined;
    subscriptionState: string;
    orderId: string | undefined;
    purchaseTime: Date;
    autoRenew: boolean;
    expiryTime: Date | null;
    isTrial: boolean;
    currency: string | null;
    amountPaid: number | null;
    isSubscription: boolean;
}

@Injectable()
export class GooglePlayService {
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;
    private serviceAccount = GOOGLE_SERVICE_ACCOUNT;

    constructor() {}

    parseSubscriptionResponse(
        subscription: GooglePlaySubscriptionPurchaseV2Dto,
    ): ParsedGooglePlaySubscription {
        const lineItem = subscription.lineItems?.[0] as
            | SubscriptionLineItem
            | undefined;

        if (!lineItem) {
            throw new BadRequestException(
                'No line item found in subscription response',
            );
        }

        const storeProductId = lineItem.productId;
        const basePlanId = lineItem.offerDetails?.basePlanId;
        const subscriptionState = subscription.subscriptionState;
        const orderId =
            lineItem.latestSuccessfulOrderId ?? subscription.latestOrderId;
        const purchaseTime = new Date(subscription.startTime);
        const autoRenew = lineItem.autoRenewingPlan?.autoRenewEnabled ?? false;
        const expiryTime = lineItem.expiryTime
            ? new Date(lineItem.expiryTime)
            : null;
        const isTrial =
            lineItem.offerDetails?.offerId?.includes('trial') ?? false;

        const recurringPrice = lineItem.autoRenewingPlan.recurringPrice;

        const currency = recurringPrice?.currencyCode ?? null;

        const amountPaid =
            recurringPrice?.units !== undefined
                ? parseInt(recurringPrice.units, 10)
                : null;

        const isSubscription = true;

        return {
            storeProductId,
            basePlanId,
            subscriptionState,
            orderId,
            purchaseTime,
            autoRenew,
            expiryTime,
            isTrial,
            currency,
            amountPaid,
            isSubscription,
        };
    }

    parseProductPurchaseResponse(
        productPurchase: GooglePlayOneTimePurchaseV2Dto,
    ): ParsedGooglePlaySubscription {
        const lineItem = productPurchase.productLineItem?.[0];

        if (!lineItem) {
            throw new BadRequestException(
                'No product line item found in purchase response',
            );
        }

        const storeProductId = lineItem.productId;
        const orderId = productPurchase.orderId;
        const purchaseTime = productPurchase.purchaseCompletionTime
            ? new Date(productPurchase.purchaseCompletionTime)
            : new Date();

        return {
            storeProductId,
            basePlanId: undefined,
            subscriptionState: 'N/A',
            orderId,
            purchaseTime,
            autoRenew: false,
            expiryTime: null,
            isTrial: false,
            currency: null,
            amountPaid: null,
            isSubscription: false,
        };
    }

    async getAccessToken(): Promise<string> {
        const now = Math.floor(Date.now() / 1000);
        if (this.accessToken && now < this.tokenExpiresAt - 60)
            return this.accessToken;

        const payload = {
            iss: this.serviceAccount.client_email,
            scope: 'https://www.googleapis.com/auth/androidpublisher',
            aud: this.serviceAccount.token_uri,
            iat: now,
            exp: now + 3600,
        };

        const jwtToken = jwt.sign(payload, this.serviceAccount.private_key, {
            algorithm: 'RS256',
        });

        const res = await fetch(this.serviceAccount.token_uri, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwtToken,
            }),
        });

        const data = await res.json();
        if (!data.access_token)
            throw new InternalServerErrorException(
                ERROR_MESSAGES.FAILED_TO_GET_GOOGLE_ACCESS_TOKEN,
            );

        this.accessToken = data.access_token;
        this.tokenExpiresAt = now + data.expires_in;
        return this.accessToken;
    }

    async verifySubscription(
        purchaseToken: string,
    ): Promise<GooglePlaySubscriptionPurchaseV2Dto> {
        const packageName = PACKAGE_NAME_NOVEL;

        const token = await this.getAccessToken();
        const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${purchaseToken}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            throw new BadRequestException(
                `${ERROR_MESSAGES.VERIFY_SUBSCRIPTION_FAILED} ${res.statusText}`,
            );
        }
        return await res.json();
    }

    async verifyProductPurchase(
        purchaseToken: string,
    ): Promise<GooglePlayOneTimePurchaseV2Dto> {
        const token = await this.getAccessToken();

        const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME_NOVEL}/purchases/productsv2/tokens/${purchaseToken}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok)
            throw new Error(`Verify product failed: ${res.statusText}`);
        return await res.json();
    }
}
