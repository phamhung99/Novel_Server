import { Injectable, BadRequestException } from '@nestjs/common';
import { StoryCrudService } from './story-crud.service';
import { StoryStatus } from 'src/common/enums/story-status.enum';
import { StoryVisibility } from 'src/common/enums/story-visibility.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

        const canApprove =
            story.status === StoryStatus.PENDING ||
            (story.status === StoryStatus.DRAFT && story.authorId === adminId);

        if (!canApprove) {
            throw new BadRequestException(
                `Cannot approve story ${id} in status: ${story.status}`,
            );
        }

        // Approve = Publish directly
        story.status = StoryStatus.PUBLISHED;
        story.visibility = StoryVisibility.PUBLIC;
        story.approvedBy = adminId;
        story.approvedAt = new Date();
        story.rejectionReason = null;

        return this.storyRepository.save(story);
    }

    async bulkApproveStories(
        storyIds: string[],
        adminId: string,
    ): Promise<{
        affected: number;
        approvedIds: string[];
        invalid?: { id: string; status: StoryStatus; reason?: string }[];
    }> {
        if (!storyIds.length) {
            return { affected: 0, approvedIds: [] };
        }

        const stories = await this.storyRepository.find({
            where: { id: In(storyIds) },
            select: ['id', 'status', 'authorId'],
        });

        if (!stories.length) {
            throw new BadRequestException(
                'No stories found with the provided IDs',
            );
        }

        // Phân loại story hợp lệ & không hợp lệ
        const validStoryIds: string[] = [];
        const invalidStories: {
            id: string;
            status: StoryStatus;
            reason?: string;
        }[] = [];

        for (const story of stories) {
            const canApprove =
                story.status === StoryStatus.PENDING ||
                (story.status === StoryStatus.DRAFT &&
                    story.authorId === adminId);

            if (canApprove) {
                validStoryIds.push(story.id);
            } else {
                invalidStories.push({
                    id: story.id,
                    status: story.status,
                    reason:
                        story.authorId !== adminId
                            ? 'Not author (for DRAFT)'
                            : undefined,
                });
            }
        }

        if (validStoryIds.length === 0) {
            throw new BadRequestException({
                message: 'No stories can be approved',
                invalid: invalidStories,
            });
        }

        // Thực hiện update hàng loạt – rất nhanh
        const now = new Date();

        const updateResult = await this.storyRepository
            .createQueryBuilder()
            .update(Story)
            .set({
                status: StoryStatus.PUBLISHED,
                visibility: StoryVisibility.PUBLIC,
                approvedBy: adminId,
                approvedAt: now,
                rejectionReason: null,
            })
            .whereInIds(validStoryIds)
            .execute();

        return {
            affected: updateResult.affected || 0,
            approvedIds: validStoryIds,
            invalid: invalidStories,
        };
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
