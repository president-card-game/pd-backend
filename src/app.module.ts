import { Module } from '@nestjs/common';

import { GameModule } from './game/game.module';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [RoomsModule, GameModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
