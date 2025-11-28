import {
    Injectable,
    NotFoundException,
    BadRequestException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Story } from './entities/story.entity';
import { Chapter } from './entities/chapter.entity';
import {
    StoryGeneration,
    GenerationType,
    GenerationStatus,
} from './entities/story-generation.entity';
import { ChapterGeneration } from './entities/chapter-generation.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
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
import { excludeFields } from 'src/common/utils/exclude-fields';

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

    async findAllStories(): Promise<Story[]> {
        return this.storyRepository.find({
            relations: ['author', 'chapters'],
            order: { createdAt: 'DESC' },
        });
    }

    async findPublicStories(): Promise<Story[]> {
        return this.storyRepository.find({
            where: {
                visibility: StoryVisibility.PUBLIC,
                status: StoryStatus.PUBLISHED,
            },
            relations: ['author', 'chapters'],
            order: { createdAt: 'DESC' },
        });
    }

    async findStoriesByAuthor(authorId: string): Promise<Story[]> {
        return this.storyRepository.find({
            where: { authorId },
            relations: ['chapters'],
            order: { createdAt: 'DESC' },
        });
    }

    async findStoryById(id: string): Promise<Story> {
        const story = await this.storyRepository.findOne({
            where: { id },
            relations: {
                author: true,
                chapters: true,
                generation: true,
            },
            select: {
                id: true,
                title: true,
                synopsis: true,
                type: true,
                authorId: true,
                status: true,
                visibility: true,
                views: true,
                rating: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true,
                author: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    active: true,
                },
                chapters: {
                    id: true,
                    index: true,
                    title: true,
                    content: true,
                },
                generation: {
                    status: true,
                    aiProvider: true,
                    aiModel: true,
                    prompt: true,
                    title: true,
                    synopsis: true,
                    genres: true,
                    setting: true,
                    mainCharacter: true,
                    subCharacters: true,
                    antagonist: true,
                    motif: true,
                    tone: true,
                    writingStyle: true,
                    plotLogic: true,
                    hiddenTheme: true,
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

        return story;
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

    async findDeletedStories(): Promise<Story[]> {
        return this.storyRepository.find({
            where: { deletedAt: Not(IsNull()) },
            withDeleted: true,
            relations: ['author', 'chapters'],
            order: { deletedAt: 'DESC' },
        });
    }

    async incrementViews(id: string): Promise<void> {
        await this.storyRepository.increment({ id }, 'views', 1);
    }

    async updateRating(id: string, rating: number): Promise<void> {
        await this.storyRepository.update(id, { rating });
    }

    // Chapter methods
    async createChapter(
        storyId: string,
        createChapterDto: CreateChapterDto,
    ): Promise<Chapter> {
        const story = await this.findStoryById(storyId);
        const chapter = this.chapterRepository.create({
            ...createChapterDto,
            storyId: story.id,
        });
        return this.chapterRepository.save(chapter);
    }

    async createChaptersBulk(
        storyId: string,
        createChaptersDto: CreateChapterDto[],
    ): Promise<Chapter[]> {
        const story = await this.findStoryById(storyId);
        const chapters = createChaptersDto.map((dto) =>
            this.chapterRepository.create({
                ...dto,
                storyId: story.id,
            }),
        );
        return this.chapterRepository.save(chapters);
    }

    async findChaptersByStory(storyId: string): Promise<Chapter[]> {
        const chapters = await this.chapterRepository.find({
            select: {
                id: true,
                index: true,
                title: true,
                content: true,
                chapterGenerations: {
                    id: true,
                    structure: true,
                },
            },
            where: { storyId },
            relations: ['chapterGenerations'],
            order: { index: 'ASC' },
        });

        return chapters.map((chapter) => ({
            ...chapter,
            structure: chapter.chapterGenerations?.[0]?.structure || null,
        }));
    }

    async findChapterById(id: string): Promise<Chapter> {
        const chapter = await this.chapterRepository.findOne({
            where: { id },
            relations: ['story'],
        });

        if (!chapter) {
            throw new NotFoundException(`Chapter with ID ${id} not found`);
        }

        return chapter;
    }

    async updateChapter(
        id: string,
        updateChapterDto: UpdateChapterDto,
    ): Promise<Chapter> {
        const chapter = await this.findChapterById(id);
        Object.assign(chapter, updateChapterDto);
        return this.chapterRepository.save(chapter);
    }

    async deleteChapter(id: string): Promise<void> {
        const result = await this.chapterRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Chapter with ID ${id} not found`);
        }
    }

    // Chapter methods by index
    async findChapterByIndex(storyId: string, index: number): Promise<Chapter> {
        const chapter = await this.chapterRepository.findOne({
            where: { storyId, index },
            relations: ['story'],
        });

        if (!chapter) {
            throw new NotFoundException(
                `Chapter ${index} not found in story ${storyId}`,
            );
        }

        return chapter;
    }

    async updateChapterByIndex(
        storyId: string,
        index: number,
        updateChapterDto: UpdateChapterDto,
    ): Promise<Chapter> {
        const chapter = await this.findChapterByIndex(storyId, index);
        Object.assign(chapter, updateChapterDto);
        return this.chapterRepository.save(chapter);
    }

    async deleteChapterByIndex(storyId: string, index: number): Promise<void> {
        const chapter = await this.findChapterByIndex(storyId, index);
        await this.chapterRepository.delete(chapter.id);
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

    async findPendingStories(): Promise<Story[]> {
        return this.storyRepository.find({
            where: { status: StoryStatus.PENDING },
            relations: ['author', 'chapters'],
            order: { createdAt: 'ASC' },
        });
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
        dto: InitializeStoryDto,
    ): Promise<InitializeStoryResponseDto> {
        // Validate numberOfChapters (max 10)
        if (dto.numberOfChapters > 10) {
            throw new BadRequestException('Maximum 10 chapters allowed');
        }

        if (dto.storyPrompt.trim().length === 0) {
            throw new BadRequestException('Story prompt cannot be empty');
        }

        try {
            // Create story generation record with requestId first
            const storyGeneration = this.storyGenerationRepository.create({
                requestId,
                type: GenerationType.CHAPTER,
                status: GenerationStatus.IN_PROGRESS,
                aiProvider: dto.aiProvider || 'grok',
                aiModel:
                    (dto.aiProvider || 'grok') === 'grok'
                        ? 'grok-4'
                        : 'gpt-4o-mini',
                prompt: {
                    storyPrompt: dto.storyPrompt,
                    numberOfChapters: dto.numberOfChapters,
                },
            });

            const savedStoryGeneration =
                await this.storyGenerationRepository.save(storyGeneration);

            const outlineResponse =
                await this.storyGenerationApiService.generateStoryOutline({
                    storyPrompt: dto.storyPrompt,
                    genres: dto.genres,
                    numberOfChapters: dto.numberOfChapters,
                    aiProvider: dto.aiProvider || 'grok',
                });

            // Create story with generated attributes
            const story = this.storyRepository.create({
                title: outlineResponse.story.title,
                synopsis: outlineResponse.story.synopsis,
                authorId: userId,
            });
            const savedStory = await this.storyRepository.save(story);

            // Update story generation record with story reference and attributes
            await this.storyGenerationRepository.update(
                { id: savedStoryGeneration.id },
                {
                    storyId: savedStory.id,
                    response: {
                        outline: outlineResponse.story.outline,
                    } as any,
                    title: outlineResponse.story.title,
                    synopsis: outlineResponse.story.synopsis,
                    genres: outlineResponse.story.genres,
                    mainCharacter: outlineResponse.story.mainCharacter,
                    subCharacters: outlineResponse.story.subCharacters,
                    setting: outlineResponse.story.setting,
                    hiddenTheme: outlineResponse.story.hiddenTheme,
                    writingStyle: outlineResponse.story.writingStyle,
                    antagonist: outlineResponse.story.antagonist,
                    motif: outlineResponse.story.motif,
                    tone: outlineResponse.story.tone,
                    plotLogic: outlineResponse.story.plotLogic,
                },
            );

            // Update story's generation reference
            savedStory.generation = savedStoryGeneration;
            await this.storyRepository.save(savedStory);

            const chapterNumber = 1;

            // Save chapter
            const chapter = this.chapterRepository.create({
                storyId: savedStory.id,
                index: chapterNumber,
                title: outlineResponse.chapter.title || 'chương 1',
                content: outlineResponse.chapter.content || '',
            });

            const savedChapter = await this.chapterRepository.save(chapter);

            // Create chapter generation record
            const chapterGeneration = this.chapterGenerationRepository.create({
                storyGenerationId: storyGeneration.id,
                chapterId: savedChapter.id,
                chapterNumber,
                generatedContent: outlineResponse.chapter.content || '',
                structure: {
                    summary: outlineResponse.chapter.summary,
                    imagePrompt: outlineResponse.chapter.imagePrompt,
                    directions: outlineResponse.chapter.directions,
                },
            });

            await this.chapterGenerationRepository.save(chapterGeneration);
            return {
                story: {
                    storyId: savedStory.id,
                    title: outlineResponse.story.title,
                    synopsis: outlineResponse.story.synopsis,
                    genres: outlineResponse.story.genres,
                    mainCharacter: outlineResponse.story.mainCharacter,
                    subCharacters: outlineResponse.story.subCharacters,
                    antagonist: outlineResponse.story.antagonist,
                    motif: outlineResponse.story.motif,
                    tone: outlineResponse.story.tone,
                    plotLogic: outlineResponse.story.plotLogic,
                    setting: outlineResponse.story.setting,
                    hiddenTheme: outlineResponse.story.hiddenTheme,
                    writingStyle: outlineResponse.story.writingStyle,
                    numberOfChapters: dto.numberOfChapters,
                    outline: outlineResponse.story.outline,
                },
                chapter: {
                    id: savedChapter.id,
                    index: chapterNumber,
                    title: savedChapter.title,
                    content: outlineResponse.chapter.content || '',
                    summary: outlineResponse.chapter.summary,
                    imagePrompt: outlineResponse.chapter.imagePrompt,
                    directions: outlineResponse.chapter.directions,
                },
                message:
                    'Story outline generated successfully. Ready to generate chapters on-demand.',
            };
        } catch (error) {
            console.error('Error initializing story:', error);
            throw error;
        }
    }

    async generateChapters(
        storyId: string,
        dto: GenerateChapterDto,
    ): Promise<GenerateChapterResponseDto> {
        try {
            const storyGeneration =
                await this.storyGenerationRepository.findOne({
                    where: { storyId },
                });

            if (!storyGeneration) {
                throw new BadRequestException(
                    'Story generation record not found. Initialize story first.',
                );
            }

            const existingChapters = await this.findChaptersByStory(storyId);

            if (existingChapters.length === 0) {
                throw new BadRequestException(
                    'No previous chapters found. Initialize story first.',
                );
            }

            const lastChapter = existingChapters[existingChapters.length - 1];
            const chapterNumber = lastChapter.index + 1;

            const lastChapterGeneration =
                await this.chapterGenerationRepository.findOne({
                    where: {
                        chapterId: lastChapter.id,
                        storyGenerationId: storyGeneration.id,
                    },
                });

            let previousChapterMeta;

            if (chapterNumber === 2) {
                previousChapterMeta = JSON.stringify({
                    genres: storyGeneration.genres,
                    mainCharacter: storyGeneration.mainCharacter,
                    subCharacters: storyGeneration.subCharacters,
                    setting: storyGeneration.setting,
                    hiddenTheme: storyGeneration.hiddenTheme,
                    writingStyle: storyGeneration.writingStyle,
                    antagonist: storyGeneration.antagonist,
                    motif: storyGeneration.motif,
                    tone: storyGeneration.tone,
                    plotLogic: storyGeneration.plotLogic,
                });
            } else {
                previousChapterMeta = lastChapterGeneration
                    ? JSON.stringify(
                          excludeFields(lastChapterGeneration.structure, [
                              'summary',
                          ]),
                      )
                    : null;
            }

            let chapterStructureResponse: ChapterStructureResponse;
            const totalChapters = storyGeneration.prompt.numberOfChapters;
            const penultimateChapterNumber = totalChapters - 1;

            if (chapterNumber > 1 && chapterNumber < penultimateChapterNumber) {
                chapterStructureResponse =
                    await this.storyGenerationApiService.generateMiddleChapters(
                        {
                            storyId,
                            chapterNumber,
                            previousChapterSummary:
                                lastChapterGeneration?.structure.summary || '',
                            aiProvider: dto.aiProvider || 'grok',
                            storyPrompt: dto.storyPrompt || '',
                            direction: dto.direction || '',
                            previousChapterMeta,
                        },
                    );
            } else if (chapterNumber === penultimateChapterNumber) {
                chapterStructureResponse =
                    await this.storyGenerationApiService.generatePenultimateChapter(
                        {
                            storyId,
                            chapterNumber,
                            previousChapterSummary:
                                lastChapterGeneration?.structure.summary || '',
                            aiProvider: dto.aiProvider || 'grok',
                            storyPrompt: dto.storyPrompt || '',
                            direction: dto.direction || '',
                            previousChapterMeta,
                        },
                    );
            } else if (chapterNumber === totalChapters) {
                chapterStructureResponse =
                    await this.storyGenerationApiService.generateFinalChapter({
                        storyId,
                        chapterNumber,
                        previousChapterSummary:
                            lastChapterGeneration?.structure.summary || '',
                        aiProvider: dto.aiProvider || 'grok',
                        storyPrompt: dto.storyPrompt || '',
                        direction: dto.direction || '',
                        previousChapterMeta,
                    });
            } else {
                throw new BadRequestException(
                    'All chapters have already been generated.',
                );
            }

            const chapter = this.chapterRepository.create({
                storyId,
                index: chapterNumber,
                title: chapterStructureResponse.title,
                content: chapterStructureResponse.content,
            });

            const savedChapter = await this.chapterRepository.save(chapter);

            const chapterGeneration = this.chapterGenerationRepository.create({
                storyGenerationId: storyGeneration.id,
                chapterId: savedChapter.id,
                chapterNumber,
                generatedContent: chapterStructureResponse.content,
                structure: chapterStructureResponse.structure,
            });

            await this.chapterGenerationRepository.save(chapterGeneration);

            storyGeneration.response = {
                chapterId: savedChapter.id,
                chapterNumber,
                structure: chapterStructureResponse.structure,
            };
            await this.storyGenerationRepository.save(storyGeneration);

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
            console.error('Error generating middle chapters:', error);
            throw error;
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

    async previewStory(id: string): Promise<any> {
        const story = await this.storyRepository.findOne({
            where: { id },
            relations: {
                generation: true,
                chapters: true,
            },
            select: {
                id: true,
                title: true,
                synopsis: true,
                authorId: true,
                chapters: {
                    id: true,
                    index: true,
                    title: true,
                    content: true,
                },
                generation: {
                    mainCharacter: true,
                    subCharacters: true,
                    antagonist: true,
                    motif: true,
                    tone: true,
                    plotLogic: true,
                    setting: true,
                    hiddenTheme: true,
                    writingStyle: true,
                    genres: true,
                    prompt: true,
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

        const firstChapter = story.chapters?.[0];

        return {
            story: {
                storyId: story.id,
                title: story.title,
                synopsis: story.synopsis,
                genres: story.generation?.genres || [],
                mainCharacter: story.generation?.mainCharacter || '',
                subCharacters: story.generation?.subCharacters || [],
                antagonist: story.generation?.antagonist || '',
                motif: story.generation?.motif || '',
                tone: story.generation?.tone || '',
                plotLogic: story.generation?.plotLogic || '',
                setting: story.generation?.setting || '',
                hiddenTheme: story.generation?.hiddenTheme || '',
                writingStyle: story.generation?.writingStyle || '',
                numberOfChapters:
                    story.generation?.prompt?.numberOfChapters || 0,
                outline: story.generation?.response?.outline || '',
            },
            chapter: firstChapter
                ? {
                      id: firstChapter.id,
                      index: firstChapter.index,
                      title: firstChapter.title,
                      content: firstChapter.content || '',
                      summary: '',
                      imagePrompt: '',
                      directions: '',
                  }
                : null,
        };
    }

    async getInitializationResults(requestId: string): Promise<any> {
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
            return this.previewStory(storyId);
        }

        if (errorMessage) {
            throw new HttpException(
                errorMessage,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        throw new HttpException(
            'Story is still being generated. Please try again later.',
            HttpStatus.ACCEPTED,
        );
    }
}
