import { SUBSCRIPTION_STATUS } from 'src/common/enums/app.enum';

export interface GooglePlayOneTimePurchaseV2Dto {
    kind: string;
    productLineItem: any;
    purchaseStateContext?: any;
    testPurchaseContext?: any;
    orderId?: string;
    obfuscatedExternalAccountId?: string;
    obfuscatedExternalProfileId?: string;
    regionCode?: string;
    purchaseCompletionTime?: string; // ISO 8601
    acknowledgementState?: number; // enum AcknowledgementState
}

export interface GooglePlaySubscriptionPurchaseV2Dto {
    kind: 'androidpublisher#subscriptionPurchaseV2';
    startTime: string; // ISO 8601
    regionCode: string;
    subscriptionState: SUBSCRIPTION_STATUS;
    latestOrderId: string;
    testPurchase?: Record<string, any>;
    acknowledgementState: AcknowledgementState;
    lineItems: SubscriptionLineItem[];
    etag: string;
}

export enum AcknowledgementState {
    UNSPECIFIED = 'ACKNOWLEDGEMENT_STATE_UNSPECIFIED',
    ACKNOWLEDGED = 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    PENDING = 'ACKNOWLEDGEMENT_STATE_PENDING',
}

export interface SubscriptionLineItem {
    productId: string;
    expiryTime: string; // ISO 8601
    autoRenewingPlan?: AutoRenewingPlan;
    offerDetails: OfferDetails;
    latestSuccessfulOrderId: string;
    offerPhase?: OfferPhase;
}

export interface AutoRenewingPlan {
    autoRenewEnabled: boolean;
    recurringPrice?: Price;
}

export interface Price {
    currencyCode: string;
    units: string;
    nanos?: string;
}

export interface OfferDetails {
    basePlanId: string;
    offerId?: string;
    offerTags?: string[];
}

export interface OfferPhase {
    basePrice?: Price;
}
