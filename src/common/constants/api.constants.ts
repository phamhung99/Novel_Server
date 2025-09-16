export const API_ENDPOINTS = {
    GEMINI: {
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
        GENERATE_CONTENT: (model: string, apiKey: string) =>
            `${API_ENDPOINTS.GEMINI.BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
    },
};
