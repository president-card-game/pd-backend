import { Module } from '@nestjs/common';

import { GameModule, RoomsModule } from './domain';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PresentationModule } from './presentation/presentation.module';
import { CronJobService } from './shared/services/cron-job.service';

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
