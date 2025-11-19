import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    GenerateChapterDto,
    ChapterStructureResponseDto,
    GenerateCompleteChapterDto,
    CompleteChapterResponseDto,
} from './dto/generate-chapter.dto';
import {
    InitializeStoryDto,
    InitializeStoryResponseDto,
    GenerateChapterOnDemandDto,
    GenerateChapterOnDemandResponseDto,
} from './dto/generate-story-outline.dto';
import { StoryGenerationApiService } from '../ai/providers/story-generation-api.service';
import { StoryVisibility } from 'src/common/enums/story-visibility.enum';

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
            relations: ['author', 'chapters', 'generation'],
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
            where: {},
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
        return this.chapterRepository.find({
            where: { storyId },
            order: { index: 'ASC' },
        });
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
        dto: InitializeStoryDto,
    ): Promise<InitializeStoryResponseDto> {
        // Validate numberOfChapters (max 10)
        if (dto.numberOfChapters > 10) {
            throw new BadRequestException('Maximum 10 chapters allowed');
        }

        try {
            // STEP 1: Generate story outline
            const outlineResponse =
                await this.storyGenerationApiService.generateStoryOutline({
                    storyIdea: dto.storyPrompt,
                    genres: dto.genres,
                    numberOfChapters: dto.numberOfChapters,
                    aiProvider: dto.aiProvider || 'grok',
                });

            // Create story with generated attributes
            const story = this.storyRepository.create({
                title: outlineResponse.title,
                synopsis: outlineResponse.synopsis,
                authorId: userId,
            });
            const savedStory = await this.storyRepository.save(story);

            // Create story generation record with outline and attributes
            const storyGeneration = this.storyGenerationRepository.create({
                storyId: savedStory.id,
                type: GenerationType.CHAPTER,
                status: GenerationStatus.IN_PROGRESS,
                aiProvider: dto.aiProvider || 'grok',
                aiModel:
                    (dto.aiProvider || 'grok') === 'grok'
                        ? 'grok-4'
                        : 'gpt-4o-mini',
                chapterNumber: 0, // Outline generation
                prompt: {
                    storyPrompt: dto.storyPrompt,
                    numberOfChapters: dto.numberOfChapters,
                },
                response: { outline: outlineResponse.outline },
                // Store story attributes
                title: outlineResponse.title,
                synopsis: outlineResponse.synopsis,
                genres: outlineResponse.genres,
                mainCharacter: outlineResponse.mainCharacter,
                subCharacters: outlineResponse.subCharacters,
                setting: outlineResponse.setting,
                plotTheme: outlineResponse.plotTheme,
                writingStyle: outlineResponse.writingStyle,
                additionalContext: outlineResponse.additionalContext,
            });

            const savedStoryGeneration =
                await this.storyGenerationRepository.save(storyGeneration);

            // Update story's generation reference
            savedStory.generation = savedStoryGeneration;
            await this.storyRepository.save(savedStory);

            return {
                storyId: savedStory.id,
                title: outlineResponse.title,
                synopsis: outlineResponse.synopsis,
                genres: outlineResponse.genres,
                mainCharacter: outlineResponse.mainCharacter,
                subCharacters: outlineResponse.subCharacters,
                setting: outlineResponse.setting,
                plotTheme: outlineResponse.plotTheme,
                writingStyle: outlineResponse.writingStyle,
                additionalContext: outlineResponse.additionalContext,
                numberOfChapters: dto.numberOfChapters,
                outline: outlineResponse.outline,
                message:
                    'Story outline generated successfully. Ready to generate chapters on-demand.',
            };
        } catch (error) {
            console.error('Error initializing story:', error);
            throw error;
        }
    }

    /**
     * REQUEST 2: Generate single chapter on-demand
     * Generates chapter incrementally when user requests
     * Uses story outline and previous chapter summaries for context
     */
    async generateChapterOnDemand(
        storyId: string,
        dto: GenerateChapterOnDemandDto,
    ): Promise<GenerateChapterOnDemandResponseDto> {
        try {
            // Verify story exists and get story generation with outline
            const story = await this.findStoryById(storyId);
            const storyGeneration = story.generation;

            if (!storyGeneration) {
                throw new NotFoundException(
                    'Story outline not found. Initialize story first.',
                );
            }

            // Get previous chapters for context
            const previousChapters = await this.chapterRepository.find({
                where: { storyId },
                order: { index: 'ASC' },
            });

            // Get previous chapter summaries from ChapterGenerations
            const previousSummaries: string[] = [];
            for (const chapter of previousChapters) {
                const chapterGen =
                    await this.chapterGenerationRepository.findOne({
                        where: { chapterId: chapter.id },
                    });
                if (chapterGen && chapterGen.structure?.summary) {
                    previousSummaries.push(
                        `Chương ${chapter.index}: ${chapterGen.structure.summary}`,
                    );
                }
            }

            const aiProvider = dto.aiProvider || 'grok';

            // STEP 2: Generate chapter structure
            const structureResponse =
                await this.storyGenerationApiService.generateChapterStructure({
                    storyId,
                    chapterNumber: dto.chapterNumber,
                    storyOutline: storyGeneration.response?.outline || '',
                    previousChaptersSummaries: previousSummaries,
                    aiProvider,
                });

            // STEP 3: Generate complete chapter
            const completeChapter =
                await this.storyGenerationApiService.generateCompleteChapter({
                    storyId,
                    chapterNumber: dto.chapterNumber,
                    chapterStructure: structureResponse.structure,
                    wordCount: dto.wordCount || 1300,
                    aiProvider,
                });

            // Save chapter
            const chapter = this.chapterRepository.create({
                storyId,
                index: dto.chapterNumber,
                title: `Chương ${dto.chapterNumber}`,
                content: completeChapter.content || '',
            });

            const savedChapter = await this.chapterRepository.save(chapter);

            // Create chapter generation record
            const chapterGeneration = this.chapterGenerationRepository.create({
                storyGenerationId: storyGeneration.id,
                chapterId: savedChapter.id,
                chapterNumber: dto.chapterNumber,
                generatedContent: completeChapter.content,
                structure: {
                    summary: completeChapter.summary,
                    imagePrompt: completeChapter.imagePrompt,
                },
            });

            await this.chapterGenerationRepository.save(chapterGeneration);

            return {
                chapterId: savedChapter.id,
                chapterNumber: dto.chapterNumber,
                title: savedChapter.title,
                content: completeChapter.content,
                summary: completeChapter.summary,
                imagePrompt: completeChapter.imagePrompt,
                message: 'Chapter generated successfully',
            };
        } catch (error) {
            console.error(
                `Error generating chapter ${dto.chapterNumber} for story ${storyId}:`,
                error,
            );
            throw error;
        }
    }

    // Legacy Chapter Generation Method
    async generateChapter(
        storyId: string,
        generateChapterDto: GenerateChapterDto,
    ): Promise<{
        chapter: Chapter;
        structure: ChapterStructureResponseDto;
        generation: ChapterGeneration;
    }> {
        const story = await this.findStoryById(storyId);

        // Get existing chapters
        const existingChapters = await this.findChaptersByStory(storyId);
        const nextIndex = existingChapters.length + 1;

        // Collect summaries from all previous chapters if not provided
        let previousChaptersSummaries =
            generateChapterDto.previousChaptersSummaries || [];
        if (
            previousChaptersSummaries.length === 0 &&
            existingChapters.length > 0
        ) {
            // Auto-generate summaries from existing chapters
            previousChaptersSummaries = existingChapters.map(
                (chapter, index) => {
                    const summary = chapter.content?.substring(0, 300) || '';
                    return `Chương ${index + 1}: ${summary}...`;
                },
            );
        }

        // Create story generation record for batch tracking
        const storyGeneration = this.storyGenerationRepository.create({
            storyId,
            type: GenerationType.CHAPTER,
            status: GenerationStatus.IN_PROGRESS,
            aiProvider: generateChapterDto.aiProvider || 'gpt',
            aiModel:
                generateChapterDto.aiProvider === 'grok'
                    ? 'grok-4'
                    : 'gpt-4o-mini',
            chapterNumber: nextIndex,
            prompt: {
                chapterNumber: nextIndex,
                previousChaptersSummaries,
                wordCount: generateChapterDto.wordCount,
            },
            // Store story attributes as direct columns
            title: generateChapterDto.storyAttributes?.title,
            synopsis: generateChapterDto.storyAttributes?.synopsis,
            genres: generateChapterDto.storyAttributes?.genres,
            mainCharacter: generateChapterDto.storyAttributes?.mainCharacter,
            subCharacters: generateChapterDto.storyAttributes?.subCharacters,
            setting: generateChapterDto.storyAttributes?.setting,
            plotTheme: generateChapterDto.storyAttributes?.plotTheme,
            writingStyle: generateChapterDto.storyAttributes?.writingStyle,
            additionalContext:
                generateChapterDto.storyAttributes?.additionalContext,
        });

        const savedStoryGeneration =
            await this.storyGenerationRepository.save(storyGeneration);

        try {
            // Generate chapter structure using AI
            const chapterStructure =
                await this.storyGenerationApiService.generateChapter(
                    generateChapterDto,
                );

            // Create chapter with generated content
            const chapter = this.chapterRepository.create({
                storyId,
                index: nextIndex,
                title: `Chương ${nextIndex}`,
                content: chapterStructure.content || '',
            });

            const savedChapter = await this.chapterRepository.save(chapter);

            // Create chapter generation record
            const chapterGeneration = this.chapterGenerationRepository.create({
                storyGenerationId: savedStoryGeneration.id,
                chapterId: savedChapter.id,
                chapterNumber: nextIndex,
                generatedContent: chapterStructure.content,
                structure: {
                    openingHook: chapterStructure.openingHook,
                    sceneSetting: chapterStructure.sceneSetting,
                    characterIntroduction:
                        chapterStructure.characterIntroduction,
                    plotDevelopment: chapterStructure.plotDevelopment,
                },
            });

            const savedChapterGeneration =
                await this.chapterGenerationRepository.save(chapterGeneration);

            // Update story generation record
            savedStoryGeneration.status = GenerationStatus.COMPLETED;
            savedStoryGeneration.response = {
                chapterId: savedChapter.id,
                structure: savedChapterGeneration.structure,
            };
            await this.storyGenerationRepository.save(savedStoryGeneration);

            return {
                chapter: savedChapter,
                structure: chapterStructure,
                generation: savedChapterGeneration,
            };
        } catch (error) {
            // Update generation record with error
            savedStoryGeneration.status = GenerationStatus.FAILED;
            savedStoryGeneration.errorMessage = error.message;
            await this.storyGenerationRepository.save(savedStoryGeneration);
            throw error;
        }
    }

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
}
