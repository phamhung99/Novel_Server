import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Headers,
    BadRequestException,
} from '@nestjs/common';
import { StoryService } from './story.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { RequestPublicationDto } from './dto/request-publication.dto';
import { ApproveStoryDto } from './dto/approve-story.dto';
import { RejectStoryDto } from './dto/reject-story.dto';

@Controller('story')
export class StoryController {
    constructor(private readonly storyService: StoryService) {}

    @Post()
    async createStory(
        @Headers('x-user-id') userId: string,
        @Body() createStoryDto: CreateStoryDto,
    ) {
        if (!userId) {
            throw new BadRequestException('userId is required');
        }
        return this.storyService.createStory(userId, createStoryDto);
    }

    @Get()
    async getAllStories() {
        return this.storyService.findAllStories();
    }

    @Get('public')
    async getPublicStories() {
        return this.storyService.findPublicStories();
    }

    @Get('pending')
    async getPendingStories() {
        return this.storyService.findPendingStories();
    }

    @Get('author/:authorId')
    async getStoriesByAuthor(@Param('authorId') authorId: string) {
        return this.storyService.findStoriesByAuthor(authorId);
    }

    @Get(':id')
    async getStoryById(@Param('id') id: string) {
        const story = await this.storyService.findStoryById(id);
        await this.storyService.incrementViews(id);
        return story;
    }

    @Put(':id')
    async updateStory(
        @Param('id') id: string,
        @Body() updateStoryDto: UpdateStoryDto,
    ) {
        return this.storyService.updateStory(id, updateStoryDto);
    }

    @Delete(':id')
    async deleteStory(@Param('id') id: string) {
        await this.storyService.deleteStory(id);
        return { message: 'Story soft deleted successfully' };
    }

    @Patch(':id/restore')
    async restoreStory(@Param('id') id: string) {
        await this.storyService.restoreStory(id);
        return { message: 'Story restored successfully' };
    }

    @Get('deleted/all')
    async getDeletedStories() {
        return this.storyService.findDeletedStories();
    }

    @Put(':id/rating')
    async updateRating(
        @Param('id') id: string,
        @Body('rating') rating: number,
    ) {
        await this.storyService.updateRating(id, rating);
        return { message: 'Rating updated successfully' };
    }

    // Publication workflow endpoints
    @Post(':id/request-publication')
    async requestPublication(
        @Param('id') id: string,
        @Body() requestDto: RequestPublicationDto,
    ) {
        const story = await this.storyService.requestPublication(id);
        return { 
            message: 'Publication request submitted successfully',
            story 
        };
    }

    @Post(':id/approve')
    async approveStory(
        @Headers('x-user-id') adminId: string,
        @Param('id') id: string,
        @Body() approveDto: ApproveStoryDto,
    ) {
        if (!adminId) {
            throw new BadRequestException('Admin ID is required');
        }
        const story = await this.storyService.approveStory(id, adminId);
        return { 
            message: 'Story approved and published successfully',
            story 
        };
    }

    @Post(':id/reject')
    async rejectStory(
        @Headers('x-user-id') adminId: string,
        @Param('id') id: string,
        @Body() rejectDto: RejectStoryDto,
    ) {
        if (!adminId) {
            throw new BadRequestException('Admin ID is required');
        }
        const story = await this.storyService.rejectStory(id, adminId, rejectDto.reason);
        return { 
            message: 'Story rejected',
            story 
        };
    }

    @Post(':id/unpublish')
    async unpublishStory(@Param('id') id: string) {
        const story = await this.storyService.unpublishStory(id);
        return { 
            message: 'Story unpublished successfully',
            story 
        };
    }

    // Chapter endpoints
    @Post(':storyId/chapter')
    async createChapter(
        @Param('storyId') storyId: string,
        @Body() createChapterDto: CreateChapterDto,
    ) {
        return this.storyService.createChapter(storyId, createChapterDto);
    }

    @Get(':storyId/chapter')
    async getChaptersByStory(@Param('storyId') storyId: string) {
        return this.storyService.findChaptersByStory(storyId);
    }

    @Get(':storyId/chapter/:index')
    async getChapterByIndex(
        @Param('storyId') storyId: string,
        @Param('index') index: number,
    ) {
        return this.storyService.findChapterByIndex(storyId, index);
    }

    @Put(':storyId/chapter/:index')
    async updateChapter(
        @Param('storyId') storyId: string,
        @Param('index') index: number,
        @Body() updateChapterDto: UpdateChapterDto,
    ) {
        return this.storyService.updateChapterByIndex(storyId, index, updateChapterDto);
    }

    @Delete(':storyId/chapter/:index')
    async deleteChapter(
        @Param('storyId') storyId: string,
        @Param('index') index: number,
    ) {
        await this.storyService.deleteChapterByIndex(storyId, index);
        return { message: 'Chapter deleted successfully' };
    }
}
