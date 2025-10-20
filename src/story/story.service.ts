import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Story } from './entities/story.entity';
import { Chapter } from './entities/chapter.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { StoryStatus } from '../common/enums/story-status.enum';

@Injectable()
export class StoryService {
    constructor(
        @InjectRepository(Story)
        private storyRepository: Repository<Story>,
        @InjectRepository(Chapter)
        private chapterRepository: Repository<Chapter>,
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
                isPublic: true, 
                status: StoryStatus.PUBLISHED 
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
            relations: ['author', 'chapters'],
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
            throw new NotFoundException(`Chapter ${index} not found in story ${storyId}`);
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
        story.isPublic = true;
        story.approvedBy = adminId;
        story.approvedAt = new Date();
        story.rejectionReason = null;
        
        return this.storyRepository.save(story);
    }

    async rejectStory(id: string, adminId: string, reason: string): Promise<Story> {
        const story = await this.findStoryById(id);
        
        if (story.status !== StoryStatus.PENDING) {
            throw new BadRequestException('Story is not pending approval');
        }

        story.status = StoryStatus.REJECTED;
        story.isPublic = false;
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
        story.status = StoryStatus.PRIVATE;
        story.isPublic = false;
        
        return this.storyRepository.save(story);
    }

    async findPendingStories(): Promise<Story[]> {
        return this.storyRepository.find({
            where: { status: StoryStatus.PENDING },
            relations: ['author', 'chapters'],
            order: { createdAt: 'ASC' },
        });
    }
}
