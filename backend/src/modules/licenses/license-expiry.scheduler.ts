import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { License, LicenseDocument } from '../../database/schemas/license.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';
import { LicenseStatus } from '../../common/enums/app.enums';

@Injectable()
export class LicenseExpiryScheduler {
  private readonly logger = new Logger(LicenseExpiryScheduler.name);

  constructor(
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleLicenseExpiryCheck() {
    this.logger.log('⏳ Running background license expiry scan...');

    try {
      // Find all ACTIVE or PENDING licenses where expiresAt is defined and in the past
      const expiredLicenses = await this.licenseModel.find({
        status: { $in: [LicenseStatus.ACTIVE, LicenseStatus.PENDING] },
        expiresAt: { $ne: null, $lt: new Date() },
      });

      if (expiredLicenses.length === 0) {
        this.logger.log('✅ No newly expired licenses detected.');
        return;
      }

      this.logger.log(`⚠️ Found ${expiredLicenses.length} expired licenses. Processing status changes...`);

      for (const license of expiredLicenses) {
        const previousStatus = license.status;
        license.status = LicenseStatus.EXPIRED;
        await license.save();

        // Write to audit log
        await this.auditLogModel.create({
          actorEmail: 'system-scheduler',
          action: 'LICENSE_EXPIRED',
          targetType: 'license',
          targetId: license._id.toString(),
          before: { status: previousStatus, expiresAt: license.expiresAt },
          after: { status: license.status, expiresAt: license.expiresAt },
        });

        this.logger.log(`🔴 License ${license.licenseKey} has expired and marked accordingly.`);
      }

      this.logger.log(`✅ Successfully updated ${expiredLicenses.length} expired licenses.`);
    } catch (err) {
      this.logger.error('❌ Failed to execute background expiry checker', err);
    }
  }
}
