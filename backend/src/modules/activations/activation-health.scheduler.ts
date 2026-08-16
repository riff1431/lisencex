import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Activation, ActivationDocument } from '../../database/schemas/activation.schema';
import { License, LicenseDocument } from '../../database/schemas/license.schema';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';
import { ActivationsService } from './activations.service';
import { ActivationStatus } from '../../common/enums/app.enums';

@Injectable()
export class ActivationHealthScheduler {
  private readonly logger = new Logger(ActivationHealthScheduler.name);

  constructor(
    @InjectModel(Activation.name)
    private activationModel: Model<ActivationDocument>,
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    private activationsService: ActivationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleActivationHealthCheck() {
    this.logger.log('⏳ Running background activation health check scan...');

    try {
      const activeActivations = await this.activationModel
        .find({ status: ActivationStatus.ACTIVE })
        .populate('productId')
        .populate({
          path: 'licenseId',
          populate: { path: 'licensePlanId' },
        });

      if (activeActivations.length === 0) {
        this.logger.log('✅ No active activations found.');
        return;
      }

      let updatedCount = 0;

      for (const activation of activeActivations) {
        const product = activation.productId;
        const license = activation.licenseId;

        const healthResult = this.activationsService.computeHealthStatus(
          activation,
          product,
          license,
        );

        const oldHealth = activation.healthStatus || 'healthy';
        const oldFlagged = activation.flaggedForReview || false;

        if (healthResult.health !== oldHealth || healthResult.flagged !== oldFlagged) {
          activation.healthStatus = healthResult.health;
          activation.flaggedForReview = healthResult.flagged;
          
          if (healthResult.health === 'Offline') {
            activation.apiHealth = 'offline';
          } else if (healthResult.health === 'Validation Overdue') {
            activation.apiHealth = 'overdue';
          } else {
            activation.apiHealth = 'healthy';
          }

          await activation.save();
          updatedCount++;

          // Write to audit log
          await this.auditLogModel.create({
            actorEmail: 'system-scheduler',
            action: 'ACTIVATION_HEALTH_CHANGED',
            targetType: 'activation',
            targetId: activation.activationId,
            before: { healthStatus: oldHealth, flaggedForReview: oldFlagged },
            after: { healthStatus: healthResult.health, flaggedForReview: healthResult.flagged },
          });

          this.logger.log(
            `⚠️ Health status changed for Activation ${activation.activationId} (${activation.domain}): ${oldHealth} -> ${healthResult.health}`,
          );
        }
      }

      this.logger.log(`✅ Successfully scanned ${activeActivations.length} activations. Updated ${updatedCount} records.`);
    } catch (err) {
      this.logger.error('❌ Failed to execute background activation health check', err);
    }
  }
}
