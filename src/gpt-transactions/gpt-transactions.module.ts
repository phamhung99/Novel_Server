import { Module } from '@nestjs/common';
import { GptTransactionsService } from './gpt-transactions.service';
import { GptTransactionsController } from './gpt-transactions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GptTransaction } from './entity/gpt-transaction.entity';

@Module({
    controllers: [GptTransactionsController],
    providers: [GptTransactionsService],
    exports: [GptTransactionsService],
    imports: [TypeOrmModule.forFeature([GptTransaction])],
})
export class GptTransactionsModule {}
