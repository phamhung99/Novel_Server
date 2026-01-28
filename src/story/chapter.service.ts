import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Chapter } from './entities/chapter.entity';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { GenerateChapterResponseDto } from './dto/generate-chapter.dto';
import { cleanNextOptions } from 'src/common/utils/chapter.utils';
import { StoryPreviewChapterDto } from './dto/story-preview.dto';
import { Story } from './entities/story.entity';
import { UserService } from 'src/user/user.service';
import { UserRole } from 'src/common/enums/app.enum';
import { stripHtml } from 'src/common/utils/html.utils';

interface ChaptersWithLockParams {
    storyId: string;
    userId: string | null;
}

@Injectable()
export class ChapterService {
    constructor(
        @InjectRepository(Chapter)
        private chapterRepository: Repository<Chapter>,
        @InjectRepository(Story)
        private storyRepository: Repository<Story>,
        private dataSource: DataSource,
        private readonly userService: UserService,
    ) {}

    async createChapter(
        storyId: string,
        createChapterDto: CreateChapterDto,
    ): Promise<Chapter> {
        const chapter = this.chapterRepository.create({
            ...createChapterDto,
            storyId,
        });
        return this.chapterRepository.save(chapter);
    }

    async createChaptersBulk(
        storyId: string,
        createChaptersDto: CreateChapterDto[],
    ): Promise<Chapter[]> {
        const chapters = createChaptersDto.map((dto) =>
            this.chapterRepository.create({
                ...dto,
                storyId,
            }),
        );
        return this.chapterRepository.save(chapters);
    }

    async findDetailChaptersByStory(storyId: string) {
        const chapters = await this.chapterRepository.find({
            select: {
                id: true,
                index: true,
                title: true,
                content: true,
                chapterGenerations: {
                    id: true,
                    structure: true,
                },
            },
            where: { storyId },
            relations: ['chapterGenerations'],
            order: { index: 'ASC' },
        });

        return chapters.map((chapter) => ({
            id: chapter.id,
            index: chapter.index,
            title: chapter.title,
            content: chapter.content,
            structure: chapter.chapterGenerations?.[0]?.structure || null,
        }));
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
    async findChapterById(id: string): Promise<Chapter> {
        const chapter = await this.chapterRepository.findOne({
            where: { id },
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

    async findChapterByIndex(
        storyId: string,
        index: number,
    ): Promise<GenerateChapterResponseDto> {
        const chapter = await this.chapterRepository.findOne({
            where: { storyId, index },
            relations: ['chapterGenerations'],
            order: {
                chapterGenerations: {
                    createdAt: 'DESC',
                },
            },
        });

        if (!chapter) {
            throw new NotFoundException(
                `Chapter ${index} not found in story ${storyId}`,
            );
        }

        const generation = chapter.chapterGenerations?.[0];

        const cleanedNextOptions = cleanNextOptions(
            generation?.structure?.nextOptions ?? [],
        );

        return {
            id: chapter.id,
            storyId: chapter.storyId,
            index: chapter.index,
            title: chapter.title,
            content: chapter.content,
            plainContent: stripHtml(chapter.content),
            createdAt: chapter.createdAt,
            updatedAt: chapter.updatedAt,
            structure: {
                nextOptions: cleanedNextOptions,
            },
        };
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
}
