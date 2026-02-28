import {
    BadRequestException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Chapter } from '../entities/chapter.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Story } from '../entities/story.entity';
import { UserService } from 'src/user/user.service';
import { StoryPreviewChapterDto } from '../dto/story-preview.dto';
import { CoinReferenceType, UserRole } from 'src/common/enums/app.enum';
import { CHAPTER_UNLOCK_FEE } from 'src/common/constants/app.constant';
import { ChapterState } from '../entities/chapter-states.entity';

interface ChaptersWithLockParams {
    storyId: string;
    userId: string | null;
}

@Injectable()
export class ChapterUnlockService {
    constructor(
        @InjectRepository(Chapter)
        private chapterRepository: Repository<Chapter>,
        @InjectRepository(Story)
        private storyRepository: Repository<Story>,
        private dataSource: DataSource,
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
    ) {}

    async canUserAccessChapter(
        userId: string | null,
        chapterId: string,
    ): Promise<{
        canAccess: boolean;
        reason?: string;
        chapter?: { id: string; index: number; title?: string };
        story?: { id: string; authorId: string };
    }> {
        // 1. Lấy chapter (cần index để so sánh freeChaptersCount)
        const chapter = await this.chapterRepository.findOne({
            where: { id: chapterId },
            select: ['id', 'index', 'title', 'storyId'],
        });

        if (!chapter) {
            return { canAccess: false, reason: 'Chapter not found' };
        }

        // 2. Lấy story (chỉ các field cần thiết)
        const story = await this.storyRepository.findOne({
            where: { id: chapter.storyId },
            select: ['id', 'authorId', 'freeChaptersCount', 'isFullyFree'],
        });

        if (!story) {
            return { canAccess: false, reason: 'Story not found' };
        }

        // 3. Quyền đặc biệt - Admin
        if (userId) {
            const role = await this.userService.findUserRoleById(userId);
            if (role === UserRole.ADMIN) {
                return {
                    canAccess: true,
                    chapter: {
                        id: chapter.id,
                        index: chapter.index,
                        title: chapter.title,
                    },
                    story: { id: story.id, authorId: story.authorId },
                };
            }
        }

        // 4. Quyền đặc biệt - Tác giả
        if (userId === story.authorId) {
            return {
                canAccess: true,
                chapter: {
                    id: chapter.id,
                    index: chapter.index,
                    title: chapter.title,
                },
                story: { id: story.id, authorId: story.authorId },
            };
        }

        // 5. Truyện miễn phí hoàn toàn
        if (story.isFullyFree) {
            return {
                canAccess: true,
                chapter: {
                    id: chapter.id,
                    index: chapter.index,
                    title: chapter.title,
                },
                story: { id: story.id, authorId: story.authorId },
            };
        }

        // 6. Chương nằm trong số chương miễn phí
        if (chapter.index <= story.freeChaptersCount) {
            return {
                canAccess: true,
                chapter: {
                    id: chapter.id,
                    index: chapter.index,
                    title: chapter.title,
                },
                story: { id: story.id, authorId: story.authorId },
            };
        }

        // 7. Đã unlock trước đó
        if (userId) {
            const state = await this.dataSource
                .getRepository(ChapterState)
                .findOne({
                    where: { userId, chapterId: chapter.id },
                });

            if (state) {
                return {
                    canAccess: true,
                    chapter: {
                        id: chapter.id,
                        index: chapter.index,
                        title: chapter.title,
                    },
                    story: { id: story.id, authorId: story.authorId },
                };
            }
        }

        // 8. Còn lại → khóa
        return {
            canAccess: false,
            reason: 'This chapter is locked. Please unlock with coins to read.',
            chapter: {
                id: chapter.id,
                index: chapter.index,
                title: chapter.title,
            },
            story: { id: story.id, authorId: story.authorId },
        };
    }

