import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Story } from './entities/story.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { PaginationDto } from './dto/pagination.dto';
import { StoryVisibility } from 'src/common/enums/story-visibility.enum';
import { StoryStatus } from 'src/common/enums/story-status.enum';
import { DoSpacesService } from 'src/upload/do-spaces.service';
import { ERROR_MESSAGES } from 'src/common/constants/app.constant';
import { MediaService } from 'src/media/media.service';
import { StorySource } from 'src/common/enums/app.enum';
import { StoryCategory } from './entities/story-category.entity';
import { parseSort } from 'src/common/utils/query-parser';
import { enrichStoryToPreviewDto } from 'src/common/mappers/story-preview.mapper';
import { StoryPreviewDto } from './dto/story-preview.dto';

@Injectable()
export class StoryCrudService {
    constructor(
        @InjectRepository(Story)
        private storyRepository: Repository<Story>,
        private doSpacesService: DoSpacesService,
        @InjectRepository(StoryCategory)
        private storyCategoryRepository: Repository<StoryCategory>,
        private mediaService: MediaService,
    ) {}

    async createStory(
        authorId: string,
        createStoryDto: CreateStoryDto,
    ): Promise<Story> {
        const { mainCategoryId, subCategoryIds, ...storyData } = createStoryDto;

        // Create the story first
        const story = this.storyRepository.create({
            ...storyData,
            authorId,
            sourceType: StorySource.MANUAL,
        });

        const savedStory = await this.storyRepository.save(story);

        // Create StoryCategory relations
        const storyCategories: StoryCategory[] = [];

        // Main category
        storyCategories.push(
            this.storyCategoryRepository.create({
                storyId: savedStory.id,
                categoryId: mainCategoryId,
                isMainCategory: true,
            }),
        );

        // Sub categories (if any)
        if (subCategoryIds && subCategoryIds.length > 0) {
            for (const catId of subCategoryIds) {
                storyCategories.push(
                    this.storyCategoryRepository.create({
                        storyId: savedStory.id,
                        categoryId: catId,
                        isMainCategory: false,
                    }),
                );
            }
        }

        await this.storyCategoryRepository.save(storyCategories);

        return savedStory;
    }

