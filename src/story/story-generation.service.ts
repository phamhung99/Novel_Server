import {
    Injectable,
    BadRequestException,
    HttpException,
    HttpStatus,
    NotFoundException,
    Logger,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Story } from './entities/story.entity';
import { Chapter } from './entities/chapter.entity';
import { StoryGeneration } from './entities/story-generation.entity';
import { GenerationStatus } from 'src/common/enums/app.enum';
import { ChapterGeneration } from './entities/chapter-generation.entity';
import {
    InitializeStoryDto,
    InitializeStoryResponseDto,
} from './dto/generate-story-outline.dto';
import {
    GenerateChapterDto,
    GenerateChapterResponseDto,
} from './dto/generate-chapter.dto';
import { StoryGenerationApiService } from '../ai/providers/story-generation-api.service';
import {
    CHAPTER_CREATION_FEE,
    DEFAULT_AI_PROVIDER,
    DEFAULT_COVER_IMAGE_URL,
    IMAGE_CREATION_FEE,
    IMAGE_PREFIX,
    STORY_CREATION_FEE,
} from 'src/common/constants/app.constant';
import { ChapterService } from './chapter/chapter.service';
import { UserService } from 'src/user/user.service';
import { ILike } from 'typeorm';
import { Category } from './entities/categories.entity';
import { StoryCategory } from './entities/story-category.entity';
import { MediaService } from 'src/media/media.service';
import { isEmptyObject } from 'src/ai/utils/object.utils';
import { cleanNextOptions } from 'src/common/utils/chapter.utils';
import { stripHtml } from 'src/common/utils/html.utils';
import { ImageGeneration } from './entities/image-generation.entity';
import { getEffectiveAiModel } from 'src/common/utils/aiModelSelector';

@Injectable()
export class StoryGenerationService {
    private readonly logger = new Logger(StoryGenerationService.name);
    private readonly MAX_PROMPT_CHARS = 2000;

    constructor(
        @InjectRepository(Story)
        private storyRepository: Repository<Story>,
        @InjectRepository(Chapter)
        private chapterRepository: Repository<Chapter>,
        @InjectRepository(StoryGeneration)
        private storyGenerationRepository: Repository<StoryGeneration>,
        @InjectRepository(ChapterGeneration)
        private chapterGenerationRepository: Repository<ChapterGeneration>,
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>,
        @InjectRepository(StoryCategory)
        private storyCategoryRepository: Repository<StoryCategory>,
        @InjectRepository(ImageGeneration)
        private imageGenerationRepository: Repository<ImageGeneration>,
        private storyGenerationApiService: StoryGenerationApiService,
        private mediaService: MediaService,
        private chapterService: ChapterService,
        private userService: UserService,
        private readonly dataSource: DataSource,
    ) {}

