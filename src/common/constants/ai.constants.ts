export const IMAGE_CONSTANTS = {
    DEFAULT_SIZE: '1024x1024' as const,
    RESPONSE_FORMAT: 'b64_json' as const,
    DEFAULT_COUNT: 1,
    SIZES: {
        SMALL: '256x256',
        MEDIUM: '512x512',
        LARGE: '1024x1024',
        HD: '1792x1024',
    },
    FORMATS: {
        URL: 'url',
        B64_JSON: 'b64_json',
    },
} as const;

export const TEXT_CONSTANTS = {
    MAX_COMPLETION_TOKENS: 800,
    DEFAULT_CHARACTER_COUNT: 2,
    DEFAULT_SCENE_COUNT: 6,
    PROMPT_WORD_LIMIT: 8,
} as const;
