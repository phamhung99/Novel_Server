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
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { parseQueryOptions } from 'src/common/utils/parse-query-options.util';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

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
            'firstName',
            'lastName',
            'country',
            'ipCountryCode',
            'username',
            'email',
            'profileImage',
            'active',
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
