import { Controller, Get, Headers } from '@nestjs/common';
import { MasterDataService } from './master-data.service';

@Controller('master-data')
export class MasterDataController {
    constructor(private readonly masterDataService: MasterDataService) {}

    @Get()
    async getMasterData(@Headers('x-user-id') userId: string): Promise<any> {
        return this.masterDataService.getMasterData(userId);
    }
}
