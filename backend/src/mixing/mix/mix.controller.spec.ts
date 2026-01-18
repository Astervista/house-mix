import { Test, TestingModule } from '@nestjs/testing';
import { MixController } from './mix.controller';

describe('MixController', () => {
  let controller: MixController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MixController],
    }).compile();

    controller = module.get<MixController>(MixController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