    async canUserAccessChapterByStoryAndIndex(
        userId: string | null,
        storyId: string,
        chapterIndex: number,
    ): Promise<{
        canAccess: boolean;
        reason?: string;
        chapter?: { id: string; index: number; title?: string };
    }> {
        // 1. Lấy story (chỉ cần các field cần thiết)
        const story = await this.storyRepository.findOne({
            where: { id: storyId },
            select: ['id', 'authorId', 'freeChaptersCount', 'isFullyFree'],
        });

        if (!story) {
            return { canAccess: false, reason: 'Story not found' };
        }

        // 2. Lấy chapter
        const chapter = await this.chapterRepository.findOne({
            where: { storyId, index: chapterIndex },
            select: ['id', 'index', 'title'],
        });

        if (!chapter) {
            return {
                canAccess: false,
                reason: `Chapter ${chapterIndex} not found in this story`,
            };
        }

        // 3. Quyền đặc biệt - Admin
        if (userId) {
            const role = await this.userService.findUserRoleById(userId);
            if (role === UserRole.ADMIN) {
                return { canAccess: true, chapter };
            }
        }

        // 4. Quyền đặc biệt - Tác giả
        if (userId === story.authorId) {
            return { canAccess: true, chapter };
        }

        // 5. Truyện miễn phí hoàn toàn
        if (story.isFullyFree) {
            return { canAccess: true, chapter };
        }

        // 6. Chương nằm trong số chương miễn phí
        if (chapter.index <= story.freeChaptersCount) {
            return { canAccess: true, chapter };
        }

        // 7. Đã unlock trước đó
        if (userId) {
            const state = await this.dataSource
                .getRepository(ChapterState)
                .findOne({
                    where: { userId, chapterId: chapter.id },
                });

            if (state) {
                return { canAccess: true, chapter };
            }
        }

        // 8. Còn lại → khóa
        return {
            canAccess: false,
            reason: 'This chapter is locked. Please unlock with coins to read.',
            chapter,
        };
    }

    async getChaptersWithLockForUser({
        storyId,
        userId,
    }: ChaptersWithLockParams): Promise<StoryPreviewChapterDto[]> {
        // Lấy thông tin story (cache nếu có thể)
        const story = await this.storyRepository.findOne({
            where: { id: storyId },
            select: ['id', 'authorId', 'freeChaptersCount', 'isFullyFree'],
        });

        if (!story) {
            throw new NotFoundException('Story not found');
        }

        // Xác định quyền đặc biệt
        const isAuthor = userId === story.authorId;
        let isAdmin = false;

        if (userId) {
            const userRole = await this.userService.findUserRoleById(userId);

            isAdmin = userRole === UserRole.ADMIN;
        }

        if (isAdmin) {
            const chapters = await this.chapterRepository.find({
                where: { storyId },
                select: ['id', 'index', 'title', 'createdAt', 'updatedAt'],
                order: { index: 'ASC' },
            });

            return chapters.map((ch) => ({
                id: ch.id,
                index: ch.index,
                title: ch.title,
                isLock: false,
                createdAt: ch.createdAt,
                updatedAt: ch.updatedAt,
            })) as StoryPreviewChapterDto[];
        }

        // Fetch chapters + trạng thái unlock của user hiện tại
        const chaptersRaw = await this.chapterRepository
            .createQueryBuilder('c')
            .leftJoin(
                'chapter_states',
                'cs',
                'cs.chapter_id = c.id AND cs.user_id = :userId',
                { userId: userId || '' },
            )
            .where('c.story_id = :storyId', { storyId })
            .select([
                'c.id AS "id"',
                'c.index AS "index"',
                'c.title AS "title"',
                'c.created_at AS "createdAt"',
                'c.updated_at AS "updatedAt"',
                'cs.chapter_id AS "unlockedChapterId"',
            ])
            .orderBy('c.index', 'ASC')
            .getRawMany();

        // Tính toán isLock cho từng chapter
        return chaptersRaw.map((ch) => {
            const isFreeByIndex = ch.index <= story.freeChaptersCount;
            const isUnlocked = !!ch.unlockedChapterId;

            const isLocked =
                !story.isFullyFree &&
                !isFreeByIndex &&
                !isUnlocked &&
                !isAuthor;

            return {
                id: ch.id,
                index: ch.index,
                title: ch.title,
                isLock: isLocked,
                createdAt: ch.createdAt,
                updatedAt: ch.updatedAt,
            } as StoryPreviewChapterDto;
        });
    }

