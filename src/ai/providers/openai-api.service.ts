import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatModel, ImageModel } from 'src/ai/enum/models.enum';
import OpenAI from 'openai';
import { Platform } from 'src/ai/enum/platform.enum';
import { GptUserComicGenerationDto } from '../dto/gpt-user-comic-generation.dto';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages.constants';
import * as HtmlFormatter from 'src/ai/utils/html-formatter.util';
import { ComicSceneResponseDto } from '../dto/comic-scene-response.dto';
import { ComicStyleType } from '../enum/comic-style-type.enum';
import { DEFAULT_IMAGE } from '../constants/default-image.constants';
import {
    IMAGE_CONSTANTS,
    TEXT_CONSTANTS,
    COMIC,
} from '../constants/ai.constants';
import { GptUserComicSceneGenerationDto } from '../dto/gpt-user-comic-scene-generation.dto';

@Injectable()
export class OpenAIApiService {
    private readonly openAIApiKey: string;
    private readonly openai: OpenAI;

    constructor(private configService: ConfigService) {
        this.openAIApiKey = this.configService.get('openAIApiKey');

        if (!this.openAIApiKey) {
            throw new Error('OpenAI API key is not configured');
        }

        this.openai = new OpenAI({
            apiKey: this.openAIApiKey,
        });
    }

    formatTokenUsage(usage: any): any {
        return {
            promptTokens: usage?.prompt_tokens || 0,
            completionTokens: usage?.completion_tokens || 0,
            totalTokens: usage?.total_tokens || 0,
        };
    }

