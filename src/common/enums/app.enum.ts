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
    SILVER = 'silver',
    GOLD = 'gold',
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
