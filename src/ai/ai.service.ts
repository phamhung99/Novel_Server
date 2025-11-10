import { Injectable } from '@nestjs/common';
import { OpenAIApiService } from './providers/openai-api.service';
import { GeminiApiService } from './providers/gemini-api.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AiService {
    constructor(
        private openAIApiService: OpenAIApiService,
        private geminiApiService: GeminiApiService,
        private userservice: UserService,
    ) {}
}