    async callOpenAITextAPI(
        prompt: string,
        model: ChatModel,
        characterNum: number = TEXT_CONSTANTS.DEFAULT_CHARACTER_COUNT,
        sceneNum: number = TEXT_CONSTANTS.DEFAULT_SCENE_COUNT,
    ): Promise<any> {
        try {
            const jsonFormat = JSON.stringify({
                storyName: '',
                blocked: false,
                characters: [
                    'Character1 Male/Female, hair description, skin color, face features.',
                    'Character2 Male/Female, hair description, skin color, face features.',
                ],
                scenes: [
                    {
                        order: 1,
                        title: '',
                        dialogues: ['A says: Dialogue,'],
                        action: '',
                        prompt: '',
                    },
                ],
            });

            const content = [
                `Create a comic of ${sceneNum} scenes with ${characterNum} characters based on the following text: ${prompt},`,
                `should add character conversation talking to each other in the scenes, should name each scene.`,
                `Then create prompts to illustrate created ${sceneNum} scenes in very detail that can make good images with AI ${Platform.OPENAI},`,
                `should name the characters in the scene prompt, the characters should have physical action toward each other like punch, hit, kiss, hug and each prompt should have only 8 words in full sentence.`,
                `Finally, create ${characterNum} prompts to describe the character appearances in the comic, in very detail about the character appearances, should mention their gender.`,
                `Each prompt must contain only ${TEXT_CONSTANTS.PROMPT_WORD_LIMIT}.`,
                `Should name the characters, mention their hair, skin color and shape.`,
                `No explanation text needed, just give the result prompt!`,
                `Ensure the JSON strictly conforms to the following format, containing only the specified keys and structures without any additional fields: ${jsonFormat}`,
            ].join(' ');

            const response = await this.openai.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: content,
                    },
                ],
                max_completion_tokens: TEXT_CONSTANTS.MAX_COMPLETION_TOKENS,
            });

            return response;
        } catch (error) {
            console.log('OpenAI API error:', error);

            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                ERROR_MESSAGES.CONTENT_GENERATE_ERROR,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async callOpenAIImageAPI(
        scenePrompt: string,
        model: ImageModel,
        characterPrompts: string[],
        comicStyle: ComicStyleType,
        isDevMode?: boolean,
    ): Promise<any> {
        try {
            if (isDevMode) {
                return {
                    data: [
                        {
                            b64_json: DEFAULT_IMAGE,
                        },
                    ],
                };
            }

            let finalPrompt = scenePrompt;

            const revisionPrompt = [
                'As a professional AI comic maker, revise below prompt for Copilot Bing to create comic scene',
                'without any text in the scene and avoid using words that violate Copilot Bing policy:',
                characterPrompts.join(', '),
                'with scene description:',
                scenePrompt,
                'The result should be in full sentences and a maximum of 60 words.',
                'Should add text in the end of the result: Art style:',
                comicStyle,
            ].join(' ');

            const revisionResponse = await this.openai.chat.completions.create({
                model: ChatModel.GPT_4O_MINI,
                messages: [
                    {
                        role: 'user',
                        content: revisionPrompt,
                    },
                ],
                max_completion_tokens: 100,
            });

            const revisedPrompt = revisionResponse.choices[0].message.content;

            finalPrompt = `Create a comic scene about ${revisedPrompt}`;

            const imageConfig: any = {
                model: model,
                prompt: finalPrompt,
                n: IMAGE_CONSTANTS.DEFAULT_COUNT,
            };

            switch (model) {
                case ImageModel.GPT_IMAGE_1:
                    imageConfig.size = IMAGE_CONSTANTS.DEFAULT_SIZE;
                    break;
                case ImageModel.DALLE_2:
                    imageConfig.size = IMAGE_CONSTANTS.DEFAULT_SIZE;
                    imageConfig.response_format =
                        IMAGE_CONSTANTS.RESPONSE_FORMAT;
                    break;
                case ImageModel.DALLE_3:
                    imageConfig.size = IMAGE_CONSTANTS.DEFAULT_SIZE;
                    imageConfig.response_format =
                        IMAGE_CONSTANTS.RESPONSE_FORMAT;
                    break;
                default:
                    throw new HttpException(
                        `Unsupported image model: ${model}`,
                        HttpStatus.BAD_REQUEST,
                    );
            }
            const response = await this.openai.images.generate(imageConfig);

            return response;
        } catch (error) {
            throw new HttpException(
                `Failed to generate image: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async parseOpenAITextResponse(
        response: any,
    ): Promise<GptUserComicGenerationDto> {
        try {
            const message = response.choices[0].message.content;

            try {
                JSON.parse(message);
            } catch {
                throw new HttpException(
                    ERROR_MESSAGES.VIOLATED_SAFETY_POLICIES_PROMPT,
                    HttpStatus.FORBIDDEN,
                );
            }

            const parsed = JSON.parse(message);

            const result = new GptUserComicGenerationDto();
            result.comicName = parsed.storyName || 'Untitled';
            result.blocked = parsed.blocked || false;
            result.createdAt = new Date();
            result.platform = Platform.OPENAI;
            result.type = COMIC;
            result.userId = null; // to be set later

            result.characterPrompts = JSON.stringify(parsed.characters || []);

            if (parsed.scenes && Array.isArray(parsed.scenes)) {
                result.comicSceneGenerations = parsed.scenes.map(
                    (scene: any, index: number) => {
                        const sceneDto = new GptUserComicSceneGenerationDto();
                        sceneDto.order = scene.order || index + 1;
                        sceneDto.title = scene.title || `Scene ${index + 1}`;

                        let rawScript = scene.dialogues
                            ? scene.dialogues.join('\n')
                            : scene.action || '';

                        if (scene.action && scene.dialogues) {
                            rawScript =
                                scene.action +
                                '\n' +
                                scene.dialogues.join('\n');
                        }

                        const formattedScriptArray = HtmlFormatter.boldScript([
                            rawScript,
                        ]);
                        sceneDto.script =
                            formattedScriptArray.length > 0
                                ? formattedScriptArray[0]
                                : rawScript;

                        sceneDto.scenePrompt = scene.prompt || '';
                        return sceneDto;
                    },
                );
            } else {
                result.comicSceneGenerations = [];
            }

            return result;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                ERROR_MESSAGES.CONTENT_GENERATE_ERROR,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async parseOpenAIImageResponse(
        response: any,
    ): Promise<ComicSceneResponseDto> {
        try {
            if (response.data && response.data.length > 0) {
                const imageData = response.data[0];

                if (imageData.b64_json) {
                    return {
                        sceneImageUrls: imageData.b64_json,
                        order: null,
                        isProcessing: false,
                        title: null,
                        script: null,
                        scenePrompt: null,
                        isAds: false,
                        imageGenerationFailed: false,
                    };
                }
            }
            throw new HttpException(
                ERROR_MESSAGES.VIOLATED_SAFETY_POLICIES_PROMPT,
                HttpStatus.FORBIDDEN,
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                ERROR_MESSAGES.CONTENT_GENERATE_ERROR,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
