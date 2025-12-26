import {
    Injectable,
    NotFoundException,
    BadRequestException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, ILike, MoreThan, Repository } from 'typeorm';
import { Story } from './entities/story.entity';
import { Chapter } from './entities/chapter.entity';
import {
    StoryGeneration,
    GenerationType,
} from './entities/story-generation.entity';
import { ChapterGeneration } from './entities/chapter-generation.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { StoryStatus } from '../common/enums/story-status.enum';
import {
    ChapterStructureResponse,
    GenerateChapterDto,
    GenerateChapterResponseDto,
} from './dto/generate-chapter.dto';
import {
    InitializeStoryDto,
    InitializeStoryResponseDto,
} from './dto/generate-story-outline.dto';
import { StoryGenerationApiService } from '../ai/providers/story-generation-api.service';
import { StoryVisibility } from 'src/common/enums/story-visibility.enum';
import { StoryViews } from './entities/story-views.entity';
import { StorySummary } from './entities/story-summary.entity';
import { getStartOfDay } from 'src/common/utils/date.utils';
import { UserService } from 'src/user/user.service';
import {
    GenerationStatus,
    LibraryType,
    StorySort,
    StoryStatusFilter,
} from 'src/common/enums/app.enum';
import { Category } from './entities/categories.entity';
import { DoSpacesService } from 'src/upload/do-spaces.service';
import { DEFAULT_COVER_IMAGE_URL } from 'src/common/constants/app.constant';
import { ChapterService } from './chapter.service';
import { StoryCategory } from './entities/story-category.entity';
import { PaginationDto } from './dto/pagination.dto';
import { DiscoverStoriesDto } from './dto/discover-stories.dto';

@Injectable()
export class StoryService {
    constructor(
        @InjectRepository(Story)
        private storyRepository: Repository<Story>,
        @InjectRepository(Chapter)
        private chapterRepository: Repository<Chapter>,
        @InjectRepository(StoryGeneration)
        private storyGenerationRepository: Repository<StoryGeneration>,
        @InjectRepository(ChapterGeneration)
        private chapterGenerationRepository: Repository<ChapterGeneration>,
        private storyGenerationApiService: StoryGenerationApiService,
        @InjectRepository(StoryViews)
        private storyViewsRepository: Repository<StoryViews>,
        @InjectRepository(StorySummary)
        private storySummaryRepository: Repository<StorySummary>,
        private dataSource: DataSource,
        private userService: UserService,
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>,
        @InjectRepository(StoryCategory)
        private storyCategoryRepository: Repository<StoryCategory>,
        private doSpacesService: DoSpacesService,
        private chapterService: ChapterService,
    ) {}

    async createStory(
        authorId: string,
        createStoryDto: CreateStoryDto,
    ): Promise<Story> {
        const story = this.storyRepository.create({
            ...createStoryDto,
            authorId,
        });
        return this.storyRepository.save(story);
    }

    async findAllStories(paginationDto: PaginationDto) {
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;

        const queryBuilder = this.storyRepository
            .createQueryBuilder('story')
            .leftJoinAndSelect('story.author', 'author')
            .leftJoinAndSelect('story.summary', 'summary')
            .leftJoinAndSelect('story.storyCategories', 'storyCategories')
            .leftJoinAndSelect('storyCategories.category', 'category')
            .orderBy('story.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        const [stories, total] = await Promise.all([
            queryBuilder.getMany(),
            queryBuilder.clone().getCount(),
        ]);

        const items = stories.map((story) => ({
            ...story,
            likesCount: story.summary?.likesCount || 0,
            viewsCount: story.summary?.viewsCount || 0,
            mainCategory:
                story.storyCategories.find((sc) => sc.isMainCategory)
                    ?.category || null,
            summary: undefined,
            storyCategories: undefined,
        }));

