export interface GenerateRawContentDto {
    prompt: string;
    systemPrompt?: string;
    aiProvider?: string;
    maxTokens?: number;
    temperature?: number;
    responseSchema?: object;
}
