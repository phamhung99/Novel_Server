export enum LightningActionType {
    COMIC_STORY_GENERATION = 'COMIC_STORY_GENERATION',
    COMIC_IMAGE_GENERATION = 'COMIC_IMAGE_GENERATION',
}

export enum GenerationType {
    IMAGE = 'image',
    TEXT = 'text',
}

export enum AllowedFileMimeTypes {
    TXT = 'text/plain',
    DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export enum AllowedImageMimeTypes {
    JPEG = 'image/jpeg',
    PNG = 'image/png',
    JPG = 'image/jpg',
    WEBP = 'image/webp',
}

export enum StorySource {
    AI = 'AI',
    CRAWL = 'Crawl',
    MANUAL = 'Manual',
}

export enum CoinType {
    TEMPORARY = 'temporary',
    PERMANENT = 'permanent',
}

export enum IapStore {
    IOS = 'ios',
    ANDROID = 'android',
}

export enum IapProductType {
    SUBSCRIPTION = 'subscription',
    ONETIME = 'onetime',
}

export enum IapPeriodType {
    DAY = 'day',
    MONTH = 'month',
    YEAR = 'year',
}

export enum ErrorCode {
    // 4000–4099: Validation & Client Input Errors
    INVALID_UUID = 4000,
    EMAIL_ALREADY_EXISTS = 4001,
    DUPLICATE_RECORD = 4002,
    FOREIGN_KEY_VIOLATION = 4003,
    REQUIRED_FIELD_MISSING = 4004,
    NOT_FOUND = 4005,
    USER_TOKEN_NOT_ENOUGH = 4006,
    DUPLICATE_REQUEST_ID = 4007,

    // 4100–4199: Authentication & Authorization Errors
    INVALID_TOKEN = 4100,
    TOKEN_EXPIRED = 4101,
    TOKEN_NOT_ACTIVE = 4102,

    // 4200–4299: Subscription & Payment Errors
    SUBSCRIPTION_NOT_ACTIVE = 4200,
    SUBSCRIPTION_EXPIRED = 4201,

    // 5000–5099: Internal & Server Errors
    DATABASE_ERROR = 5000,
    INTERNAL_SERVER_ERROR = 5001,
}

export enum LibraryType {
    CREATED = 'created',
    LIKED = 'liked',
}

export enum GenerationStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export enum StoryStatusFilter {
    COMPLETED = 'completed',
    ONGOING = 'ongoing',
    ALL = 'all',
}

export enum StorySort {
    POPULAR = 'popular',
    RECENTLY_UPDATED = 'recently_updated',
    RECENTLY_ADDED = 'recently_added',
    RELEASE_DATE = 'release_date',
}

export enum PublishedWithin {
    ALL = 'all',
    DAYS_7 = '7',
    DAYS_30 = '30',
    DAYS_60 = '60',
    DAYS_90 = '90',
    DAYS_365 = '365',
    DAYS_400 = '400',
}

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
    EDITOR = 'editor',
}

export enum ActionType {
    LOGIN = 'login',
    WATCH_AD = 'watch_ad',
    SHARE_STORY = 'share_story',
}