        return {
            page,
            limit,
            total,
            items,
        };
    }

    async findDeletedStories(paginationDto: PaginationDto): Promise<{
        page: number;
        limit: number;
        total: number;
        items: any[];
    }> {
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;

        const queryBuilder = this.storyRepository
            .createQueryBuilder('story')
            .leftJoinAndSelect('story.author', 'author')
            .leftJoinAndSelect('story.summary', 'summary')
            .leftJoinAndSelect('story.storyCategories', 'storyCategories')
            .leftJoinAndSelect('storyCategories.category', 'category')
            .where('story.deletedAt IS NOT NULL')
            .withDeleted()
            .orderBy('story.deletedAt', 'DESC')
            .skip(skip)
            .take(limit);

        const [stories, total] = await Promise.all([
            queryBuilder.getMany(),
            queryBuilder.clone().getCount(),
        ]);

        const items = stories.map((story) => ({
            ...story,
            likesCount: story.summary?.likesCount || 0,
            viewsCount: story.summary?.viewsCount || 0,
            mainCategory:
                story.storyCategories.find((sc) => sc.isMainCategory)
                    ?.category || null,
            summary: undefined,
            storyCategories: undefined,
        }));

        return {
            page,
            limit,
            total,
            items,
        };
    }

    async findPendingStories(paginationDto: PaginationDto): Promise<{
        page: number;
        limit: number;
        total: number;
        items: any[];
    }> {
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;

        const queryBuilder = this.storyRepository
            .createQueryBuilder('story')
            .leftJoinAndSelect('story.author', 'author')
            .leftJoinAndSelect('story.summary', 'summary')
            .leftJoinAndSelect('story.storyCategories', 'storyCategories')
            .leftJoinAndSelect('storyCategories.category', 'category')
            .where('story.status = :status', { status: StoryStatus.PENDING })
            .orderBy('story.createdAt', 'ASC')
            .skip(skip)
            .take(limit);

        const [stories, total] = await Promise.all([
            queryBuilder.getMany(),
            queryBuilder.clone().getCount(),
        ]);

        const items = stories.map((story) => ({
            ...story,
            likesCount: story.summary?.likesCount || 0,
            viewsCount: story.summary?.viewsCount || 0,
            mainCategory:
                story.storyCategories.find((sc) => sc.isMainCategory)
                    ?.category || null,
            summary: undefined,
            storyCategories: undefined,
        }));

        return {
            page,
            limit,
            total,
            items,
        };
    }

    async findPublicStories(paginationDto: PaginationDto): Promise<{
        page: number;
        limit: number;
        total: number;
        items: any[];
    }> {
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;

        const queryBuilder = this.storyRepository
            .createQueryBuilder('story')
            .leftJoinAndSelect('story.author', 'author')
            .leftJoinAndSelect('story.summary', 'summary')
            .leftJoinAndSelect('story.storyCategories', 'storyCategories')
            .leftJoinAndSelect('storyCategories.category', 'category')
            .where(
                'story.visibility = :visibility AND story.status = :status',
                {
                    visibility: StoryVisibility.PUBLIC,
                    status: StoryStatus.PUBLISHED,
                },
            )
            .orderBy('story.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        const [stories, total] = await Promise.all([
            queryBuilder.getMany(),
            queryBuilder.clone().getCount(),
        ]);

        const items = stories.map((story) => ({
            ...story,
            likesCount: story.summary?.likesCount || 0,
            viewsCount: story.summary?.viewsCount || 0,
            mainCategory:
                story.storyCategories.find((sc) => sc.isMainCategory)
                    ?.category || null,
            summary: undefined,
            storyCategories: undefined,
        }));

        return {
            page,
            limit,
            total,
            items,
        };
    }

    async findStoriesByAuthor(authorId: string): Promise<Story[]> {
        return this.storyRepository.find({
            where: { authorId },
            relations: ['chapters'],
            order: { createdAt: 'DESC' },
        });
    }

    async findStoryById(id: string) {
        const story = await this.storyRepository.findOne({
            where: { id },
            relations: {
                author: true,
                chapters: true,
                generation: true,
                storyCategories: { category: true },
            },
            select: {
                id: true,
                title: true,
                synopsis: true,
                coverImage: true,
                type: true,
                authorId: true,
                status: true,
                visibility: true,
                rating: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true,
                author: {
                    id: true,
                    username: true,
                    profileImage: true,
                },
                chapters: {
                    id: true,
                    index: true,
                    title: true,
                },
                generation: {
                    status: true,
                    aiProvider: true,
                    aiModel: true,
                    prompt: true,
                    metadata: true,
                },
            },
            order: {
                chapters: {
                    index: 'ASC',
                },
            },
        });

        if (!story) {
            throw new NotFoundException(`Story with ID ${id} not found`);
        }

        let coverImageUrl = null;

        if (story.coverImage) {
            coverImageUrl = await this.doSpacesService.getImageUrl(
                story.coverImage,
            );
        }

        const categories = story.storyCategories.map((sc) => ({
            id: sc.category.id,
            name: sc.category.name,
        }));

        const mainCategoryEntry = story.storyCategories.find(
            (sc) => sc.isMainCategory,
        );
        const mainCategory = mainCategoryEntry
            ? {
                  id: mainCategoryEntry.category.id,
                  name: mainCategoryEntry.category.name,
              }
            : null;

        story.storyCategories = undefined;
        story.coverImage = undefined;

        return {
            ...story,
            coverImageUrl,
            categories,
            mainCategory,
            generation: {
                ...story.generation,
                metadata: story.generation?.metadata?.storyContext || null,
            },
        };
    }

    async updateStory(
        id: string,
        updateStoryDto: UpdateStoryDto,
    ): Promise<Story> {
        const story = await this.findStoryById(id);
        Object.assign(story, updateStoryDto);
        return this.storyRepository.save(story);
    }

    async deleteStory(id: string): Promise<void> {
        const result = await this.storyRepository.softDelete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Story with ID ${id} not found`);
        }
    }

    async restoreStory(id: string): Promise<void> {
        const result = await this.storyRepository.restore(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Story with ID ${id} not found`);
        }
    }

    async incrementViews({
        storyId,
        userId,
    }: {
        storyId: string;
        userId: string;
    }): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            const now = new Date();
            const startOfToday = getStartOfDay(now);

            const existed = await manager.findOne(StoryViews, {
                where: {
                    story: { id: storyId },
                    user: { id: userId },
                    viewedAt: MoreThan(startOfToday),
                },
            });

            if (existed) {
                await manager.update(
                    StoryViews,
                    { id: existed.id },
                    { viewedAt: now },
                );
            } else {
                // Chưa xem hôm nay => insert mới
                await manager.insert(StoryViews, {
                    story: { id: storyId },
                    user: { id: userId },
                    viewedAt: now,
                });

                const summary = await manager.findOne(StorySummary, {
                    where: { storyId },
                });

                // Increment StorySummary chỉ 1 lần/ngày/người
                if (summary) {
                    await manager.increment(
                        StorySummary,
                        { storyId },
                        'viewsCount',
                        1,
                    );
                } else {
                    await manager.insert(StorySummary, {
                        storyId,
                        viewsCount: 1,
                    });
                }
            }
        });
    }

    async updateRating(id: string, rating: number): Promise<void> {
        await this.storyRepository.update(id, { rating });
    }

    // Publication workflow methods
    async requestPublication(id: string): Promise<Story> {
        const story = await this.findStoryById(id);

        if (story.status === StoryStatus.PENDING) {
            throw new BadRequestException('Story is already pending approval');
        }

        if (story.status === StoryStatus.PUBLISHED) {
            throw new BadRequestException('Story is already published');
        }

        story.status = StoryStatus.PENDING;
        return this.storyRepository.save(story);
    }

    async approveStory(id: string, adminId: string): Promise<Story> {
        const story = await this.findStoryById(id);

        if (story.status !== StoryStatus.PENDING) {
            throw new BadRequestException('Story is not pending approval');
        }

        // Approve = Publish directly
        story.status = StoryStatus.PUBLISHED;
        story.visibility = StoryVisibility.PUBLIC;
        story.approvedBy = adminId;
        story.approvedAt = new Date();
        story.rejectionReason = null;

        return this.storyRepository.save(story);
    }

    async rejectStory(
        id: string,
        adminId: string,
        reason: string,
    ): Promise<Story> {
        const story = await this.findStoryById(id);

        if (story.status !== StoryStatus.PENDING) {
            throw new BadRequestException('Story is not pending approval');
        }

        story.status = StoryStatus.REJECTED;
        story.visibility = StoryVisibility.PRIVATE;
        story.approvedBy = adminId;
        story.approvedAt = new Date();
        story.rejectionReason = reason;

        return this.storyRepository.save(story);
    }

    async unpublishStory(id: string): Promise<Story> {
        const story = await this.findStoryById(id);

        if (story.status !== StoryStatus.PUBLISHED) {
            throw new BadRequestException('Story is not published');
        }

        // Unpublish returns to private state
        story.status = StoryStatus.DRAFT;
        story.visibility = StoryVisibility.PRIVATE;

        return this.storyRepository.save(story);
    }

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

    // Legacy Chapter Generation Method
    // async generateChapter(
    //     storyId: string,
    //     generateChapterDto: GenerateChapterDto,
    // ): Promise<{
    //     chapter: Chapter;
    //     structure: ChapterStructureResponseDto;
    //     generation: ChapterGeneration;
    // }> {
    //     // Get existing chapters
    //     const existingChapters = await this.findChaptersByStory(storyId);
    //     const nextIndex = existingChapters.length + 1;

    //     // Collect summaries from all previous chapters if not provided
    //     let previousChaptersSummaries =
    //         generateChapterDto.previousChaptersSummaries || [];
    //     if (
    //         previousChaptersSummaries.length === 0 &&
    //         existingChapters.length > 0
    //     ) {
    //         // Auto-generate summaries from existing chapters
    //         previousChaptersSummaries = existingChapters.map(
    //             (chapter, index) => {
    //                 const summary = chapter.content?.substring(0, 300) || '';
    //                 return `Chương ${index + 1}: ${summary}...`;
    //             },
    //         );
    //     }

    //     // Create story generation record for batch tracking
    //     const storyGeneration = this.storyGenerationRepository.create({
    //         storyId,
    //         type: GenerationType.CHAPTER,
    //         status: GenerationStatus.IN_PROGRESS,
    //         aiProvider: generateChapterDto.aiProvider || 'gpt',
    //         aiModel:
    //             generateChapterDto.aiProvider === 'grok'
    //                 ? 'grok-4'
    //                 : 'gpt-4o-mini',
    //         chapterNumber: nextIndex,
    //         prompt: {
    //             chapterNumber: nextIndex,
    //             previousChaptersSummaries,
    //             wordCount: generateChapterDto.wordCount,
    //         },
    //         // Store story attributes as direct columns
    //         title: generateChapterDto.storyAttributes?.title,
    //         synopsis: generateChapterDto.storyAttributes?.synopsis,
    //         genres: generateChapterDto.storyAttributes?.genres,
    //         mainCharacter: generateChapterDto.storyAttributes?.mainCharacter,
    //         subCharacters: generateChapterDto.storyAttributes?.subCharacters,
    //         setting: generateChapterDto.storyAttributes?.setting,
    //         plotTheme: generateChapterDto.storyAttributes?.plotTheme,
    //         writingStyle: generateChapterDto.storyAttributes?.writingStyle,
    //         additionalContext:
    //             generateChapterDto.storyAttributes?.additionalContext,
    //     });

    //     const savedStoryGeneration =
    //         await this.storyGenerationRepository.save(storyGeneration);

    //     try {
    //         // Generate chapter structure using AI
    //         const chapterStructure =
    //             await this.storyGenerationApiService.generateChapter(
    //                 generateChapterDto,
    //             );

    //         // Create chapter with generated content
    //         const chapter = this.chapterRepository.create({
    //             storyId,
    //             index: nextIndex,
    //             title: `Chương ${nextIndex}`,
    //             content: chapterStructure.content || '',
    //         });

    //         const savedChapter = await this.chapterRepository.save(chapter);

    //         // Create chapter generation record
    //         const chapterGeneration = this.chapterGenerationRepository.create({
    //             storyGenerationId: savedStoryGeneration.id,
    //             chapterId: savedChapter.id,
    //             chapterNumber: nextIndex,
    //             generatedContent: chapterStructure.content,
    //             structure: {
    //                 openingHook: chapterStructure.openingHook,
    //                 sceneSetting: chapterStructure.sceneSetting,
    //                 characterIntroduction:
    //                     chapterStructure.characterIntroduction,
    //                 plotDevelopment: chapterStructure.plotDevelopment,
    //             },
    //         });

    //         const savedChapterGeneration =
    //             await this.chapterGenerationRepository.save(chapterGeneration);

    //         // Update story generation record
    //         savedStoryGeneration.status = GenerationStatus.COMPLETED;
    //         savedStoryGeneration.response = {
    //             chapterId: savedChapter.id,
    //             structure: savedChapterGeneration.structure,
    //         };
    //         await this.storyGenerationRepository.save(savedStoryGeneration);

    //         return {
    //             chapter: savedChapter,
    //             structure: chapterStructure,
    //             generation: savedChapterGeneration,
    //         };
    //     } catch (error) {
    //         // Update generation record with error
    //         savedStoryGeneration.status = GenerationStatus.FAILED;
    //         savedStoryGeneration.errorMessage = error.message;
    //         await this.storyGenerationRepository.save(savedStoryGeneration);
    //         throw error;
    //     }
    // }

    // Generation History Methods
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

    async getUserLibrary(
        userId: string,
        type: LibraryType,
        { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
    ) {
        const offset = (page - 1) * limit;

        // ===== Query chính (story-level, giống getRecentStories) =====
        const qb = this.dataSource
            .getRepository(Story)
            .createQueryBuilder('s')
            .leftJoin('s.author', 'a')
            .leftJoin('s.likes', 'likes', 'likes.userId = :userId', { userId })
            .leftJoin('s.generation', 'generation')
            .leftJoin('story_summary', 'ss', 'ss.story_id = s.id')
            .leftJoin('s.storyCategories', 'sc')
            .leftJoin('sc.category', 'cat')
            .leftJoin(
                'reading_history',
                'rh',
                'rh.story_id = s.id AND rh.user_id = :userId',
                { userId },
            )
            .select([
                's.id AS "storyId"',
                's.title AS "title"',
                's.synopsis AS "synopsis"',
                's.coverImage AS "coverImage"',
                's.rating AS "rating"',
                's.type AS "type"',
                's.status AS "status"',
                's.createdAt AS "createdAt"',
                's.updatedAt AS "updatedAt"',
                's.visibility AS "visibility"',

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) AS "categories"`,

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name))
                FILTER (WHERE sc.isMainCategory = true) -> 0 AS "mainCategory"`,

                'a.id AS "authorId"',
                'a.username AS "authorUsername"',
                'a.profileImage AS "profileImage"',

                'rh.lastReadAt AS "lastReadAt"',
                'rh.lastReadChapter AS "lastReadChapter"',

                'CASE WHEN likes.id IS NULL THEN false ELSE true END AS "isLike"',

                'ss.likes_count AS "likesCount"',
                'ss.views_count AS "viewsCount"',

                `(COUNT(*) OVER() = COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)) AS "isCompleted"`,
            ])
            .groupBy(
                's.id, a.id, likes.id, ss.likes_count, ss.views_count, generation.prompt,  rh.lastReadAt, rh.lastReadChapter',
            );

        // ===== Filter theo type =====
        if (type === LibraryType.CREATED) {
            qb.where('s.author_id = :userId', { userId }).orderBy(
                's.created_at',
                'DESC',
            );
        } else if (type === LibraryType.LIKED) {
            qb.innerJoin(
                'story_likes',
                'sl',
                'sl.story_id = s.id AND sl.user_id = :userId',
                { userId },
            )
                .addGroupBy('sl.created_at')
                .orderBy('sl.created_at', 'DESC');
        } else {
            throw new BadRequestException('Invalid library type');
        }

        qb.offset(offset).limit(limit);

        const stories = await qb.getRawMany();
        const total = await qb.getCount();

        // ===== Query chapters riêng (giống hệt getRecentStories) =====
        const storyIds = stories.map((s) => s.storyId);

        let chaptersMap: Record<string, any[]> = {};

        if (storyIds.length > 0) {
            const chapters = await this.dataSource
                .getRepository(Chapter)
                .createQueryBuilder('c')
                .innerJoin('c.story', 's')
                .leftJoin(
                    'chapter_states',
                    'cs',
                    'cs.chapter_id = c.id AND cs.user_id = :userId',
                    { userId },
                )
                .select([
                    'c.story_id AS "storyId"',
                    `json_agg(
                jsonb_build_object(
                    'id', c.id,
                    'title', c.title,
                    'index', c.index,
                    'createdAt', c.created_at,
                    'updatedAt', c.updated_at,
                    'isLock', (
                        cs.chapter_id IS NULL               
                        AND s.author_id != :userId             
                        )
                    )
                    ORDER BY c.index ASC
                ) AS chapters`,
                ])
                .where('c.story_id IN (:...storyIds)', { storyIds })
                .setParameters({ userId })
                .groupBy('c.story_id')
                .getRawMany();

            chaptersMap = Object.fromEntries(
                chapters.map((row) => [row.storyId, row.chapters]),
            );
        }

        const items = stories.map((story) => ({
            ...story,
            chapters: chaptersMap[story.storyId] || [],
            lastReadAt: story.lastReadAt || null,
            lastReadChapter: story.lastReadChapter || null,
            canEdit: story.authorId === userId,
        }));

        return { page, limit, total, items };
    }

    async getTopTrending(
        userId: string,
        { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
    ) {
        const offset = (page - 1) * limit;

        // Query chính: lấy top story theo views_count giảm dần từ story_summary
        const qb = this.dataSource
            .getRepository(Story)
            .createQueryBuilder('s')
            .leftJoin('s.author', 'a')
            .leftJoin('s.likes', 'likes', 'likes.userId = :userId', { userId })
            .leftJoin('s.generation', 'generation')
            .innerJoin('story_summary', 'ss', 'ss.story_id = s.id')
            .leftJoin('s.storyCategories', 'sc')
            .leftJoin('sc.category', 'cat')
            .leftJoin(
                'reading_history',
                'rh',
                'rh.story_id = s.id AND rh.user_id = :userId',
                { userId },
            )
            .select([
                's.id AS "storyId"',
                's.title AS "title"',
                's.synopsis AS "synopsis"',
                's.coverImage AS "coverImage"',
                's.rating AS "rating"',
                's.type AS "type"',
                's.status AS "status"',
                's.createdAt AS "createdAt"',
                's.updatedAt AS "updatedAt"',
                's.visibility AS "visibility"',

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) AS "categories"`,

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name))
            FILTER (WHERE sc.isMainCategory = true) -> 0 AS "mainCategory"`,

                'a.id AS "authorId"',
                'a.username AS "authorUsername"',
                'a.profileImage AS "profileImage"',

                'rh.lastReadAt AS "lastReadAt"',
                'rh.lastReadChapter AS "lastReadChapter"',

                'CASE WHEN likes.id IS NULL THEN false ELSE true END AS "isLike"',

                'ss.likes_count AS "likesCount"',
                'ss.views_count AS "viewsCount"',

                `(COUNT(*) OVER() = COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)) AS "isCompleted"`,
            ])
            .where('s.visibility = :visibility', {
                visibility: StoryVisibility.PUBLIC,
            })
            .andWhere('s.status = :status', { status: StoryStatus.PUBLISHED })
            .groupBy(
                's.id, a.id, likes.id, ss.likes_count, ss.views_count, generation.prompt, rh.lastReadAt, rh.lastReadChapter, ss.views_last_60_days',
            )
            .orderBy('ss.views_last_60_days', 'DESC')
            .addOrderBy('ss.likes_count', 'DESC')
            .addOrderBy('s.updatedAt', 'DESC')
            .offset(offset)
            .limit(limit);

        const stories = await qb.getRawMany();
        const total = await qb.offset(0).limit(undefined).getCount();

        // Lấy chapters giống như trong getUserLibrary
        const storyIds = stories.map((s) => s.storyId);
        let chaptersMap: Record<string, any[]> = {};

        if (storyIds.length > 0) {
            const chapters = await this.dataSource
                .getRepository(Chapter)
                .createQueryBuilder('c')
                .innerJoin('c.story', 's')
                .leftJoin(
                    'chapter_states',
                    'cs',
                    'cs.chapter_id = c.id AND cs.user_id = :userId',
                    { userId },
                )
                .select([
                    'c.story_id AS "storyId"',
                    `json_agg(
                jsonb_build_object(
                    'id', c.id,
                    'title', c.title,
                    'index', c.index,
                    'createdAt', c.created_at,
                    'updatedAt', c.updated_at,
                    'isLock', (
                        cs.chapter_id IS NULL               
                        AND s.author_id != :userId             
                        )
                    )
                    ORDER BY c.index ASC
                ) AS chapters`,
                ])
                .where('c.story_id IN (:...storyIds)', { storyIds })
                .setParameters({ userId })
                .groupBy('c.story_id')
                .getRawMany();

            chaptersMap = Object.fromEntries(
                chapters.map((row) => [row.storyId, row.chapters]),
            );
        }

        const items = stories.map((story) => ({
            ...story,
            chapters: chaptersMap[story.storyId] || [],
            lastReadAt: story.lastReadAt || null,
            lastReadChapter: story.lastReadChapter || null,
            canEdit: story.authorId === userId,
        }));

        return { page, limit, total, items };
    }

    async getTopTrendingByCategory(
        userId: string,
        categoryId: string,
        { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
    ) {
        const offset = (page - 1) * limit;

        const qb = this.dataSource
            .getRepository(Story)
            .createQueryBuilder('s')
            .leftJoin('s.author', 'a')
            .leftJoin('s.likes', 'likes', 'likes.userId = :userId', { userId })
            .leftJoin('s.generation', 'generation')
            .innerJoin('story_summary', 'ss', 'ss.story_id = s.id')

            .innerJoin(
                's.storyCategories',
                'main_sc',
                'main_sc.category_id = :categoryId AND main_sc.is_main_category = true',
                { categoryId },
            )

            .leftJoin('s.storyCategories', 'sc')
            .leftJoin('sc.category', 'cat')

            .leftJoin(
                'reading_history',
                'rh',
                'rh.story_id = s.id AND rh.user_id = :userId',
                { userId },
            )
            .select([
                's.id AS "storyId"',
                's.title AS "title"',
                's.synopsis AS "synopsis"',
                's.coverImage AS "coverImage"',
                's.rating AS "rating"',
                's.type AS "type"',
                's.status AS "status"',
                's.createdAt AS "createdAt"',
                's.updatedAt AS "updatedAt"',
                's.visibility AS "visibility"',

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) AS "categories"`,

                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name))
             FILTER (WHERE sc.is_main_category = true) 
             -> 0 AS "mainCategory"`,

                'a.id AS "authorId"',
                'a.username AS "authorUsername"',
                'a.profileImage AS "profileImage"',

                'rh.lastReadAt AS "lastReadAt"',
                'rh.lastReadChapter AS "lastReadChapter"',

                'CASE WHEN likes.id IS NULL THEN false ELSE true END AS "isLike"',

                'ss.likes_count AS "likesCount"',
                'ss.views_count AS "viewsCount"',

                `(COUNT(*) OVER() = COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)) AS "isCompleted"`,
            ])
            .where('s.visibility = :visibility', {
                visibility: StoryVisibility.PUBLIC,
            })
            .andWhere('s.status = :status', { status: StoryStatus.PUBLISHED })
            .groupBy(
                's.id, a.id, likes.id, ss.likes_count, ss.views_count, generation.prompt, rh.lastReadAt, rh.lastReadChapter, ss.views_last_60_days',
            )
            .orderBy('ss.views_last_60_days', 'DESC')
            .addOrderBy('ss.likes_count', 'DESC')
            .addOrderBy('s.updatedAt', 'DESC')
            .offset(offset)
            .limit(limit)
            .setParameters({ userId, categoryId });

        const stories = await qb.getRawMany();

        const total = await qb.offset(0).limit(undefined).getCount();

        const storyIds = stories.map((s) => s.storyId);
        let chaptersMap: Record<string, any[]> = {};

        if (storyIds.length > 0) {
            const chapters = await this.dataSource
                .getRepository(Chapter)
                .createQueryBuilder('c')
                .innerJoin('c.story', 's')
                .leftJoin(
                    'chapter_states',
                    'cs',
                    'cs.chapter_id = c.id AND cs.user_id = :userId',
                    { userId },
                )
                .select([
                    'c.story_id AS "storyId"',
                    `json_agg(
                jsonb_build_object(
                    'id', c.id,
                    'title', c.title,
                    'index', c.index,
                    'createdAt', c.created_at,
                    'updatedAt', c.updated_at,
                    'isLock', (
                        cs.chapter_id IS NULL               
                        AND s.author_id != :userId             
                        )
                    )
                    ORDER BY c.index ASC
                ) AS chapters`,
                ])
                .where('c.story_id IN (:...storyIds)', { storyIds })
                .setParameters({ userId })
                .groupBy('c.story_id')
                .getRawMany();

            chaptersMap = Object.fromEntries(
                chapters.map((row) => [row.storyId, row.chapters]),
            );
        }

        const items = stories.map((story) => ({
            ...story,
            chapters: chaptersMap[story.storyId] || [],
            lastReadAt: story.lastReadAt || null,
            lastReadChapter: story.lastReadChapter || null,
            canEdit: story.authorId === userId,
        }));

        return { page, limit, total, items };
    }

    async getAllCategories(): Promise<
        Pick<Category, 'id' | 'name' | 'displayOrder' | 'isActive'>[]
    > {
        return this.categoryRepository.find({
            select: {
                id: true,
                name: true,
                displayOrder: true,
            },
            where: {
                isActive: true,
            },
            order: {
                displayOrder: 'ASC',
            },
        });
    }

    async getDiscoverStories(
        userId: string | null,
        {
            keyword,
            categories,
            status,
            sort = StorySort.POPULAR,
            minchapters,
            page = 1,
            limit = 20,
        }: DiscoverStoriesDto,
    ) {
        const offset = (page - 1) * limit;

        // Subquery đếm chính xác số chapter của từng story
        const chapterCountSubQuery = this.dataSource
            .getRepository(Chapter)
            .createQueryBuilder('ch')
            .select('ch.story_id', 'story_id')
            .addSelect('COUNT(ch.id)', 'chapter_count')
            .groupBy('ch.story_id');

        const qb = this.dataSource
            .getRepository(Story)
            .createQueryBuilder('s')
            .leftJoin('s.author', 'a')
            .leftJoin('s.likes', 'likes', 'likes.userId = :userId', { userId })
            .leftJoin('s.generation', 'generation')
            .leftJoin('story_summary', 'ss', 'ss.story_id = s.id')

            // All categories
            .leftJoin('s.storyCategories', 'sc')
            .leftJoin('sc.category', 'cat')

            // Main category (is_main_category = true)
            .leftJoin(
                's.storyCategories',
                'main_sc',
                'main_sc.story_id = s.id AND main_sc.is_main_category = true',
            )
            .leftJoin('main_sc.category', 'main_cat')

            // Reading history
            .leftJoin(
                'reading_history',
                'rh',
                'rh.story_id = s.id AND rh.user_id = :userId',
                { userId },
            )
            .leftJoin(
                `(${chapterCountSubQuery.getQuery()})`,
                'chapcnt',
                'chapcnt.story_id = s.id',
            )
            .select([
                's.id AS "storyId"',
                's.title AS "title"',
                's.synopsis AS "synopsis"',
                's.coverImage AS "coverImage"',
                's.rating AS "rating"',
                's.type AS "type"',
                's.status AS "status"',
                's.createdAt AS "createdAt"',
                's.updatedAt AS "updatedAt"',
                's.visibility AS "visibility"',

                // All categories array
                `json_agg(DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)) FILTER (WHERE cat.id IS NOT NULL) AS "categories"`,

                // Main category object (or null)
                `jsonb_build_object('id', main_cat.id, 'name', main_cat.name) AS "mainCategory"`,

                'a.id AS "authorId"',
                'a.username AS "authorUsername"',
                'a.profileImage AS "profileImage"',

                'rh.lastReadAt AS "lastReadAt"',
                'rh.lastReadChapter AS "lastReadChapter"',

                'CASE WHEN likes.id IS NULL THEN false ELSE true END AS "isLike"',

                'ss.likes_count AS "likesCount"',
                'ss.views_count AS "viewsCount"',

                // Số chapter thực tế
                'COALESCE(chapcnt.chapter_count::integer, 0) AS "chapterCount"',

                // isCompleted chính xác
                '(COALESCE(chapcnt.chapter_count::integer, 0) = COALESCE((generation.prompt ->> \'numberOfChapters\')::int, 0)) AS "isCompleted"',
            ])
            .where('s.visibility = :visibility', {
                visibility: StoryVisibility.PUBLIC,
            })
            .andWhere('s.status = :status', { status: StoryStatus.PUBLISHED });

        // === Keyword search
        if (keyword && keyword.trim()) {
            const searchTerm = `%${keyword.trim()}%`;
            qb.andWhere(
                new Brackets((sqb) => {
                    sqb.where('LOWER(s.title) LIKE LOWER(:searchTerm)');
                }),
                { searchTerm },
            );
        }

        if (minchapters !== undefined && minchapters > 0) {
            qb.andWhere(
                'COALESCE(chapcnt.chapter_count::integer, 0) >= :minchapters',
                { minchapters },
            );
        }

        // === Multi categories filter ===
        if (categories && categories !== 'all') {
            const categoryIds = categories
                .split(',')
                .map((id) => id.trim())
                .filter(Boolean);

            if (categoryIds.length > 0) {
                qb.andWhere('cat.id IN (:...categoryIds)', { categoryIds });
            }
        }

        // === Status filter: completed / ongoing ===
        if (status === StoryStatusFilter.COMPLETED) {
            qb.andWhere(
                "COALESCE(chapcnt.chapter_count::integer, 0) = COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)",
            );
        } else if (status === StoryStatusFilter.ONGOING) {
            qb.andWhere(
                "COALESCE(chapcnt.chapter_count::integer, 0) < COALESCE((generation.prompt ->> 'numberOfChapters')::int, 0)",
            );
        }

        // === Sorting ===
        switch (sort) {
            case StorySort.POPULAR:
                qb.orderBy('ss.views_last_60_days', 'DESC')
                    .addOrderBy('ss.likes_count', 'DESC')
                    .addOrderBy('s.updatedAt', 'DESC');
                break;
            case StorySort.RECENTLY_UPDATED:
                qb.orderBy('s.updatedAt', 'DESC');
                break;
            case StorySort.RECENTLY_ADDED:
                qb.orderBy('s.createdAt', 'DESC');
                break;
            case StorySort.RELEASE_DATE:
                // sort theo ngày phê duyệt xuất bản
                qb.orderBy('s.approvedAt', 'DESC');
                break;
            default:
                qb.orderBy('ss.views_last_60_days', 'DESC');
        }

        qb.groupBy('s.id')
            .addGroupBy('a.id')
            .addGroupBy('likes.id')
            .addGroupBy('ss.likes_count')
            .addGroupBy('ss.views_count')
            .addGroupBy('ss.views_last_60_days')
            .addGroupBy('generation.prompt')
            .addGroupBy('rh.lastReadAt')
            .addGroupBy('rh.lastReadChapter')
            .addGroupBy('main_cat.id')
            .addGroupBy('main_cat.name')
            .addGroupBy('chapcnt.chapter_count')

            .offset(offset)
            .limit(limit)
            .setParameter('userId', userId);

        const stories = await qb.getRawMany();

        const total =
            stories.length > 0
                ? await qb.offset(0).limit(undefined).getCount()
                : 0;

        const storyIds = stories.map((s) => s.storyId);
        let chaptersMap: Record<string, any[]> = {};

        if (storyIds.length > 0) {
            const chapters = await this.dataSource
                .getRepository(Chapter)
                .createQueryBuilder('c')
                .innerJoin('c.story', 's')
                .leftJoin(
                    'chapter_states',
                    'cs',
                    'cs.chapter_id = c.id AND cs.user_id = :userId',
                    { userId },
                )
                .select([
                    'c.story_id AS "storyId"',
                    `json_agg(
                jsonb_build_object(
                    'id', c.id,
                    'title', c.title,
                    'index', c.index,
                    'createdAt', c.created_at,
                    'updatedAt', c.updated_at,
                    'isLock', (
                        cs.chapter_id IS NULL               
                        AND s.author_id != :userId             
                        )
                    )
                    ORDER BY c.index ASC
                ) AS chapters`,
                ])
                .where('c.story_id IN (:...storyIds)', { storyIds })
                .setParameters({ userId })
                .groupBy('c.story_id')
                .getRawMany();

            chaptersMap = Object.fromEntries(
                chapters.map((row) => [row.storyId, row.chapters]),
            );
        }

        const items = stories.map((story) => ({
            ...story,
            chapters: chaptersMap[story.storyId] || [],
            lastReadAt: story.lastReadAt || null,
            lastReadChapter: story.lastReadChapter || null,
            canEdit: story.authorId === userId,
        }));

        return {
            page,
            limit,
            total,
            items,
        };
    }

    // async likeStory(storyId: string, userId: string) {
    //     return this.dataSource.transaction(async (manager) => {
    //         // 1. Kiểm tra story có tồn tại và PUBLIC/PUBLISHED không
    //         const story = await manager.findOne(Story, {
    //             where: {
    //                 id: storyId,
    //                 visibility: StoryVisibility.PUBLIC,
    //                 status: StoryStatus.PUBLISHED,
    //             },
    //         });

    //         if (!story) {
    //             throw new NotFoundException(
    //                 'Story not found or not accessible',
    //             );
    //         }

    //         // 2. Kiểm tra xem user đã like chưa
    //         const existingLike = await manager.findOne(StoryLikes, {
    //             where: {
    //                 storyId,
    //                 userId,
    //             },
    //         });

    //         if (existingLike) {
    //             // Đã like rồi → trả về trạng thái hiện tại
    //             return {
    //                 isLike: true,
    //                 likesCount: story.summary?.likesCount || 0, // nếu có relation load
    //             };
    //         }

    //         // 3. Tạo bản ghi like mới
    //         const newLike = manager.create(StoryLikes, {
    //             storyId,
    //             userId,
    //         });
    //         await manager.save(newLike);

    //         // 4. Tăng likes_count trong story_summary
    //         await manager.increment(StorySummary, { storyId }, 'likesCount', 1);

    //         // 5. Lấy likesCount mới (sau khi tăng)
    //         const updatedSummary = await manager.findOne(StorySummary, {
    //             where: { storyId },
    //             select: ['likesCount'],
    //         });

    //         return {
    //             isLike: true,
    //             likesCount: updatedSummary?.likesCount || 0,
    //         };
    //     });
    // }

    // async unlikeStory(storyId: string, userId: string) {
    //     return this.dataSource.transaction(async (manager) => {
    //         // 1. Kiểm tra story tồn tại
    //         const story = await manager.findOne(Story, {
    //             where: {
    //                 id: storyId,
    //                 visibility: StoryVisibility.PUBLIC,
    //                 status: StoryStatus.PUBLISHED,
    //             },
    //         });

    //         if (!story) {
    //             throw new NotFoundException(
    //                 'Story not found or not accessible',
    //             );
    //         }

    //         // 2. Tìm bản ghi like hiện tại
    //         const likeRecord = await manager.findOne(StoryLikes, {
    //             where: {
    //                 storyId,
    //                 userId,
    //             },
    //         });

    //         if (!likeRecord) {
    //             // Chưa like → trả về trạng thái hiện tại
    //             return {
    //                 isLike: false,
    //                 likesCount: story.summary?.likesCount || 0,
    //             };
    //         }

    //         // 3. Xóa bản ghi like
    //         await manager.remove(likeRecord);

    //         // 4. Giảm likes_count
    //         await manager.decrement(StorySummary, { storyId }, 'likesCount', 1);

    //         // 5. Lấy likesCount mới
    //         const updatedSummary = await manager.findOne(StorySummary, {
    //             where: { storyId },
    //             select: ['likesCount'],
    //         });

    //         return {
    //             isLike: false,
    //             likesCount: updatedSummary?.likesCount || 0,
    //         };
    //     });
    // }
}