    async unlockChapterWithCoin({
        userId,
        storyId,
        index,
    }: {
        userId: string;
        storyId: string;
        index: string | number;
    }): Promise<{
        success: boolean;
        message: string;
        data?: Partial<StoryPreviewChapterDto>;
    }> {
        const chapterIndex = Number(index);
        if (isNaN(chapterIndex) || chapterIndex < 1) {
            throw new BadRequestException('Invalid chapter index');
        }

        const accessCheck = await this.canUserAccessChapterByStoryAndIndex(
            userId,
            storyId,
            chapterIndex,
        );

        if (!accessCheck.chapter) {
            throw new NotFoundException(
                accessCheck.reason || 'Chapter or story not found',
            );
        }

        if (accessCheck.canAccess) {
            return {
                success: true,
                message: 'Chapter is already accessible',
                data: {
                    id: accessCheck.chapter.id,
                    index: accessCheck.chapter.index,
                    title: accessCheck.chapter.title,
                    isLock: false,
                },
            };
        }

        // Tiến hành unlock (giữ nguyên transaction logic cũ)
        return this.dataSource.transaction(async (manager) => {
            const chapter = accessCheck.chapter!;

            const { newBalance } = await this.userService.spendCoins({
                userId,
                amount: CHAPTER_UNLOCK_FEE,
                referenceType: CoinReferenceType.CHAPTER_UNLOCK,
                referenceId: chapter.id,
                description: `Unlocked chapter "${chapter.title}"`,
                manager,
            });

            await manager.getRepository(ChapterState).save({
                userId,
                chapterId: chapter.id,
                unlockedAt: new Date(),
            });

            return {
                success: true,
                message: `Chapter unlocked successfully. Coins spent: ${CHAPTER_UNLOCK_FEE}. New balance: ${newBalance}`,
                data: {
                    id: chapter.id,
                    index: chapter.index,
                    title: chapter.title,
                    isLock: false,
                },
            };
        });
    }

    async unlockChapterWithAds({
        userId,
        chapterId,
        manager,
    }: {
        userId: string;
        chapterId?: string;
        storyId?: string;
        index?: string | number;
        manager?: EntityManager;
    }): Promise<{
        success: boolean;
        message: string;
        data?: Partial<StoryPreviewChapterDto>;
    }> {
        // Validate input
        if (!chapterId) {
            throw new BadRequestException('Chapter ID is required');
        }

        const execute = async (tx: EntityManager) => {
            // Check access
            const accessCheck = await this.canUserAccessChapter(
                userId,
                chapterId,
            );

            if (!accessCheck.chapter) {
                return {
                    success: false,
                    message: accessCheck.reason || 'Chapter or story not found',
                };
            }

            if (accessCheck.canAccess) {
                return {
                    success: false,
                    message: 'Chapter is already accessible',
                };
            }

            // Unlock chapter without spending coins
            const chapter = accessCheck.chapter;

            await tx.getRepository(ChapterState).save({
                userId,
                chapterId: chapter.id,
                unlockedAt: new Date(),
            });

            return {
                success: true,
                message: `Chapter unlocked successfully by watching ad.`,
                data: {
                    id: chapter.id,
                    index: chapter.index,
                    title: chapter.title,
                    isLock: false,
                },
            };
        };

        return manager
            ? execute(manager)
            : this.dataSource.transaction(execute);
    }
}
