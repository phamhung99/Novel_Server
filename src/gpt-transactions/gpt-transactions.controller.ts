import { Controller } from '@nestjs/common';
import { GptTransactionsService } from './gpt-transactions.service';

@Controller('gpt-transactions')
export class GptTransactionsController {
    constructor(
        private readonly gptTransactionsService: GptTransactionsService,
    ) {}
}
