import { Module } from '@nestjs/common';

import { GameModule } from './game/game.module';
import { PresentationModule } from './presentation/presentation.module';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [RoomsModule, GameModule, PresentationModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
