import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
    @Get()
    getHealth() {
        return {
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'Comic API',
        };
    }
}
