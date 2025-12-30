import {
    Injectable,
    BadRequestException,
    HttpException,
    HttpStatus,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Story } from './entities/story.entity';
import { Chapter } from './entities/chapter.entity';
import {
    StoryGeneration,
    GenerationType,
} from './entities/story-generation.entity';
import { GenerationStatus } from 'src/common/enums/app.enum';
import { ChapterGeneration } from './entities/chapter-generation.entity';
import {
    InitializeStoryDto,
    InitializeStoryResponseDto,
} from './dto/generate-story-outline.dto';
import {
    ChapterStructureResponse,
    GenerateChapterDto,
    GenerateChapterResponseDto,
} from './dto/generate-chapter.dto';
import { StoryGenerationApiService } from '../ai/providers/story-generation-api.service';
import { DoSpacesService } from 'src/upload/do-spaces.service';
import { DEFAULT_COVER_IMAGE_URL } from 'src/common/constants/app.constant';
import { ChapterService } from './chapter.service';
import { UserService } from 'src/user/user.service';
import { ILike } from 'typeorm';
import { Category } from './entities/categories.entity';
import { StoryCategory } from './entities/story-category.entity';

@Injectable()
export class StoryGenerationService {
    private readonly logger = new Logger(StoryGenerationService.name);

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
        private storyGenerationApiService: StoryGenerationApiService,
        private doSpacesService: DoSpacesService,
        private chapterService: ChapterService,
        private userService: UserService,
    ) {}

    // Chapter Generation Methods (Incremental On-Demand)

    /**
     * REQUEST 1: Initialize story with outline
     * Generates story outline only (no chapters)
     * Saves story attributes for reuse across chapters
     */
    async initializeStoryWithOutline(
        userId: string,
        requestId: string,
        skipImage: boolean,
        dto: InitializeStoryDto,
    ): Promise<InitializeStoryResponseDto> {
        const exists = await this.storyGenerationRepository.findOne({
            where: { requestId },
        });
        if (exists) throw new BadRequestException('Duplicate request');

        const storyGeneration = this.storyGenerationRepository.create({
            requestId,
            type: GenerationType.CHAPTER,
            status: GenerationStatus.IN_PROGRESS,
            aiProvider: dto.aiProvider || 'grok',
            aiModel: (() => {
                switch (dto.aiProvider) {
                    case 'grok':
                        return 'grok-4';
                    case 'gpt':
                        return 'gpt-4o-mini';
                    case 'gemini':
                        return 'gemini-3-pro-preview';
                    default:
                        return 'grok-4';
                }
            })(),
            prompt: {
                storyPrompt: dto.storyPrompt,
                numberOfChapters: dto.numberOfChapters,
            },
        });

        this.logger.log(
            `Initializing story generation for requestId: ${requestId}`,
        );

        const savedStoryGeneration =
            await this.storyGenerationRepository.save(storyGeneration);
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

            const outlineResponse =
                await this.storyGenerationApiService.generateStoryOutline({
                    storyPrompt: dto.storyPrompt,
                    genres: dto.genres,
                    numberOfChapters: dto.numberOfChapters,
                    aiProvider: dto.aiProvider || 'grok',
                });

            // ==== PHẦN MỚI: LẤY CATEGORY TỪ storyContext.meta ====
            const meta = outlineResponse.storyContext?.meta;
            if (!meta) {
                throw new Error(
                    'Missing storyContext.meta in outline response',
                );
            }

            const primaryGenreWords = meta.primaryGenre
                ? meta.primaryGenre
                      .trim()
                      .split(/\s+/)
                      .map((word) => word.trim())
                      .filter((word) => word.length > 0)
                : [];

            const secondaryGenreNames = (meta.secondaryGenres || [])
                .map((g: string) => g.trim())
                .filter((g: string) => g);

            const allGenreNames = [
                ...new Set([...primaryGenreWords, ...secondaryGenreNames]),
            ];

            const existingCategories = await this.categoryRepository.find({
                where: allGenreNames.map((name) => ({
                    name: ILike(name),
                    isActive: true,
                })),
            });

            // Map name -> category entity để dễ lookup
            const categoryMap = new Map<string, Category>();
            existingCategories.forEach((cat) => categoryMap.set(cat.name, cat));

            // ==== TẠO CÁC StoryCategory ====
            const storyCategoryEntities: StoryCategory[] = [];

            let mainCategoryAssigned = false;
            let usedMainGenreWord: string | null = null;
            // Ưu tiên gán main category từ primaryGenre (lấy từ đầu tiên match được)
            for (const word of primaryGenreWords) {
                const lowerWord = word.toLowerCase();
                if (categoryMap.has(lowerWord)) {
                    const cat = categoryMap.get(lowerWord)!;
                    storyCategoryEntities.push(
                        this.storyCategoryRepository.create({
                            categoryId: cat.id,
                            isMainCategory: true,
                        }),
                    );
                    mainCategoryAssigned = true;
                    usedMainGenreWord = word; // Lưu lại từ gốc (không lowercase)
                    categoryMap.delete(lowerWord);
                    break; // Chỉ gán 1 main
                }
            }

            // Gán các genre còn lại làm secondary
            const remainingGenres =
                mainCategoryAssigned && usedMainGenreWord
                    ? [
                          // Bỏ từ đã dùng làm main khỏi primaryWords
                          ...primaryGenreWords.filter(
                              (w) => w !== usedMainGenreWord,
                          ),
                          ...secondaryGenreNames,
                      ]
                    : [...primaryGenreWords, ...secondaryGenreNames];

            for (const genre of remainingGenres) {
                const lowerGenre = genre.toLowerCase();
                if (categoryMap.has(lowerGenre)) {
                    const cat = categoryMap.get(lowerGenre)!;
                    storyCategoryEntities.push(
                        this.storyCategoryRepository.create({
                            categoryId: cat.id,
                            isMainCategory: false,
                        }),
                    );
                    categoryMap.delete(lowerGenre);
                }
            }

            // Nếu không có primary nào match → lấy cái đầu tiên làm main
            if (!mainCategoryAssigned && storyCategoryEntities.length > 0) {
                storyCategoryEntities[0].isMainCategory = true;
            }

            let coverImageKey: string | null = null;

            if (!skipImage) {
                const tempImageUrl =
                    await this.storyGenerationApiService.generateCoverImage(
                        outlineResponse.coverImage,
                    );

                coverImageKey =
                    await this.doSpacesService.uploadFromStream(tempImageUrl);
            }

            const coverImageUrl = skipImage
                ? DEFAULT_COVER_IMAGE_URL
                : await this.doSpacesService.getImageUrl(coverImageKey);

            const story = this.storyRepository.create({
                title: outlineResponse.title,
                synopsis: outlineResponse.synopsis,
                authorId: userId,
                coverImage: coverImageKey,
            });

            const savedStory = await this.storyRepository.save(story);

            if (storyCategoryEntities.length > 0) {
                storyCategoryEntities.forEach((sc) => {
                    sc.storyId = savedStory.id;
                });

                await this.storyCategoryRepository.save(storyCategoryEntities);
            }

            // Update story generation record with story reference and attributes
            await this.storyGenerationRepository.update(
                { id: savedStoryGeneration.id },
                {
                    storyId: savedStory.id,
                    response: {
                        outline: outlineResponse.outline,
                    } as any,
                    title: outlineResponse.title,
                    synopsis: outlineResponse.synopsis,
                    metadata: {
                        coverImage: outlineResponse.coverImage,
                        storyContext: outlineResponse.storyContext,
                    } as any,
                    status: GenerationStatus.COMPLETED,
                },
            );

            // Update story's generation reference
            savedStory.generation = savedStoryGeneration;
            await this.storyRepository.save(savedStory);

            return {
                id: savedStory.id,
                title: story.title,
                synopsis: story.synopsis,
                coverImageUrl: coverImageUrl,
                metadata: outlineResponse.storyContext,
                outline: outlineResponse.outline,
                message:
                    'Story outline generated successfully. Ready to generate chapters on-demand.',
            };
        } catch (error) {
            console.error('Error initializing story:', error);

            await this.storyGenerationRepository.update(
                { id: savedStoryGeneration.id },
                {
                    status: GenerationStatus.FAILED,
                    errorMessage: error.message || 'Failed to initialize story',
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
        }
    }

    async generateChapters(
        storyId: string,
        requestId: string,
        dto: GenerateChapterDto,
    ): Promise<GenerateChapterResponseDto | any> {
        let savedPreGen: any = null;

        try {
            this.logger.log(
                `Initializing chapter generation for requestId: ${requestId}`,
            );

            const exists = await this.chapterGenerationRepository.findOne({
                where: { requestId },
            });
            if (exists) throw new BadRequestException('Duplicate request');

            // Tạo preGen trước, để luôn có record lưu lỗi
            savedPreGen = this.chapterGenerationRepository.create({
                storyGenerationId: null, // tạm thời null, sẽ update sau nếu có storyGeneration
                chapterNumber: 0, // tạm thời
                requestId,
                prompt: dto.direction || '',
                status: GenerationStatus.IN_PROGRESS,
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
                await this.chapterService.findChaptersByStory(storyId);

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

            let chapterStructureResponse: ChapterStructureResponse;

            const storyMetadata = JSON.stringify(
                storyGeneration.metadata?.storyContext ?? '',
            );

            const storyPrompt = storyGeneration.prompt.storyPrompt || '';

            if (isFirstChapter) {
                chapterStructureResponse =
                    await this.storyGenerationApiService.generateFirstChapter({
                        storyId,
                        chapterNumber,
                        aiProvider: storyGeneration.aiProvider || 'grok',
                        direction: dto.direction || '',
                        storyMetadata,
                    });
            } else if (chapterNumber > 1 && chapterNumber < totalChapters) {
                chapterStructureResponse =
                    await this.storyGenerationApiService.generateRemainChapters(
                        {
                            storyId,
                            chapterNumber,
                            aiProvider: storyGeneration.aiProvider || 'grok',
                            direction: dto.direction || '',
                            storyMetadata,
                            previousChapterMetadata,
                            storyPrompt: storyPrompt,
                        },
                    );
            } else {
                throw new BadRequestException(
                    'All chapters have already been generated.',
                );
            }

            // Generate chapter summary every 5 chapters
            if (chapterNumber % 5 === 0) {
                chapterStructureResponse.structure.chapterSummary =
                    await this.storyGenerationApiService.generateChapterSummary(
                        {
                            storyId,
                            aiProvider: storyGeneration.aiProvider || 'grok',
                            chapterSummary:
                                chapterStructureResponse.structure.summary,
                            storyMetadata,
                        },
                    );
            }

            const chapter = this.chapterRepository.create({
                storyId,
                index: chapterNumber,
                title: chapterStructureResponse.title,
                content: chapterStructureResponse.content,
            });

            const savedChapter = await this.chapterRepository.save(chapter);

            // Update record đã lưu requestId lúc đầu
            await this.chapterGenerationRepository.update(
                { id: savedPreGen.id },
                {
                    chapterId: savedChapter.id,
                    generatedContent: chapterStructureResponse.content,
                    structure: chapterStructureResponse.structure as any,
                    storyGenerationId: storyGeneration.id,
                    chapterNumber,
                    status: GenerationStatus.COMPLETED,
                },
            );

            await this.storyGenerationRepository.update(
                { id: storyGeneration.id },
                {
                    updatedAt: new Date(),
                },
            );

            return {
                chapterId: savedChapter.id,
                index: chapterNumber,
                title: chapterStructureResponse.title,
                content: chapterStructureResponse.content,
                summary: chapterStructureResponse.structure.summary,
                structure: chapterStructureResponse.structure,
                message: `Chapter ${chapterNumber} generated successfully.`,
            };
        } catch (error) {
            console.error('Error generating chapter:', error);

            if (savedPreGen) {
                await this.chapterGenerationRepository.update(
                    { id: savedPreGen.id },
                    {
                        errorMessage:
                            error instanceof Error
                                ? error.message
                                : 'Failed to generate chapter',
                        status: GenerationStatus.FAILED,
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

    async previewStory(id: string, skipImage: boolean = false): Promise<any> {
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
                    metadata: true,
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
            metadata: story.generation?.metadata.storyContext || {},
            coverImageUrl: skipImage
                ? DEFAULT_COVER_IMAGE_URL
                : await this.doSpacesService.getImageUrl(story.coverImage),
        };
    }

    async getInitializationResults(
        requestId: string,
        skipImage: boolean,
    ): Promise<any> {
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

        return {
            id: generation.chapter.id,
            index: generation.chapter.index,
            title: generation.chapter.title,
            content: generation.chapter.content,
            structure: generation.structure || ({} as any),
            message: `Chapter ${generation.chapter.index} generated successfully.`,
        };
    }
}
