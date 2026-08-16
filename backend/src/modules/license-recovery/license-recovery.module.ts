import { Module } from '@nestjs/common';
import { LicenseRecoveryService } from './license-recovery.service';
import { LicenseRecoveryController } from './license-recovery.controller';
import { ActivationsModule } from '../activations/activations.module';
import { TokenModule } from '../token/token.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ActivationsModule,
    TokenModule,
    NotificationsModule,
  ],
  controllers: [LicenseRecoveryController],
  providers: [LicenseRecoveryService],
  exports: [LicenseRecoveryService],
})
export class LicenseRecoveryModule {}
