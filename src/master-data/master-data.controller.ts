import { Controller, Get, Headers } from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { IapStore } from 'src/common/enums/app.enum';

@Controller('master-data')
export class MasterDataController {
    constructor(private readonly masterDataService: MasterDataService) {}

    @Get()
    async getMasterData(
        @Headers('x-user-id') userId: string,
        @Headers('x-platform') platform: IapStore,
    ): Promise<any> {
        return this.masterDataService.getMasterData(userId, platform);
    }
}
