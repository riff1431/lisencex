import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { Purchase, PurchaseDocument } from '../../database/schemas/purchase.schema';
import { License, LicenseDocument } from '../../database/schemas/license.schema';
import { Activation, ActivationDocument } from '../../database/schemas/activation.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { DownloadLog, DownloadLogDocument } from '../../database/schemas/download-log.schema';
import { ValidationLog, ValidationLogDocument } from '../../database/schemas/validation-log.schema';
import { BlockedEntity, BlockedEntityDocument } from '../../database/schemas/blocked-entity.schema';
import { UserRole } from '../../common/enums/app.enums';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Purchase.name) private purchaseModel: Model<PurchaseDocument>,
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(Activation.name) private activationModel: Model<ActivationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(DownloadLog.name) private downloadLogModel: Model<DownloadLogDocument>,
    @InjectModel(ValidationLog.name) private validationLogModel: Model<ValidationLogDocument>,
    @InjectModel(BlockedEntity.name) private blockedEntityModel: Model<BlockedEntityDocument>,
  ) {}

  private buildFilter(query: any, dateField: string = 'createdAt') {
    const filter: any = {};
    if (query.productId && Types.ObjectId.isValid(query.productId)) {
      filter.productId = new Types.ObjectId(query.productId);
    }
    if (query.marketplace) {
      filter.source = query.marketplace;
    }
    if (query.licensePlanId && Types.ObjectId.isValid(query.licensePlanId)) {
      filter.licensePlanId = new Types.ObjectId(query.licensePlanId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.userId && Types.ObjectId.isValid(query.userId)) {
      filter.userId = new Types.ObjectId(query.userId);
    }
    if (query.startDate || query.endDate) {
      const dateRange: any = {};
      if (query.startDate) {
        dateRange.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        dateRange.$lte = new Date(new Date(query.endDate).setHours(23, 59, 59, 999));
      }
      filter[dateField] = dateRange;
    }
    return filter;
  }

  async getOverview(query: any) {
    const licenseFilter = this.buildFilter(query, 'createdAt');
    const activationFilter = this.buildFilter(query, 'createdAt');
    const purchaseFilter = this.buildFilter(query, 'purchasedAt');
    const downloadFilter = this.buildFilter(query, 'downloadedAt');
    const validationFilter = this.buildFilter(query, 'timestamp');

    const [
      totalProducts,
      totalPurchases,
      totalLicenses,
      totalActivations,
      totalCustomers,
      totalDownloads,
      totalValidationChecks,
      totalBlockedEntities,
    ] = await Promise.all([
      this.productModel.countDocuments(query.productId ? { _id: new Types.ObjectId(query.productId) } : {}),
      this.purchaseModel.countDocuments(purchaseFilter),
      this.licenseModel.countDocuments(licenseFilter),
      this.activationModel.countDocuments({ ...activationFilter, status: 'active' }),
      this.userModel.countDocuments({ role: UserRole.CUSTOMER }),
      this.downloadLogModel.countDocuments(downloadFilter),
      this.validationLogModel.countDocuments(validationFilter),
      this.blockedEntityModel.countDocuments({}),
    ]);

    return {
      products: totalProducts,
      purchases: totalPurchases,
      licenses: totalLicenses,
      activations: totalActivations,
      customers: totalCustomers,
      downloads: totalDownloads,
      validationChecks: totalValidationChecks,
      blockedEntities: totalBlockedEntities,
    };
  }

  async getCharts(query: any) {
    const licenseFilter = this.buildFilter(query, 'createdAt');
    const activationFilter = this.buildFilter(query, 'createdAt');

    // License and Activation growth grouped by Date
    const [licenseGrowth, activationGrowth, marketplaceDistribution, versionUsage] = await Promise.all([
      this.licenseModel.aggregate([
        { $match: licenseFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
      this.activationModel.aggregate([
        { $match: { ...activationFilter, status: 'active' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
      this.licenseModel.aggregate([
        { $match: licenseFilter },
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      this.activationModel.aggregate([
        { $match: { ...activationFilter, status: 'active' } },
        {
          $group: {
            _id: '$productVersion',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return {
      licenseGrowth: licenseGrowth.map((g) => ({ date: g._id, count: g.count })),
      activationGrowth: activationGrowth.map((g) => ({ date: g._id, count: g.count })),
      marketplaceDistribution: marketplaceDistribution.map((m) => ({ name: m._id, value: m.count })),
      versionUsage: versionUsage.map((v) => ({ version: v._id || 'unknown', count: v.count })),
    };
  }

  async getProductsPerformance(query: any) {
    const licenseFilter = this.buildFilter(query, 'createdAt');

    const performance = await this.licenseModel.aggregate([
      { $match: licenseFilter },
      {
        $group: {
          _id: '$productId',
          licenseCount: { $sum: 1 },
          activeActivations: { $sum: '$currentActivationCount' },
          suspendedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] },
          },
          revokedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'revoked'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 1,
          productName: '$product.name',
          productSlug: '$product.slug',
          licenseCount: 1,
          activeActivations: 1,
          suspendedCount: 1,
          revokedCount: 1,
        },
      },
      { $sort: { licenseCount: -1 } },
    ]);

    return performance;
  }

  async getFailedActivations(query: any) {
    const validationFilter = this.buildFilter(query, 'timestamp');
    
    const logs = await this.validationLogModel
      .find({ ...validationFilter, status: { $ne: 'VALID' } })
      .populate('productId', 'name slug')
      .populate('licenseId', 'licenseKey')
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    return logs.map((log) => ({
      id: (log as any)._id,
      productName: log.productId ? (log.productId as any).name : 'Unknown Product',
      licenseKey: log.licenseId ? (log.licenseId as any).licenseKey : 'N/A',
      domain: log.domain,
      status: log.status,
      message: log.message,
      ip: log.ip,
      timestamp: log.timestamp,
    }));
  }

  async getLicenseStatusBreakdown(query: any) {
    const licenseFilter = this.buildFilter(query, 'createdAt');

    const breakdown = await this.licenseModel.aggregate([
      { $match: licenseFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const unusedCount = await this.licenseModel.countDocuments({
      ...licenseFilter,
      currentActivationCount: 0,
    });

    const results = breakdown.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      active: results['active'] || 0,
      expired: results['expired'] || 0,
      suspended: results['suspended'] || 0,
      revoked: results['revoked'] || 0,
      unused: unusedCount,
    };
  }

  async getActivationLimitUsage(query: any) {
    const licenseFilter = this.buildFilter(query, 'createdAt');

    const limits = await this.licenseModel.aggregate([
      { $match: licenseFilter },
      {
        $group: {
          _id: { limit: '$activationLimit', count: '$currentActivationCount' },
          licensesCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          limit: '$_id.limit',
          currentCount: '$_id.count',
          licensesCount: 1,
        },
      },
      { $sort: { limit: 1, currentCount: 1 } },
    ]);

    return limits;
  }

  async exportCsv(reportType: string, query: any): Promise<string> {
    if (reportType === 'products') {
      const data = await this.getProductsPerformance(query);
      let csv = 'Product Name,Product Slug,Total Licenses,Active Activations,Suspended,Revoked\n';
      for (const row of data) {
        csv += `"${row.productName}",${row.productSlug},${row.licenseCount},${row.activeActivations},${row.suspendedCount},${row.revokedCount}\n`;
      }
      return csv;
    } else if (reportType === 'limits') {
      const data = await this.getActivationLimitUsage(query);
      let csv = 'Activation Limit,Current Activation Count,Licenses Count\n';
      for (const row of data) {
        csv += `${row.limit},${row.currentCount},${row.licensesCount}\n`;
      }
      return csv;
    } else if (reportType === 'failed') {
      const data = await this.getFailedActivations(query);
      let csv = 'Timestamp,Product Name,License Key,Domain,Status,Error Message,IP Address\n';
      for (const row of data) {
        csv += `"${row.timestamp.toISOString()}","${row.productName}","${row.licenseKey}","${row.domain || ''}","${row.status}","${row.message || ''}",${row.ip || ''}\n`;
      }
      return csv;
    }

    throw new Error('Unsupported report type');
  }
}
