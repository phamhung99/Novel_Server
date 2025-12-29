import { Injectable, BadRequestException } from '@nestjs/common';
import { StoryCrudService } from './story-crud.service';
import { StoryStatus } from 'src/common/enums/story-status.enum';
import { StoryVisibility } from 'src/common/enums/story-visibility.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Story } from './entities/story.entity';

@Injectable()
export class StoryPublicationService {
    constructor(
        private storyCrudService: StoryCrudService,
        @InjectRepository(Story)
        private storyRepository: Repository<Story>,
    ) {}

    // Publication workflow methods
    async requestPublication(id: string): Promise<Story> {
        const story = await this.storyCrudService.findStoryById(id);

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
        const story = await this.storyCrudService.findStoryById(id);

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
        const story = await this.storyCrudService.findStoryById(id);

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
        const story = await this.storyCrudService.findStoryById(id);

        if (story.status !== StoryStatus.PUBLISHED) {
            throw new BadRequestException('Story is not published');
        }

        // Unpublish returns to private state
        story.status = StoryStatus.DRAFT;
        story.visibility = StoryVisibility.PRIVATE;

        return this.storyRepository.save(story);
    }
}
