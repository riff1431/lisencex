import { Module } from '@nestjs/common';
import { ActivationsService } from './activations.service';
import { ActivationsController } from './activations.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ActivationsController],
  providers: [ActivationsService],
  exports: [ActivationsService],
})
export class ActivationsModule {}
