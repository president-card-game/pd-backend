import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CronJobService {
  private readonly logger = new Logger(CronJobService.name);

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkHealth(): Promise<void> {
    try {
      const response = await fetch(process.env.BASE_URL as string);
      const statusText = response?.status === 200 ? 'ok' : 'failed';
      this.logger.debug(`health check: ${statusText}`);
    } catch (error) {
      this.logger.debug(`health check: failed [${error}]`);
    }
  }
}
