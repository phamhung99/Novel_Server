import { Controller } from '@nestjs/common';
import { AiService } from './ai.service';
import { UserService } from 'src/user/user.service';

@Controller('/ai')
export class AiController {
    constructor(
        private readonly aiService: AiService,
        private readonly userService: UserService,
    ) {}
}
