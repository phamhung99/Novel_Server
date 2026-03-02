import { DEFAULT_AI_PROVIDER } from '../constants/app.constant';

export function getEffectiveAiModel(
    dto: {
        aiProvider?: string;
        aiModel?: string;
    },
    attempt: number = 1,
): string {
    if (dto.aiModel) {
        return dto.aiModel;
    }

    const provider = dto.aiProvider || DEFAULT_AI_PROVIDER;

    switch (provider) {
        case 'gemini': {
            const isFirstAttempt = attempt === 1;
            return isFirstAttempt ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
        }

        case 'grok':
            return 'grok-4';

        case 'gpt':
            return 'gpt-4o-mini';

        default:
            return 'gemini-2.5-flash';
    }
}
