import { Controller, Get, Req, Headers } from '@nestjs/common';
import { UserService } from './user.service';
import { Request } from 'express';
import { GptUserInfoResponseDto } from '../common/dto/gpt-user-info-response.dto';

@Controller('gpt')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('user/info')
    async getUserInfo(
        @Req() request: Request,
        @Headers('x-user-id') userId: string,
        @Headers('x-version') version: number = 1,
        @Headers('x-package') packageName: string = '',
        @Headers('x-language') language: string = '',
    ): Promise<GptUserInfoResponseDto> {
        let user = await this.userService.findById(userId);
        if (!user) {
            user = await this.userService.createOrUpdateUser(
                userId,
                version,
                packageName,
                language,
                request.ip,
            );
        }

        const userInfo = await this.userService.getUserInfo(user.id);

        userInfo.imgGenInDayNum = await this.userService.getImgGenInDayNum(
            user.id,
        );

        return userInfo;
    }
}