    async findAllStories(paginationDto: PaginationDto): Promise<{
        page: number;
        limit: number;
        total: number;
        items: any[];
    }> {
        const {
            page = 1,
            limit = 10,
            keyword,
            source,
            authorId,
            sort,
        } = paginationDto;
        const skip = (page - 1) * limit;

        const qb = this.storyRepository
            .createQueryBuilder('story')
            .leftJoinAndSelect('story.author', 'author')
            .leftJoinAndSelect('story.storyCategories', 'storyCategories')
            .leftJoinAndSelect('storyCategories.category', 'category')
            .orderBy('story.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        const order = parseSort(sort);
        qb.orderBy(order);

        if (keyword && keyword.trim()) {
            const searchTerm = `${keyword.trim().toLowerCase()}%`;

            qb.andWhere('LOWER(story.title) LIKE :searchTerm', { searchTerm });
        }

        if (source) {
            qb.andWhere('story.sourceType = :source', { source });
        }

        if (authorId) {
            qb.andWhere('author.id = :authorId', { authorId });
        }

        const [stories, total] = await Promise.all([
            qb.getMany(),
            qb.clone().getCount(),
        ]);

        const items = stories.map((story) => ({
            ...story,
            coverImage: undefined,
            authorId: story.author.id,
            authorUsername: story.author.username,
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
            coverImage: undefined,
            authorId: story.author.id,
            authorUsername: story.author.username,
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
            coverImage: undefined,
            authorId: story.author.id,
            authorUsername: story.author.username,
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
            coverImage: undefined,
            author: undefined,
            authorId: story.author.id,
            authorUsername: story.author.username,
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

    async findStoryById(id: string): Promise<Story> {
        const story = await this.storyRepository.findOne({
            where: { id },
        });

        if (!story) {
            throw new NotFoundException(`Story with ID ${id} not found`);
        }

        return story;
    }

    async findDetailStoryById(id: string) {
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
                sourceType: true,
                isFullyFree: true,
                freeChaptersCount: true,
                likesCount: true,
                viewsCount: true,
                tags: true,
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
                metadata: story.generation?.metadata || null,
            },
        };
    }

    async findPreviewStoryById(
        id: string,
        currentUserId?: string,
    ): Promise<StoryPreviewDto> {
        const story = await this.storyRepository.findOne({
            where: { id },
            relations: [
                'author',
                'chapters',
                'generation',
                'storyCategories',
                'storyCategories.category',
            ],
            order: {
                chapters: {
                    index: 'ASC',
                },
            },
        });

        if (!story) {
            throw new NotFoundException(`Story with ID ${id} not found`);
        }

        const previewInput = {
            storyId: story.id,
            title: story.title,
            synopsis: story.synopsis,
            rating: story.rating,
            type: story.type,
            status: story.status,
            createdAt: story.createdAt,
            updatedAt: story.updatedAt,
            visibility: story.visibility,
            likesCount: story.likesCount ?? 0,
            viewsCount: story.viewsCount ?? 0,
            sourceType: story.sourceType,
            chapterCount: story.chapters?.length ?? 0,

            authorId: story.author?.id,
            authorUsername: story.author?.username,
            profileImage: story.author?.profileImage,
            coverImage: story.coverImage,

            categories:
                story.storyCategories
                    ?.filter((sc) => sc.category)
                    .map((sc) => ({
                        id: sc.category.id,
                        name: sc.category.name,
                    })) ?? [],

            mainCategory: story.storyCategories?.find((sc) => sc.isMainCategory)
                ?.category
                ? {
                      id: story.storyCategories.find((sc) => sc.isMainCategory)!
                          .category.id,
                      name: story.storyCategories.find(
                          (sc) => sc.isMainCategory,
                      )!.category.name,
                  }
                : null,

            lastReadAt: null,
            lastReadChapter: null,
            isLike: false,
            isCompleted: false,
        };

        return enrichStoryToPreviewDto(
            previewInput,
            this.mediaService,
            currentUserId,
        );
    }

    async updateStory(
        id: string,
        updateStoryDto: UpdateStoryDto,
    ): Promise<StoryPreviewDto> {
        const story = await this.findStoryById(id);

        if (
            updateStoryDto.visibility === StoryVisibility.PUBLIC &&
            story.status !== StoryStatus.PUBLISHED
        ) {
            story.status = StoryStatus.PENDING;
        }

        const endpoint = this.doSpacesService.getEndpoint();

        if (updateStoryDto.coverImage?.startsWith(endpoint)) {
            updateStoryDto.coverImage = updateStoryDto.coverImage.replace(
                endpoint,
                '',
            );
        }

        Object.assign(story, updateStoryDto);
        await this.storyRepository.save(story);

        return this.findPreviewStoryById(id);
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

    async updateStoryCoverImage(
        storyId: string,
        file: Express.Multer.File,
    ): Promise<string> {
        const story = await this.storyRepository.findOne({
            where: { id: storyId },
            select: ['id', 'coverImage'],
        });

        if (!story) {
            throw new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND);
        }

        const { key: newKey, url: newUrl } =
            await this.mediaService.uploadStoryCover(file);

        // 3. Lưu cũ để xóa sau
        const oldKey = story.coverImage;

        await this.storyRepository.update(
            { id: storyId },
            { coverImage: newKey },
        );

        if (oldKey && oldKey !== newKey) {
            this.mediaService.delete(oldKey).catch((err) => {
                console.error(`Delete old cover failed: ${oldKey}`, err);
            });
        }

        return newUrl;
    }
}
