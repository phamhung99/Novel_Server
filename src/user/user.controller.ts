import {
    Controller,
    Get,
    Param,
    Body,
    Patch,
    Delete,
    Query,
    DefaultValuePipe,
    ParseIntPipe,
    Headers,
    BadRequestException,
    Post,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { parseQueryOptions } from 'src/common/utils/parse-query-options.util';
import {
    ERROR_MESSAGES,
    MAX_FILE_SIZE_UPLOAD,
} from 'src/common/constants/app.constant';
import { UpdateUserGenresDto } from './dto/update-user-genres.dto';
import { AllowedImageMimeTypes, IapStore } from 'src/common/enums/app.enum';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';
import { extname, join } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CustomMaxFileSizeValidator } from 'src/common/validators/custom-max-file-size.validator';
import { MimeTypeValidator } from 'src/common/validators/mime-type.validator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post('ads/watch')
    @SkipTransform()
    async watchAds(@Headers('x-user-id') userId: string) {
        if (!userId) {
            throw new BadRequestException(ERROR_MESSAGES.USER_ID_REQUIRED);
        }

        const result = await this.userService.watchAdsAndGrantBonus(userId);
        return result;
    }

    @Patch('me')
    @UseInterceptors(
        FileInterceptor('profileImage', {
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
    async updateMe(
        @Headers('x-user-id') userId: string,
        @Body() updateDto: UpdateUserDto,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new CustomMaxFileSizeValidator(MAX_FILE_SIZE_UPLOAD),
                    new MimeTypeValidator(AllowedImageMimeTypes),
                ],
                fileIsRequired: false,
            }),
        )
        file?: Express.Multer.File,
    ) {
        if (!userId) {
            throw new BadRequestException(ERROR_MESSAGES.USER_ID_REQUIRED);
        }

        return this.userService.updateUser(userId, updateDto, file);
    }

    @Get('recent-story')
    async getRecentStories(
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Headers('x-user-id') userId: string,
    ) {
        return await this.userService.getRecentStories(userId, {
            limit,
            page,
        });
    }

    @Get('categories')
    async getSelectedCategories(@Headers('x-user-id') userId: string) {
        return this.userService.getSelectedCategories(userId);
    }

    @Post('categories')
    async updateSelectedCategories(
        @Headers('x-user-id') userId: string,
        @Body() body: UpdateUserGenresDto,
    ): Promise<void> {
        if (!Array.isArray(body.categoryIds)) {
            throw new BadRequestException('genres must be an array');
        }

        return this.userService.updateSelectedCategories(
            userId,
            body.categoryIds,
        );
    }

    @Get('info')
    async getUserInfo(
        @Headers('x-user-id') userId: string,
        @Headers('x-language') language: string,
        @Headers('x-platform') platform: IapStore,
    ): Promise<any> {
        if (!userId) {
            throw new BadRequestException(ERROR_MESSAGES.USER_ID_REQUIRED);
        }

        if (!Object.values(IapStore).includes(platform as IapStore)) {
            throw new BadRequestException('Invalid platform.');
        }

        const user = await this.userService.createOrUpdateUser({
            userId,
            language,
            platform,
        });

        return await this.userService.getUserInfo(user);
    }

    @Get()
    async getAllUsers(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
        @Query('filter') filter?: string,
        @Query('sort') sort?: string,
        @Query('fields') fields?: string,
        @Query('searchField') searchField?: string,
        @Query('searchValue') searchValue?: string,
    ) {
        const validKeys: (keyof User)[] = [
            'id',
            'country',
            'ipCountryCode',
            'username',
            'email',
            'profileImage',
            'deletedAt',
            'createdAt',
            'updatedAt',
        ];

        const options = parseQueryOptions<User>(
            { filter, sort, fields, page, limit, searchField, searchValue },
            validKeys,
        );

        const { data, total } = await this.userService.findAndCount(options);

        return { users: data, total };
    }

    @Get(':id')
    async getUserById(@Param('id') id: string): Promise<User | null> {
        return this.userService.findById(id);
    }

    @Patch(':id')
    async updateUser(
        @Param('id') id: string,
        @Body() updateData: Partial<User>,
    ): Promise<User> {
        return this.userService.update(id, updateData);
    }

    @Delete(':id')
    async deleteUser(@Param('id') id: string): Promise<void> {
        return this.userService.delete(id);
    }
}
