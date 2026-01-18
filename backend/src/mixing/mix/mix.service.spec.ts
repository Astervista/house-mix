import { Test, TestingModule } from '@nestjs/testing';
import { MixService } from './mix.service';

describe('MixService', () => {
  let service: MixService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MixService],
    }).compile();

    service = module.get<MixService>(MixService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
