import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { Story } from './entities/story.entity';
import { StoryLikes } from './entities/story-likes.entity';
import { StoryViews } from './entities/story-views.entity';
import { StorySummary } from './entities/story-summary.entity';
import { StoryVisibility } from 'src/common/enums/story-visibility.enum';
import { StoryStatus } from 'src/common/enums/story-status.enum';
import { getStartOfDay } from 'src/common/utils/date.utils';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class StoryInteractionService {
    constructor(
        private dataSource: DataSource,
        @InjectRepository(Story)
        private storyRepository: Repository<Story>,
    ) {}

    async likeStory(storyId: string, userId: string) {
        return this.dataSource.transaction(async (manager) => {
            const story = await manager.findOne(Story, {
                where: {
                    id: storyId,
                    visibility: StoryVisibility.PUBLIC,
                    status: StoryStatus.PUBLISHED,
                },
            });

            if (!story) {
                throw new NotFoundException(
                    'Story not found or not accessible',
                );
            }

            const existingLike = await manager.findOne(StoryLikes, {
                where: {
                    storyId,
                    userId,
                },
            });

            if (existingLike) {
                return {
                    isLike: true,
                };
            }

            const newLike = manager.create(StoryLikes, {
                storyId,
                userId,
            });
            await manager.save(newLike);

            await manager.increment(StorySummary, { storyId }, 'likesCount', 1);

            return {
                isLike: true,
            };
        });
    }

    async unlikeStory(storyId: string, userId: string) {
        return this.dataSource.transaction(async (manager) => {
            const story = await manager.findOne(Story, {
                where: {
                    id: storyId,
                    visibility: StoryVisibility.PUBLIC,
                    status: StoryStatus.PUBLISHED,
                },
            });

            if (!story) {
                throw new NotFoundException(
                    'Story not found or not accessible',
                );
            }

            const likeRecord = await manager.findOne(StoryLikes, {
                where: {
                    storyId,
                    userId,
                },
            });

            if (!likeRecord) {
                return {
                    isLike: false,
                };
            }

            await manager.remove(likeRecord);

            await manager.decrement(StorySummary, { storyId }, 'likesCount', 1);

            return {
                isLike: false,
            };
        });
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
}
