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
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { parseQueryOptions } from 'src/common/utils/parse-query-options.util';
import { ERROR_MESSAGES } from 'src/common/constants/app.constant';
import { UpdateUserGenresDto } from './dto/update-user-genres.dto';
import { IapStore } from 'src/common/enums/app.enum';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';

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
