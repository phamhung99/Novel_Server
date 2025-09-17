import { Test, TestingModule } from '@nestjs/testing';
import { IapProductService } from './iap-product.service';

describe('IapProductService', () => {
    let service: IapProductService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [IapProductService],
        }).compile();

        service = module.get<IapProductService>(IapProductService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
