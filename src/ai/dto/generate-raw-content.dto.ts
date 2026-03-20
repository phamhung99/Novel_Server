export interface GenerateRawContentDto {
    prompt: string;
    systemPrompt?: string;
    aiProvider?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    responseSchema?: object;
}
