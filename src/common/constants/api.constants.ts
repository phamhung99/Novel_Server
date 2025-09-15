export const API_ENDPOINTS = {
    GEMINI: {
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
        GENERATE_CONTENT: (model: string, apiKey: string) =>
            `${API_ENDPOINTS.GEMINI.BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
    },
    OPENAI: {
        BASE_URL: 'https://api.openai.com/v1',
        CHAT_COMPLETIONS: () =>
            `${API_ENDPOINTS.OPENAI.BASE_URL}/chat/completions`,
        IMAGE_GENERATIONS: () =>
            `${API_ENDPOINTS.OPENAI.BASE_URL}/images/generations`,
    },
};
