import { Module } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';
import { LicenseExpiryScheduler } from './license-expiry.scheduler';

@Module({
  controllers: [LicensesController],
  providers: [LicensesService, LicenseExpiryScheduler],
  exports: [LicensesService],
})
export class LicensesModule {}
