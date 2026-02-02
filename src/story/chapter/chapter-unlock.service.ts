import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Chapter } from '../entities/chapter.entity';
import { DataSource, Repository } from 'typeorm';
import { Story } from '../entities/story.entity';
import { UserService } from 'src/user/user.service';
import { StoryPreviewChapterDto } from '../dto/story-preview.dto';
import { UserRole } from 'src/common/enums/app.enum';

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
        private readonly userService: UserService,
    ) {}

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
}
