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
    Query,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    UseGuards,
} from '@nestjs/common';
import { StoryService } from './story.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { RejectStoryDto } from './dto/reject-story.dto';
import {
    GenerateChapterDto,
    GenerateChapterResponseDto,
} from './dto/generate-chapter.dto';
import {
    InitializeStoryDto,
    InitializeStoryResponseDto,
} from './dto/generate-story-outline.dto';
import {
    AllowedImageMimeTypes,
    IapStore,
    LibraryType,
    UserRole,
} from 'src/common/enums/app.enum';
import {
    DEFAULT_COVER_IMAGE_URL,
    ERROR_MESSAGES,
    MAX_FILE_SIZE_UPLOAD,
} from 'src/common/constants/app.constant';
import { UserService } from 'src/user/user.service';
import { ChapterService } from './chapter.service';
import { PaginationDto } from './dto/pagination.dto';
import { DiscoverStoriesDto } from './dto/discover-stories.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CustomMaxFileSizeValidator } from 'src/common/validators/custom-max-file-size.validator';
import { MimeTypeValidator } from 'src/common/validators/mime-type.validator';
import { GenerateCoverImageDto } from './dto/generate-cover-image.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';

@Controller('story')
export class StoryController {
    constructor(
        private readonly storyService: StoryService,
        private readonly userService: UserService,
        private readonly chapterService: ChapterService,
    ) {}

    @Get('trending/keywords')
    async getTrendingKeywords(): Promise<{ keyword: string; score: number }[]> {
        return this.storyService.getTopTrendingKeywords();
    }

