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
import { excludeFields } from 'src/common/utils/exclude-fields';
import { StoryCategory } from 'src/common/enums/app.enum';
import { UpdateUserGenresDto } from './dto/update-user-genres.dto';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

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
    async getSelectedCategories(
        @Headers('x-user-id') userId: string,
    ): Promise<StoryCategory[]> {
        return this.userService.getSelectedGenres(userId);
    }

    @Post('categories')
    async updateSelectedCategories(
        @Headers('x-user-id') userId: string,
        @Body() body: UpdateUserGenresDto,
    ): Promise<StoryCategory[]> {
        if (!Array.isArray(body.genres)) {
            throw new BadRequestException('genres must be an array');
        }

        return this.userService.updateSelectedGenres(userId, body.genres);
    }

    @Get('info')
    async getUserInfo(
        @Headers('x-user-id') userId: string,
        @Headers('x-language') language: string,
    ): Promise<any> {
        if (!userId) {
            throw new BadRequestException(ERROR_MESSAGES.USER_ID_REQUIRED);
        }

        const user = await this.userService.createOrUpdateUser({
            userId,
            language,
        });

        const cleanedUser = excludeFields(user, ['password']);

        return {
            user: {
                ...cleanedUser,
                subscription: {
                    isSubUser: false,
                    basePlanId: null,
                },
                wallet: {
                    totalCoins: 80,
                    permanentCoins: 0,
                    temporaryCoins: [
                        { amount: 50, expiresAt: '2025-12-31T23:59:59Z' },
                        { amount: 30, expiresAt: '2026-01-15T23:59:59Z' },
                    ],
                },
            },
        };
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
