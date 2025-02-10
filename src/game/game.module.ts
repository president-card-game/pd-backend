import { Module } from '@nestjs/common';

import { RoomsModule } from '../rooms/rooms.module';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';

@Module({
  providers: [GameService, GameGateway],
  imports: [RoomsModule],
  exports: [GameService],
})
export class GameModule {}
