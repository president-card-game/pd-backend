import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { GameModule } from './game/game.module';
import { PresentationModule } from './presentation/presentation.module';
import { RoomsModule } from './rooms/rooms.module';
import { CronJobService } from './shared/cron-job.service';

@Module({
  imports: [
    RoomsModule,
    GameModule,
    PresentationModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [CronJobService],
})
export class AppModule {}
