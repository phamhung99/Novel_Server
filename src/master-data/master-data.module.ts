import { Module } from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { MasterDataController } from './master-data.controller';
import { StoryModule } from 'src/story/story.module';
import { UserModule } from 'src/user/user.module';

@Module({
    controllers: [MasterDataController],
    providers: [MasterDataService],
    imports: [StoryModule, UserModule],
})
export class MasterDataModule {}
