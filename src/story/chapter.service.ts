import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Chapter } from './entities/chapter.entity';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { GenerateChapterResponseDto } from './dto/generate-chapter.dto';
import { cleanNextOptions } from 'src/common/utils/chapter.utils';
import { StoryPreviewChapterDto } from './dto/story-preview.dto';

@Injectable()
export class ChapterService {
    constructor(
        @InjectRepository(Chapter)
        private chapterRepository: Repository<Chapter>,
        private dataSource: DataSource,
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
    }: {
        storyId: string;
        userId: string | null;
    }): Promise<StoryPreviewChapterDto[]> {
        const result = await this.dataSource
            .getRepository(Chapter)
            .createQueryBuilder('c')
            .innerJoin('c.story', 's')
            .leftJoin(
                'chapter_states',
                'cs',
                'cs.chapter_id = c.id AND cs.user_id = :userId',
                { userId },
            )
            .select([
                'c.story_id AS "storyId"',
                `json_agg(
                jsonb_build_object(
                    'id',        c.id,
                    'index',     c.index,
                    'title',     c.title,
                    'isLock',    (
                        cs.chapter_id IS NULL 
                        AND s.author_id != :userId
                    ),
                    'createdAt', c.created_at::text,    -- ép về text để thành ISO string
                    'updatedAt', c.updated_at::text
                )
                ORDER BY c.index ASC
            ) AS chapters`,
            ])
            .where('c.story_id = :storyId', { storyId })
            .groupBy('c.story_id')
            .setParameters({ userId })
            .getRawOne();

        return result?.chapters || [];
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
            generation.structure?.nextOptions,
        );

        return {
            id: chapter.id,
            storyId: chapter.storyId,
            index: chapter.index,
            title: chapter.title,
            content: chapter.content,
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
