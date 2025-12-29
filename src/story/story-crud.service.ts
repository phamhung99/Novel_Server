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

@Injectable()
export class StoryCrudService {
    constructor(
        @InjectRepository(Story)
        private storyRepository: Repository<Story>,
        private doSpacesService: DoSpacesService,
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
}
