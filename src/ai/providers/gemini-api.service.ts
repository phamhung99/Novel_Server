import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { API_ENDPOINTS } from 'src/common/constants/api.constants';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages.constants';
import { Platform } from '../enum/platform.enum';
import { TEXT_CONSTANTS } from '../constants/ai.constants';
import { GptUserComicGenerationDto } from '../dto/gpt-user-comic-generation.dto';
import { ChatModel } from 'src/ai/enum/models.enum';
import { ComicSceneResponseDto } from '../dto/comic-scene-response.dto';
import { ComicStyleType } from '../enum/comic-style-type.enum';
import { ComicGenerateRequestDto } from '../dto/comic-generate-request.dto';

@Injectable()
export class GeminiApiService {
    private readonly geminiApiKey: string;

    constructor(private configService: ConfigService) {
        this.geminiApiKey = this.configService.get('geminiApiKey');

        if (!this.geminiApiKey) {
            throw new Error('Gemini API key is not configured');
        }
    }

    async callGeminiTextAPI(
        prompt: string,
        model: ChatModel,
        characterNum: number = TEXT_CONSTANTS.DEFAULT_CHARACTER_COUNT,
        sceneNum: number = TEXT_CONSTANTS.DEFAULT_SCENE_COUNT,
    ): Promise<any> {
        // Compose the prompt similar to OpenAI
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
            `Then create prompts to illustrate created ${sceneNum} scenes in very detail that can make good images with AI Gemini,`,
            `should name the characters in the scene prompt, the characters should have physical action toward each other like punch, hit, kiss, hug and each prompt should have only 8 words in full sentence.`,
            `Finally, create ${characterNum} prompts to describe the character appearances in the comic, in very detail about the character appearances, should mention their gender.`,
            `Each prompt must contain only ${TEXT_CONSTANTS.PROMPT_WORD_LIMIT}.`,
            `Should name the characters, mention their hair, skin color and shape.`,
            `No explanation text needed, just give the result prompt!`,
            `Ensure the JSON strictly conforms to the following format, containing only the specified keys and structures without any additional fields: ${jsonFormat}`,
        ].join(' ');

        const url = API_ENDPOINTS.GEMINI.GENERATE_CONTENT(
            model,
            this.geminiApiKey,
        );

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: content,
                        },
                    ],
                },
            ],
            generationConfig: {
                maxOutputTokens: TEXT_CONSTANTS.MAX_COMPLETION_TOKENS,
            },
        };

        try {
            const response = await axios.post(url, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            return response.data;
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

    async parseGeminiTextResponse(
        response: any,
        comicRequest: ComicGenerateRequestDto,
    ): Promise<GptUserComicGenerationDto> {
        try {
            const message =
                response.candidates?.[0]?.content?.parts?.[0]?.text ||
                response.choices?.[0]?.message?.content;

            console.log('Gemini raw message:', message);

            // Remove markdown code block markers and trim whitespace
            const cleanedMessage = message
                .replace(/^\s*```(?:json)?\s*/i, '')
                .replace(/\s*```\s*$/i, '')
                .trim();

            let parsed: any;
            try {
                parsed = JSON.parse(cleanedMessage);
            } catch (err) {
                throw new HttpException(
                    ERROR_MESSAGES.VIOLATED_SAFETY_POLICIES_PROMPT,
                    HttpStatus.FORBIDDEN,
                );
            }

            const result = new GptUserComicGenerationDto();
            result.comicName = parsed.storyName || 'Untitled';
            result.blocked = parsed.blocked || false;
            result.createdAt = new Date();
            result.platform = Platform.GEMINI;
            result.userId = null;

            const type = comicRequest.type;
            result.type = ComicStyleType[type];

            result.characterPrompts = JSON.stringify(parsed.characters || []);

            result.comicSceneGenerations = Array.isArray(parsed.scenes)
                ? parsed.scenes.map((scene: any, index: number) => {
                      const sceneDto = new ComicSceneResponseDto();
                      sceneDto.order = scene.order || index + 1;
                      sceneDto.title = scene.title || `Scene ${index + 1}`;

                      let rawScript = '';
                      if (scene.action && scene.dialogues) {
                          rawScript =
                              scene.action + '\n' + scene.dialogues.join('\n');
                      } else if (scene.dialogues) {
                          rawScript = scene.dialogues.join('\n');
                      } else if (scene.action) {
                          rawScript = scene.action;
                      }

                      sceneDto.script = rawScript;
                      sceneDto.scenePrompt = scene.prompt || '';
                      return sceneDto;
                  })
                : [];

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
}