    @Post(':storyId/upload-cover')
    @UseInterceptors(
        FileInterceptor('image', {
            storage: diskStorage({
                destination:
                    process.env.NODE_ENV === 'production'
                        ? '/tmp'
                        : join(process.cwd(), 'tmp'),
                filename: (req, file, cb) => {
                    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                    cb(
                        null,
                        `${file.fieldname}-${unique}${extname(file.originalname)}`,
                    );
                },
            }),
            limits: { fileSize: MAX_FILE_SIZE_UPLOAD.IMAGE },
        }),
    )
    async uploadCover(
        @Headers('x-user-id') userId: string,
        @Param('storyId') storyId: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new CustomMaxFileSizeValidator(MAX_FILE_SIZE_UPLOAD),
                    new MimeTypeValidator(AllowedImageMimeTypes),
                ],
                fileIsRequired: true,
            }),
        )
        file: Express.Multer.File,
    ) {
        if (!userId) throw new BadRequestException('userId required');

        const coverImageUrl = await this.storyService.updateStoryCoverImage(
            storyId,
            file,
        );

        return {
            coverImageUrl,
        };
    }

    @Post(':storyId/like')
    async likeStory(
        @Param('storyId') storyId: string,
        @Headers('x-user-id') userId: string,
    ) {
        return this.storyService.likeStory(storyId, userId);
    }

    @Post(':storyId/unlike')
    async unlikeStory(
        @Param('storyId') storyId: string,
        @Headers('x-user-id') userId: string,
    ) {
        return this.storyService.unlikeStory(storyId, userId);
    }

    @Get('/library')
    async getUserLibrary(
        @Headers('x-user-id') userId: string,
        @Query('type') type: LibraryType,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.storyService.getUserLibrary(userId, type, paginationDto);
    }

    @Get('/top-trending')
    async getTopTrending(
        @Headers('x-user-id') userId: string,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.storyService.getTopTrending(userId, paginationDto);
    }

    @Get('/top-trending/categories/:categoryId')
    async getTopTrendingByCategory(
        @Headers('x-user-id') userId: string,
        @Param('categoryId') categoryId: string,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.storyService.getTopTrendingByCategory(
            userId,
            categoryId,
            paginationDto,
        );
    }

    @Get('/discover')
    async getDiscoverStories(
        @Headers('x-user-id') userId: string,
        @Query() discoverStoriesDto: DiscoverStoriesDto,
    ) {
        return this.storyService.getDiscoverStories(userId, discoverStoriesDto);
    }

    @Get('categories')
    getAllCategories() {
        return this.storyService.getAllCategories();
    }

    @Post(':storyId/generate/cover-image')
    generateCoverImage(
        @Headers('x-user-id') userId: string,
        @Headers('x-skip-image') skipImage: boolean = false,
        @Param('storyId') storyId: string,
        @Body() dto: GenerateCoverImageDto,
    ) {
        if (skipImage) {
            return {
                coverImageUrl: DEFAULT_COVER_IMAGE_URL,
            };
        }
        return this.storyService.generateStoryCoverImage(
            userId,
            storyId,
            dto.prompt,
            dto.model,
        );
    }

    // REQUEST 1: Initialize story with outline
    @Post('generate/initialize')
    @SkipTransform()
    async initializeStory(
        @Headers('x-user-id') userId: string,
        @Body() initializeStoryDto: InitializeStoryDto,
        @Headers('x-request-id') headerRequestId?: string,
        @Query('requestId') queryRequestId?: string,
    ): Promise<InitializeStoryResponseDto> {
        const requestId = queryRequestId ?? headerRequestId;
        if (!requestId) {
            throw new BadRequestException('requestId is required');
        }
        return this.storyService.initializeStoryWithOutline(
            userId,
            requestId,
            initializeStoryDto,
        );
    }

    @Get('generate/initialize/result')
    async getInitializationResults(
        @Headers('x-request-id') headerRequestId?: string,
        @Query('requestId') queryRequestId?: string,
        @Headers('x-skip-image') skipImage: boolean = false,
    ): Promise<InitializeStoryResponseDto[]> {
        const requestId = queryRequestId ?? headerRequestId;
        if (!requestId) {
            throw new BadRequestException('requestId is required');
        }
        return this.storyService.getInitializationResults(requestId, skipImage);
    }

    @Post(':storyId/generate/chapter')
    @SkipTransform()
    async generateChapterWithContext(
        @Param('storyId') storyId: string,
        @Body() generateChapterDto: GenerateChapterDto,
        @Headers('x-request-id') headerRequestId?: string,
        @Query('requestId') queryRequestId?: string,
    ): Promise<GenerateChapterResponseDto> {
        const requestId = queryRequestId ?? headerRequestId;
        if (!requestId) {
            throw new BadRequestException('requestId is required');
        }

        return await this.storyService.generateChapters(
            storyId,
            requestId,
            generateChapterDto,
        );
    }

    @Get('generate/chapter/result')
    async getGeneratedChapterResults(
        @Headers('x-request-id') headerRequestId?: string,
        @Query('requestId') queryRequestId?: string,
    ): Promise<GenerateChapterResponseDto> {
        const requestId = queryRequestId ?? headerRequestId;

        if (!requestId) {
            throw new BadRequestException('requestId is required');
        }

        return await this.storyService.getGeneratedChapterResults(requestId);
    }

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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    async getAllStories(@Query() paginationDto: PaginationDto) {
        return this.storyService.findAllStories(paginationDto);
    }

    @Get('public')
    async getPublicStories(@Query() paginationDto: PaginationDto) {
        return this.storyService.findPublicStories(paginationDto);
    }

    @Get('pending')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    async getPendingStories(@Query() paginationDto: PaginationDto) {
        return this.storyService.findPendingStories(paginationDto);
    }

    @Get('author/:authorId')
    async getStoriesByAuthor(@Param('authorId') authorId: string) {
        return this.storyService.findStoriesByAuthor(authorId);
    }

    @Get(':id')
    async getStoryById(
        @Param('id') id: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-platform') platform: IapStore,
    ) {
        if (!id) {
            throw new BadRequestException(ERROR_MESSAGES.STORY_ID_REQUIRED);
        }

        if (!userId) {
            throw new BadRequestException(ERROR_MESSAGES.USER_ID_REQUIRED);
        }

        const user = await this.userService.findById(userId);
        if (!user) {
            throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const isMobile =
            platform === IapStore.IOS || platform === IapStore.ANDROID;

        let story;

        if (isMobile) {
            story = await this.storyService.findPreviewStoryById(id, userId);
        } else {
            story = await this.storyService.findDetailStoryById(id, userId);
        }

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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.EDITOR)
    async getDeletedStories(@Query() paginationDto: PaginationDto) {
        return this.storyService.findDeletedStories(paginationDto);
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
    async requestPublication(@Param('id') id: string) {
        const story = await this.storyService.requestPublication(id);
        return {
            message: 'Publication request submitted successfully',
            story,
        };
    }

    @Post('bulk-request-publication')
    @UseGuards(JwtAuthGuard)
    async bulkRequestPublication(
        @Headers('x-user-id') userId: string,
        @Body('storyIds') storyIds: string[],
    ) {
        if (!userId) {
            throw new BadRequestException('User ID is required');
        }

        if (!Array.isArray(storyIds) || storyIds.length === 0) {
            throw new BadRequestException('storyIds must be a non-empty array');
        }

        const result = await this.storyService.bulkRequestPublication(
            storyIds,
            userId,
        );

        return {
            message: `Successfully requested publication for ${result.requested} stories`,
            requestedCount: result.requested,
            requestedIds: result.requestedIds,
            failedCount: result.invalidIds.length,
            failedDetails: result.invalidReasons,
        };
    }

    @Post(':id/approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async approveStory(
        @Headers('x-user-id') adminId: string,
        @Param('id') id: string,
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

    @Post('bulk-approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async bulkApproveStories(
        @Headers('x-user-id') adminId: string,
        @Body('storyIds') storyIds: string[],
    ) {
        if (!adminId) {
            throw new BadRequestException('Admin ID is required');
        }

        if (!Array.isArray(storyIds) || storyIds.length === 0) {
            throw new BadRequestException(
                'storyIds must be a non-empty array of strings',
            );
        }

        const result = await this.storyService.bulkApproveStories(
            storyIds,
            adminId,
        );

        return {
            message: `Successfully approved and published ${result.affected} stories`,
            approvedCount: result.affected,
            approvedIds: result.approvedIds,
            invalidIds: result.invalidIds,
            failedCount: result.invalid?.length || 0,
        };
    }

    @Post(':id/reject')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
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
        return this.chapterService.createChapter(storyId, createChapterDto);
    }

    @Post(':storyId/chapter/bulk')
    async createChaptersBulk(
        @Param('storyId') storyId: string,
        @Body() createChaptersDto: CreateChapterDto[],
    ) {
        return this.chapterService.createChaptersBulk(
            storyId,
            createChaptersDto,
        );
    }

    @Get(':storyId/chapter')
    async getChaptersByStory(@Param('storyId') storyId: string) {
        if (!storyId) {
            throw new BadRequestException(ERROR_MESSAGES.STORY_ID_REQUIRED);
        }

        return this.chapterService.findDetailChaptersByStory(storyId);
    }

    @Get(':storyId/chapters')
    async getChaptersWithLockForUser(
        @Param('storyId') storyId: string,
        @Headers('x-user-id') userId: string,
    ) {
        if (!storyId) {
            throw new BadRequestException(ERROR_MESSAGES.STORY_ID_REQUIRED);
        }

        return this.chapterService.getChaptersWithLockForUser({
            storyId,
            userId,
        });
    }

    @Get(':storyId/chapter/:index')
    async getChapterByIndex(
        @Headers('x-user-id') userId: string,
        @Param('storyId') storyId: string,
        @Param('index') index: number,
    ) {
        if (!storyId) {
            throw new BadRequestException(ERROR_MESSAGES.STORY_ID_REQUIRED);
        }

        if (!userId) {
            throw new BadRequestException(ERROR_MESSAGES.USER_ID_REQUIRED);
        }

        const chapter = await this.chapterService.findChapterByIndex(
            storyId,
            index,
        );

        await this.storyService.incrementChapterView({
            chapterId: chapter.id,
            userId: userId,
        });

        return chapter;
    }

    @Put(':storyId/chapter/:index')
    async updateChapter(
        @Param('storyId') storyId: string,
        @Param('index') index: number,
        @Body() updateChapterDto: UpdateChapterDto,
    ) {
        return this.chapterService.updateChapterByIndex(
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
        await this.chapterService.deleteChapterByIndex(storyId, index);
        return { message: 'Chapter deleted successfully' };
    }

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
