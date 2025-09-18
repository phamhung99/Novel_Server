import { LightningActionType } from '../enums/app.enum';

export const LIGHTNING_VALUES: Record<LightningActionType, number> = {
    [LightningActionType.COMIC_STORY_GENERATION]: 10,
    [LightningActionType.COMIC_IMAGE_GENERATION]: 3,
};

export const MAX_MSG_COUNT_PER_DAY = 3;
export const COMIC_COOLDOWN_MS = 60 * 1000; // 1 minute