    private sanitizePrompt(input: string): string {
        let s = input ?? '';
        // turn literal "\n" into actual newlines and normalize CRLF
        s = s.replace(/\\n/g, '\n').replace(/\r\n?/g, '\n');
        // remove ASCII control chars (keep newlines)
        s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        // collapse spaces/tabs but keep newlines; limit consecutive blank lines
        s = s
            .replace(/[^\S\n]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        return s.slice(0, this.MAX_PROMPT_CHARS);
    }

    private ensurePromptAllowed(input: string): void {
        if (!input || input.trim().length === 0) {
            throw new BadRequestException('Story prompt cannot be empty');
        }
        if (input.length > this.MAX_PROMPT_CHARS) {
            throw new BadRequestException(
                `Story prompt too long (> ${this.MAX_PROMPT_CHARS} chars)`,
            );
        }
        // basic disallowed words check; expand per your policy
        const disallowed = [/hate|racist|sexist|explicit gore/i];
        if (disallowed.some((r) => r.test(input))) {
            throw new BadRequestException('Prompt contains disallowed content');
        }
    }

    async buildStoryCategories(
        meta: any | undefined | null,
        dtoGenres: string[] | undefined | null,
    ): Promise<StoryCategory[]> {
        if (!meta) {
            throw new BadRequestException(
                'Missing storyContext.meta in outline response',
            );
        }

        const primaryGenreWords = meta.primaryGenre
            ? meta.primaryGenre
                  .trim()
                  .split(/\s+/)
                  .map((w) => w.trim())
                  .filter(Boolean)
            : [];

        const secondaryGenreNames = (meta.secondaryGenres || [])
            .map((g) => g.trim())
            .filter(Boolean);

        const dtoGenreNames = (dtoGenres || [])
            .map((g) => g.trim())
            .filter(Boolean);

        // Query tất cả name có thể dùng: meta + dto
        const searchNames = [
            ...new Set([
                ...primaryGenreWords,
                ...secondaryGenreNames,
                ...dtoGenreNames,
            ]),
        ];

        if (searchNames.length === 0) return [];

        const existingCategories = await this.categoryRepository.find({
            where: searchNames.map((name) => ({
                name: ILike(name),
                isActive: true,
            })),
        });

        const categoryMap = new Map<string, Category>();
        existingCategories.forEach((cat) =>
            categoryMap.set(cat.name.toLowerCase(), cat),
        );

        const storyCategoryEntities: StoryCategory[] = [];
        const addedCategoryIds = new Set<string>();

        let mainCategoryAssigned = false;
        let mainCategoryId: string | null = null;

        // 1) Ưu tiên main từ primaryGenreWords
        for (const word of primaryGenreWords) {
            const cat = categoryMap.get(word.toLowerCase());
            if (!cat) continue;

            storyCategoryEntities.push(
                this.storyCategoryRepository.create({
                    categoryId: cat.id,
                    isMainCategory: true,
                }),
            );
            addedCategoryIds.add(cat.id);
            mainCategoryAssigned = true;
            mainCategoryId = cat.id;
            break;
        }

        // 2) Add meta genres còn lại làm secondary
        const metaAll = [...primaryGenreWords, ...secondaryGenreNames];
        for (const g of metaAll) {
            const cat = categoryMap.get(g.toLowerCase());
            if (!cat) continue;
            if (addedCategoryIds.has(cat.id)) continue;

            storyCategoryEntities.push(
                this.storyCategoryRepository.create({
                    categoryId: cat.id,
                    isMainCategory: false,
                }),
            );
            addedCategoryIds.add(cat.id);
        }

        // 3) Fallback main: nếu chưa có main → dùng dto.genres[0]
        if (!mainCategoryAssigned) {
            const firstDtoName = dtoGenreNames[0]?.toLowerCase();
            const fallbackCat = firstDtoName
                ? categoryMap.get(firstDtoName)
                : undefined;

            if (fallbackCat) {
                storyCategoryEntities.push(
                    this.storyCategoryRepository.create({
                        categoryId: fallbackCat.id,
                        isMainCategory: true,
                    }),
                );
                addedCategoryIds.add(fallbackCat.id);
                mainCategoryAssigned = true;
                mainCategoryId = fallbackCat.id;
            } else if (storyCategoryEntities.length > 0) {
                // vẫn đảm bảo có main
                storyCategoryEntities[0].isMainCategory = true;
                mainCategoryId = storyCategoryEntities[0].categoryId;
                mainCategoryAssigned = true;
            }
        }

        // 4) Add các genres còn lại của DTO làm secondary
        for (const g of dtoGenreNames) {
            const cat = categoryMap.get(g.toLowerCase());
            if (!cat) continue;
            if (cat.id === mainCategoryId) continue;
            if (addedCategoryIds.has(cat.id)) continue;

            storyCategoryEntities.push(
                this.storyCategoryRepository.create({
                    categoryId: cat.id,
                    isMainCategory: false,
                }),
            );
            addedCategoryIds.add(cat.id);
        }

        return storyCategoryEntities;
    }

    async initializeStoryWithOutline(
        userId: string,
        requestId: string,
        dto: InitializeStoryDto,
    ) {
        const exists = await this.storyGenerationRepository.findOne({
            where: { requestId },
        });

        if (exists) {
            this.logger.warn(
                `Duplicate initialization request with requestId ${requestId}`,
            );
            throw new BadRequestException('Duplicate request');
        }

        const storyGeneration = this.storyGenerationRepository.create({
            requestId,
            status: GenerationStatus.PROCESSING,
            aiProvider: dto.aiProvider || DEFAULT_AI_PROVIDER,
            prompt: {
                storyPrompt: dto.storyPrompt,
                numberOfChapters: dto.numberOfChapters,
            },
            attempts: 1,
        });

        this.logger.log(
            `Initializing story generation for requestId: ${requestId}`,
        );

        const savedStoryGeneration =
            await this.storyGenerationRepository.save(storyGeneration);

        let rawResponse: any = null;
        let outlineData: any = null;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            if (!userId) {
                throw new Error('userId is required');
            }

            const user = await this.userService.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (dto.storyPrompt.trim().length === 0) {
                throw new Error('Story prompt cannot be empty');
            }

            const sanitizedPrompt = this.sanitizePrompt(dto.storyPrompt || '');
            this.ensurePromptAllowed(sanitizedPrompt);

            await this.userService.spendCoins({
                userId,
                amount: STORY_CREATION_FEE,
                referenceType: 'story_initialization',
                referenceId: storyGeneration.id,
                description: `Story outline initialization`,
                manager: queryRunner.manager,
            });

            // retry logic
            const MAX_ATTEMPTS = 2;
            let attempt = 1;
            let lastError: any = null;
            let currentRetryDetails = savedStoryGeneration.retryDetails || {};
            let effectiveModel: string;

            while (attempt <= MAX_ATTEMPTS) {
                try {
                    effectiveModel = getEffectiveAiModel(dto, attempt);

                    outlineData =
                        await this.storyGenerationApiService.generateStoryOutline(
                            {
                                storyPrompt: sanitizedPrompt,
                                genres: dto.genres,
                                numberOfChapters: dto.numberOfChapters,
                                aiProvider:
                                    dto.aiProvider || DEFAULT_AI_PROVIDER,
                                aiModel: effectiveModel,
                            },
                        );

                    rawResponse = outlineData.outline;
                    break;
                } catch (err: unknown) {
                    lastError = err;
                    const errMsg =
                        err instanceof Error ? err.message : String(err);

                    this.logger.warn(
                        `Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${errMsg}`,
                    );

                    currentRetryDetails = {
                        ...currentRetryDetails,
                        [`attempt_${attempt}`]: {
                            timestamp: new Date().toISOString(),
                            error: errMsg,
                            rawResponse,
                            aiModel: effectiveModel,
                        },
                    };

                    await this.storyGenerationRepository.update(
                        { id: savedStoryGeneration.id },
                        {
                            attempts: attempt,
                            retryDetails: currentRetryDetails,
                            lastAttemptAt: new Date(),
                        },
                    );

                    attempt++;
                    continue;
                }
            }

            if (!outlineData) {
                throw (
                    lastError ||
                    new Error('Failed to generate story outline after retries')
                );
            }

            // ── Tạo categories ──
            const storyCategoryEntities = await this.buildStoryCategories(
                outlineData.storyContext?.meta,
                dto.genres,
            );

            const story = queryRunner.manager.create(Story, {
                title: outlineData.title,
                synopsis: outlineData.synopsis,
                authorId: userId,
            });

            const savedStory = await queryRunner.manager.save(story);

            if (storyCategoryEntities.length > 0) {
                storyCategoryEntities.forEach((sc) => {
                    sc.storyId = savedStory.id;
                });

                await queryRunner.manager.save(storyCategoryEntities);
            }

            // Update story generation record with story reference and attributes
            await queryRunner.manager.update(
                StoryGeneration,
                { id: savedStoryGeneration.id },
                {
                    storyId: savedStory.id,
                    aiModel: effectiveModel,
                    title: outlineData.title,
                    synopsis: outlineData.synopsis,
                    metadata: {
                        coverImage: outlineData.coverImage,
                        storyContext: outlineData.storyContext,
                    } as any,
                    response: rawResponse,
                    status: GenerationStatus.COMPLETED,
                },
            );

            // Update story's generation reference
            savedStory.generation = savedStoryGeneration;
            await queryRunner.manager.save(savedStory);

            await queryRunner.commitTransaction();

            return {
                message: 'Story initialized successfully',
            };
        } catch (error) {
            console.error('Error initializing story:', error);

            await queryRunner.rollbackTransaction();

            await this.storyGenerationRepository.update(
                { id: savedStoryGeneration.id },
                {
                    status: GenerationStatus.FAILED,
                    errorMessage:
                        error.message ||
                        'Failed to initialize story after retries',
                },
            );

            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: error.message || 'Story initialization failed',
                    error: 'Story initialization failed',
                },
                HttpStatus.BAD_REQUEST,
            );
        } finally {
            await queryRunner.release();
        }
    }

    async generateChapters(
        userId: string,
        storyId: string,
        requestId: string,
        dto: GenerateChapterDto,
    ): Promise<GenerateChapterResponseDto | any> {
        this.logger.log(
            `Initializing chapter generation for requestId: ${requestId}`,
        );

        const exists = await this.chapterGenerationRepository.findOne({
            where: { requestId },
        });

        if (exists) throw new BadRequestException('Duplicate request');

        let savedPreGen: any = null;

        let rawResponse: any = null;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Tạo preGen trước, để luôn có record lưu lỗi
            savedPreGen = this.chapterGenerationRepository.create({
                storyGenerationId: null, // tạm thời null, sẽ update sau nếu có storyGeneration
                chapterNumber: 0, // tạm thời
                requestId,
                prompt: dto.direction || '',
                status: GenerationStatus.PROCESSING,
            });

            savedPreGen =
                await this.chapterGenerationRepository.save(savedPreGen);

            if (!storyId) {
                throw new BadRequestException('storyId is required');
            }

            const storyGeneration =
                await this.storyGenerationRepository.findOne({
                    where: { storyId },
                });

            if (!storyGeneration) {
                throw new BadRequestException(
                    'Story generation record not found. Initialize story first.',
                );
            }

            const existingChapters =
                await this.chapterService.findDetailChaptersByStory(storyId);

            const chapterNumber = existingChapters.length + 1;
            const isFirstChapter = chapterNumber === 1;

            let lastChapter = null;
            let lastChapterGeneration = null;
            let previousChapterMetadata = null;

            if (!isFirstChapter) {
                lastChapter = existingChapters[existingChapters.length - 1];

                lastChapterGeneration =
                    await this.chapterGenerationRepository.findOne({
                        where: {
                            chapterId: lastChapter.id,
                            storyGenerationId: storyGeneration.id,
                        },
                    });

                previousChapterMetadata = JSON.stringify(
                    lastChapterGeneration?.structure ?? '',
                );
            }
            const totalChapters = storyGeneration.prompt.numberOfChapters;

            if (chapterNumber > totalChapters) {
                throw new BadRequestException(
                    'All chapters have already been generated.',
                );
            }

            const storyMetadata = JSON.stringify(
                storyGeneration.metadata?.storyContext ?? '',
            );

            const storyPrompt = storyGeneration.prompt.storyPrompt || '';

            // only need transaction for DB updates and coin deduction
            await this.userService.spendCoins({
                userId,
                amount: CHAPTER_CREATION_FEE,
                referenceType: 'chapter_generation',
                referenceId: storyGeneration.id,
                description: `Chapter generation`,
                manager: queryRunner.manager,
            });

            // retry logic
            const MAX_ATTEMPTS = 2;
            let attempt = 1;
            let chapterStructureResponse: any = null;
            let effectiveModel: string;
            let currentRetryDetails = savedPreGen.retryDetails || {};

            while (attempt <= MAX_ATTEMPTS) {
                try {
                    effectiveModel = getEffectiveAiModel(dto, attempt);

                    if (isFirstChapter) {
                        chapterStructureResponse =
                            await this.storyGenerationApiService.generateFirstChapter(
                                {
                                    storyId,
                                    chapterNumber,
                                    aiProvider: storyGeneration.aiProvider,
                                    storyMetadata,
                                    aiModel: effectiveModel,
                                },
                            );
                    } else {
                        chapterStructureResponse =
                            await this.storyGenerationApiService.generateRemainChapters(
                                {
                                    storyId,
                                    chapterNumber,
                                    aiProvider: storyGeneration.aiProvider,
                                    direction: dto.direction || '',
                                    storyMetadata,
                                    previousChapterMetadata,
                                    storyPrompt: storyPrompt,
                                    aiModel: effectiveModel,
                                },
                            );
                    }

                    rawResponse = chapterStructureResponse.raw;
                    break;
                } catch (err: unknown) {
                    const errMsg =
                        err instanceof Error ? err.message : String(err);

                    this.logger.warn(
                        `Chapter generation attempt ${attempt}/${MAX_ATTEMPTS} failed: ${errMsg}`,
                    );

                    currentRetryDetails = {
                        ...currentRetryDetails,
                        [`attempt_${attempt}`]: {
                            timestamp: new Date().toISOString(),
                            error: errMsg,
                            rawResponse,
                            aiModel: effectiveModel,
                        },
                    };

                    await this.chapterGenerationRepository.update(
                        { id: savedPreGen.id },
                        {
                            attempts: attempt,
                            retryDetails: currentRetryDetails,
                            lastAttemptAt: new Date(),
                        },
                    );

                    attempt++;
                }
            }

            if (!chapterStructureResponse) {
                throw new Error(
                    'Failed to generate chapter structure after retries',
                );
            }

            if (
                !chapterStructureResponse ||
                !chapterStructureResponse.content ||
                chapterStructureResponse.content.trim().length === 0 ||
                isEmptyObject(chapterStructureResponse.structure)
            ) {
                throw new BadRequestException(
                    'Generated chapter missing content or structure, please try again.',
                );
            }

            // Generate chapter summary every 5 chapters
            if (chapterNumber % 5 === 0) {
                try {
                    chapterStructureResponse.structure.chapterSummary =
                        await this.storyGenerationApiService.generateChapterSummary(
                            {
                                storyId,
                                aiProvider: storyGeneration.aiProvider,
                                chapterSummary:
                                    chapterStructureResponse.structure.summary,
                                storyMetadata,
                            },
                        );
                } catch (summaryErr) {
                    this.logger.warn(
                        `Failed to generate chapter summary: ${summaryErr}.`,
                    );
                }
            }

            const chapter = queryRunner.manager.create(Chapter, {
                storyId,
                index: chapterNumber,
                title: chapterStructureResponse.title,
                content: chapterStructureResponse.content,
            });

            const savedChapter = await queryRunner.manager.save(chapter);

            // Update record đã lưu requestId lúc đầu
            await queryRunner.manager.update(
                ChapterGeneration,
                { id: savedPreGen.id },
                {
                    chapterId: savedChapter.id,
                    generatedContent: chapterStructureResponse.content,
                    structure: chapterStructureResponse.structure as any,
                    response: rawResponse,
                    storyGenerationId: storyGeneration.id,
                    chapterNumber,
                    status: GenerationStatus.COMPLETED,
                },
            );

            await queryRunner.manager.update(
                StoryGeneration,
                { id: storyGeneration.id },
                {
                    updatedAt: new Date(),
                },
            );

            await queryRunner.commitTransaction();

            return {
                message: 'Chapter generated successfully',
            };
        } catch (error) {
            this.logger.error('Error generating chapter:', error);

            await queryRunner.rollbackTransaction();

            if (savedPreGen) {
                await this.chapterGenerationRepository.update(
                    { id: savedPreGen.id },
                    {
                        errorMessage:
                            error instanceof Error
                                ? error.message
                                : 'Failed to generate chapter',
                        status: GenerationStatus.FAILED,
                        response: rawResponse,
                    },
                );
            }

            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: error.message || 'Chapter generation failed',
                    error: 'Chapter initialization failed',
                },
                HttpStatus.BAD_REQUEST,
            );
        } finally {
            await queryRunner.release();
        }
    }

    async getStoryGenerationHistory(
        storyId: string,
    ): Promise<StoryGeneration[]> {
        return this.storyGenerationRepository.find({
            where: { storyId },
            relations: ['chapterGenerations'],
            order: { createdAt: 'DESC' },
        });
    }

    async getGenerationById(generationId: string): Promise<StoryGeneration> {
        const generation = await this.storyGenerationRepository.findOne({
            where: { id: generationId },
            relations: ['chapterGenerations'],
        });

        if (!generation) {
            throw new NotFoundException(
                `Generation with ID ${generationId} not found`,
            );
        }

        return generation;
    }

    async getChapterGenerationHistory(
        storyId: string,
    ): Promise<ChapterGeneration[]> {
        return this.chapterGenerationRepository.find({
            where: { storyGeneration: { storyId } },
            relations: ['chapter'],
            order: { createdAt: 'DESC' },
        });
    }

    async previewStory(
        id: string,
        skipImage: boolean = false,
    ): Promise<InitializeStoryResponseDto> {
        const story = await this.storyRepository.findOne({
            where: { id },
            relations: {
                generation: true,
                storyCategories: {
                    category: true,
                },
            },
            select: {
                id: true,
                title: true,
                synopsis: true,
                authorId: true,
                coverImage: true,
                generation: {
                    prompt: true,
                },
            },
        });

        if (!story) {
            throw new NotFoundException(`Story with ID ${id} not found`);
        }

        // Xử lý categories
        const storyCategories = story.storyCategories || [];

        const categories = storyCategories.map((sc) => ({
            id: sc.category.id,
            name: sc.category.name,
        }));

        // Tìm mainCategory (isMainCategory = true)
        const mainStoryCategory = storyCategories.find(
            (sc) => sc.isMainCategory,
        );
        const mainCategory = mainStoryCategory
            ? {
                  id: mainStoryCategory.category.id,
                  name: mainStoryCategory.category.name,
              }
            : categories.length > 0
              ? categories[0]
              : null; // fallback nếu không có main

        return {
            id: story.id,
            title: story.title,
            synopsis: story.synopsis,
            numberOfChapters: story.generation?.prompt?.numberOfChapters || 0,
            mainCategory,
            categories,
            coverImageUrl: skipImage
                ? DEFAULT_COVER_IMAGE_URL
                : await this.mediaService.getMediaUrl(story.coverImage),
        };
    }

    async getInitializationResults(
        requestId: string,
        skipImage: boolean,
    ): Promise<InitializeStoryResponseDto> {
        const generation = await this.storyGenerationRepository.findOne({
            where: { requestId },
        });

        if (!generation) {
            throw new HttpException(
                `No initialization results found for requestId ${requestId}`,
                HttpStatus.NOT_FOUND,
            );
        }

        const { storyId, errorMessage } = generation;

        if (storyId) {
            return this.previewStory(storyId, skipImage);
        }

        if (errorMessage) {
            throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
        }

        throw new HttpException(
            'Story is still being generated. Please try again later.',
            HttpStatus.ACCEPTED,
        );
    }

    async getGeneratedChapterResults(
        requestId: string,
    ): Promise<GenerateChapterResponseDto> {
        const generation = await this.chapterGenerationRepository.findOne({
            where: { requestId },
            relations: ['chapter'],
        });

        if (!generation) {
            throw new HttpException(
                `No generation results found for requestId ${requestId}`,
                HttpStatus.NOT_FOUND,
            );
        }

        if (generation.errorMessage) {
            throw new HttpException(
                generation.errorMessage,
                HttpStatus.BAD_REQUEST,
            );
        }

        if (!generation.chapter) {
            throw new HttpException(
                'Chapter is still being generated. Please try again later.',
                HttpStatus.ACCEPTED,
            );
        }

        const cleanedNextOptions = cleanNextOptions(
            generation.structure?.nextOptions,
        );

        return {
            id: generation.chapter.id,
            storyId: generation.chapter.storyId,
            index: generation.chapter.index,
            title: generation.chapter.title,
            content: generation.chapter.content,
            plainContent: stripHtml(generation.chapter.content),
            structure: {
                nextOptions: cleanedNextOptions,
            },
            createdAt: generation.chapter.createdAt,
            updatedAt: generation.chapter.updatedAt,
        };
    }

    async generateStoryCoverForWeb(
        userId: string,
        storyId: string,
        prompt?: string,
        model?: string,
    ) {
        const story = await this.storyRepository.findOne({
            where: { id: storyId, authorId: userId },
            relations: ['generation'],
        });

        if (!story) {
            throw new NotFoundException(
                'Story not found or you do not have permission',
            );
        }

        if (!story.generation && !prompt) {
            throw new BadRequestException(
                'This story has no generation record',
            );
        }

        let finalPrompt = prompt?.trim();

        if (!finalPrompt) {
            const metadata = story.generation.metadata as any;
            finalPrompt = metadata?.coverImage;

            if (
                !finalPrompt ||
                typeof finalPrompt !== 'string' ||
                finalPrompt.trim() === ''
            ) {
                throw new BadRequestException(
                    'No cover image prompt provided and no default cover prompt found in generation metadata',
                );
            }
        }

        let tempImageUrl: string;
        try {
            tempImageUrl =
                await this.storyGenerationApiService.generateCoverImage(
                    finalPrompt,
                    model,
                );
        } catch (err) {
            throw new BadRequestException(
                `Failed to generate image: ${err.message}`,
            );
        }

        let newCoverImageKey: string | null = null;
        try {
            newCoverImageKey = await this.mediaService.uploadFromSource(
                tempImageUrl,
                { prefix: IMAGE_PREFIX.COVERS },
            );
        } catch (err) {
            throw new InternalServerErrorException(
                `Failed to upload cover image: ${err.message}`,
            );
        }

        const newCoverImageUrl =
            await this.mediaService.getMediaUrl(newCoverImageKey);

        // Lấy key cũ trước khi update
        const oldCoverKey = story.coverImage;

        // Update database
        await this.storyRepository.update(
            { id: storyId },
            { coverImage: newCoverImageKey },
        );

        if (oldCoverKey && oldCoverKey !== newCoverImageKey) {
            this.mediaService.delete(oldCoverKey).catch((err) => {
                console.error(
                    `Failed to delete old cover image: ${oldCoverKey}`,
                    err,
                );
            });
        }

        return {
            coverImageUrl: newCoverImageUrl,
        };
    }

    async generateStoryCoverForMobile(
        requestId: string,
        userId: string,
        storyId: string,
        prompt?: string,
        model?: string,
        save?: boolean,
    ): Promise<{ coverImageUrl: string }> {
        let imageGenRecord;
        const exists = await this.chapterGenerationRepository.findOne({
            where: { requestId },
        });

        if (exists) throw new BadRequestException('Duplicate request');

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            imageGenRecord = this.imageGenerationRepository.create({
                requestId,
                entityType: 'story',
                entityId: storyId,
                purpose: 'story_cover',
                status: GenerationStatus.PROCESSING,
                attempts: 1,
                lastAttemptAt: new Date(),
            });

            imageGenRecord =
                await this.imageGenerationRepository.save(imageGenRecord);

            const story = await this.storyRepository.findOne({
                where: { id: storyId, authorId: userId },
                relations: ['generation'],
            });

            if (!story) {
                throw new NotFoundException(
                    'Story not found or you do not have permission',
                );
            }

            if (!story.generation) {
                throw new BadRequestException(
                    'This story has no generation record',
                );
            }

            let finalPrompt = prompt?.trim();

            if (!finalPrompt) {
                const metadata = story.generation.metadata as any;
                finalPrompt = metadata?.coverImage;

                if (
                    !finalPrompt ||
                    typeof finalPrompt !== 'string' ||
                    finalPrompt.trim() === ''
                ) {
                    throw new BadRequestException(
                        'No cover image prompt provided and no default cover prompt found in generation metadata',
                    );
                }
            }

            let tempImageUrl: string;

            // only need transaction for DB updates and coin deduction
            await this.userService.spendCoins({
                userId,
                amount: IMAGE_CREATION_FEE,
                referenceType: 'story_cover_generation',
                referenceId: imageGenRecord.id,
                description: `Story Cover generation`,
                manager: queryRunner.manager,
            });

            // retry logic
            const MAX_ATTEMPTS = 2;
            let attempt = 1;

            while (attempt <= MAX_ATTEMPTS) {
                try {
                    tempImageUrl =
                        await this.storyGenerationApiService.generateCoverImage(
                            finalPrompt,
                            model,
                        );
                    break;
                } catch (err) {
                    const errMsg =
                        err instanceof Error ? err.message : String(err);

                    this.logger.warn(
                        `Cover image generation attempt ${attempt}/${MAX_ATTEMPTS} failed: ${errMsg}`,
                    );

                    await this.imageGenerationRepository.update(
                        { id: imageGenRecord.id },
                        {
                            attempts: attempt,
                            retryDetails: {
                                ...(imageGenRecord.retryDetails || {}),
                                [`attempt_${attempt}`]: {
                                    timestamp: new Date().toISOString(),
                                    error: errMsg,
                                },
                            },
                        },
                    );

                    attempt++;
                }
            }

            if (!tempImageUrl) {
                throw new Error('Failed to generate cover image after retries');
            }

            let newCoverImageKey: string | null = null;
            try {
                newCoverImageKey = await this.mediaService.uploadFromSource(
                    tempImageUrl,
                    { prefix: IMAGE_PREFIX.COVERS_TEMP },
                );
            } catch (err) {
                throw new InternalServerErrorException(
                    `Failed to upload cover image: ${err.message}`,
                );
            }

            const newCoverImageUrl =
                await this.mediaService.getMediaUrl(newCoverImageKey);

            await queryRunner.manager.update(
                ImageGeneration,
                { id: imageGenRecord.id },
                {
                    imagePath: newCoverImageKey,
                    status: GenerationStatus.COMPLETED,
                    prompt: finalPrompt,
                },
            );

            const shouldSave = save !== undefined ? save : !prompt?.trim();

            if (shouldSave) {
                await queryRunner.manager.update(
                    Story,
                    { id: storyId },
                    { coverImage: newCoverImageKey },
                );
            }

            await queryRunner.commitTransaction();

            return {
                coverImageUrl: newCoverImageUrl,
            };
        } catch (err) {
            const errorMsg =
                err instanceof Error
                    ? err.message
                    : 'Failed to generate/upload cover';

            this.logger.error(
                `Error in generateStoryCoverForMobile for requestId ${requestId}: ${errorMsg}`,
                err instanceof Error ? err.stack : undefined,
            );

            await queryRunner.rollbackTransaction();

            if (imageGenRecord) {
                await this.imageGenerationRepository.update(
                    { id: imageGenRecord.id },
                    {
                        status: GenerationStatus.FAILED,
                        errorMessage: errorMsg,
                        updatedAt: new Date(),
                    },
                );
            }
        } finally {
            await queryRunner.release();
        }
    }

    async getGeneratedCoverImageResult(
        requestId: string,
        skipImage: boolean = false,
    ): Promise<{ coverImageUrl: string }> {
        if (skipImage) {
            return { coverImageUrl: DEFAULT_COVER_IMAGE_URL };
        }

        const imageGen = await this.imageGenerationRepository.findOne({
            where: { requestId },
            order: { createdAt: 'DESC' },
        });

        if (!imageGen) {
            throw new NotFoundException(
                `No cover image generation found for request ${requestId}`,
            );
        }

        // Early exit for most common failure states
        if (imageGen.errorMessage) {
            throw new BadRequestException({
                status: imageGen.status,
                message: imageGen.errorMessage,
            });
        }

        if (imageGen.status === GenerationStatus.PROCESSING) {
            throw new HttpException(
                {
                    status: GenerationStatus.PROCESSING,
                    message:
                        'Cover image is still being generated. Please try again later.',
                },
                HttpStatus.ACCEPTED,
            );
        }

        if (imageGen.status !== GenerationStatus.COMPLETED) {
            throw new BadRequestException({
                status: imageGen.status,
                message:
                    imageGen.errorMessage || 'Unexpected generation status',
            });
        }

        // Only reach here if status === COMPLETED and no error
        let coverImageUrl = DEFAULT_COVER_IMAGE_URL;

        if (imageGen.imagePath) {
            try {
                coverImageUrl = await this.mediaService.getMediaUrl(
                    imageGen.imagePath,
                );
            } catch (err) {
                this.logger.warn(
                    `Failed to generate media URL for path ${imageGen.imagePath}`,
                    err,
                );
                throw new InternalServerErrorException(
                    'Failed to retrieve generated cover image',
                );
            }
        }

        return { coverImageUrl };
    }
}
