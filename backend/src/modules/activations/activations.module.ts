import { Module } from '@nestjs/common';
import { ActivationsService } from './activations.service';
import { ActivationsController } from './activations.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivationHealthScheduler } from './activation-health.scheduler';

@Module({
  imports: [NotificationsModule],
  controllers: [ActivationsController],
  providers: [ActivationsService, ActivationHealthScheduler],
  exports: [ActivationsService],
})
export class ActivationsModule {}
