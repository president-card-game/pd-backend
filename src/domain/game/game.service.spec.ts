import { Test, TestingModule } from '@nestjs/testing';

import { GameService } from './game.service';
import { RoomsService } from '../rooms';

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameService, RoomsService],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
