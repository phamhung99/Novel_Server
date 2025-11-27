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
    // UseInterceptors,
    // UploadedFile,
    // ParseFilePipe,
} from '@nestjs/common';
import { StoryService } from './story.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { RequestPublicationDto } from './dto/request-publication.dto';
import { ApproveStoryDto } from './dto/approve-story.dto';
import { RejectStoryDto } from './dto/reject-story.dto';
import {
    GenerateChapterDto,
    GenerateChapterResponseDto,
} from './dto/generate-chapter.dto';
import {
    InitializeStoryDto,
    InitializeStoryResponseDto,
} from './dto/generate-story-outline.dto';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { diskStorage } from 'multer';
// import { extname, join } from 'path';
// import { existsSync, mkdirSync } from 'fs';
// import { MAX_FILE_SIZE_UPLOAD } from 'src/common/constants/app.constant';
// import { CustomMaxFileSizeValidator } from 'src/common/validators/custom-max-file-size.validator';
// import { MimeTypeValidator } from 'src/common/validators/mime-type.validator';
// import { AllowedImageMimeTypes } from 'src/common/enums/app.enum';

@Controller('story')
export class StoryController {
    constructor(private readonly storyService: StoryService) {}

    // @Post('upload-cover')
    // @UseInterceptors(
    //     FileInterceptor('image', {
    //         storage: diskStorage({
    //             destination: tmpDir,
    //             filename: (req, file, cb) => {
    //                 const uniqueSuffix =
    //                     Date.now() + '-' + Math.round(Math.random() * 1e9);
    //                 cb(
    //                     null,
    //                     `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
    //                 );
    //             },
    //         }),
    //     }),
    // )
    // async uploadCover(
    //     @Headers('x-user-id') userId: string,
    //     @UploadedFile(
    //         new ParseFilePipe({
    //             validators: [
    //                 new CustomMaxFileSizeValidator(MAX_FILE_SIZE_UPLOAD),
    //                 new MimeTypeValidator(AllowedImageMimeTypes),
    //             ],
    //             fileIsRequired: true,
    //         }),
    //     )
    //     image: Express.Multer.File,
    // ): Promise<any> {
    //     if (!userId) {
    //         throw new BadRequestException('userId is required');
    //     }
    //     if (!image) {
    //         throw new BadRequestException('No file uploaded');
    //     }
    //     return {
    //         filename: image.filename,
    //         path: image.path,
    //     };
    // }

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
            story,
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
            story,
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
        const story = await this.storyService.rejectStory(
            id,
            adminId,
            rejectDto.reason,
        );
        return {
            message: 'Story rejected',
            story,
        };
    }

    @Post(':id/unpublish')
    async unpublishStory(@Param('id') id: string) {
        const story = await this.storyService.unpublishStory(id);
        return {
            message: 'Story unpublished successfully',
            story,
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

    @Post(':storyId/chapter/bulk')
    async createChaptersBulk(
        @Param('storyId') storyId: string,
        @Body() createChaptersDto: CreateChapterDto[],
    ) {
        return this.storyService.createChaptersBulk(storyId, createChaptersDto);
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
        return this.storyService.updateChapterByIndex(
            storyId,
            index,
            updateChapterDto,
        );
    }

    @Delete(':storyId/chapter/:index')
    async deleteChapter(
        @Param('storyId') storyId: string,
        @Param('index') index: number,
    ) {
        await this.storyService.deleteChapterByIndex(storyId, index);
        return { message: 'Chapter deleted successfully' };
    }

    // REQUEST 1: Initialize story with outline
    @Post('generate/initialize')
    async initializeStory(
        @Headers('x-user-id') userId: string,
        @Body() initializeStoryDto: InitializeStoryDto,
    ): Promise<InitializeStoryResponseDto> {
        if (!userId) {
            throw new BadRequestException('userId is required');
        }
        return this.storyService.initializeStoryWithOutline(
            userId,
            initializeStoryDto,
        );
    }

    @Post(':storyId/generate/chapter')
    async generateChapterWithContext(
        @Param('storyId') storyId: string,
        @Body() generateChapterDto: GenerateChapterDto,
    ): Promise<GenerateChapterResponseDto> {
        if (!storyId) {
            throw new BadRequestException('storyId is required');
        }

        return await this.storyService.generateChapters(
            storyId,
            generateChapterDto,
        );
    }

    // Legacy endpoint (kept for backward compatibility)
    // @Post(':storyId/generate/chapter')
    // async generateChapter(
    //     @Param('storyId') storyId: string,
    //     @Body() generateChapterDto: GenerateChapterDto,
    // ) {
    //     const result = await this.storyService.generateChapter(
    //         storyId,
    //         generateChapterDto,
    //     );
    //     return {
    //         message: 'Chapter generated successfully',
    //         data: result,
    //     };
    // }

    // Generation History endpoints
    @Get(':storyId/generation/history')
    async getGenerationHistory(@Param('storyId') storyId: string) {
        const history =
            await this.storyService.getStoryGenerationHistory(storyId);
        return {
            message: 'Generation history retrieved successfully',
            data: history,
        };
    }

    @Get('generation/:generationId')
    async getGenerationById(@Param('generationId') generationId: string) {
        const generation =
            await this.storyService.getGenerationById(generationId);
        return {
            message: 'Generation details retrieved successfully',
            data: generation,
        };
    }

    @Get(':storyId/generation/chapters/history')
    async getChapterGenerationHistory(@Param('storyId') storyId: string) {
        const history =
            await this.storyService.getChapterGenerationHistory(storyId);
        return {
            message: 'Chapter generation history retrieved successfully',
            data: history,
        };
    }
}
