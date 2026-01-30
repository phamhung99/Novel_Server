import { Module } from '@nestjs/common';
import { GooglePlayService } from './google-play.service';

@Module({
    providers: [GooglePlayService],
    exports: [GooglePlayService],
})
export class GooglePlayModule {}
