export default () => ({
    port: parseInt(process.env.PORT, 10) || 5000,
    corsOrigins: process.env.CORS_ORIGINS,
    openAIApiKey: process.env.OPENAI_API_KEY,
});
