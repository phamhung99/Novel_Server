import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chapter } from './entities/chapter.entity';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { GenerateChapterResponseDto } from './dto/generate-chapter.dto';
import { cleanNextOptions } from 'src/common/utils/chapter.utils';

@Injectable()
export class ChapterService {
    constructor(
        @InjectRepository(Chapter)
        private chapterRepository: Repository<Chapter>,
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

    async findChaptersByStory(storyId: string) {
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
