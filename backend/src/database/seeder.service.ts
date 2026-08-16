import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { Product, ProductDocument } from './schemas/product.schema';
import { ProductVersion, ProductVersionDocument } from './schemas/product-version.schema';
import {
  UserRole,
  ProductType,
  ProductStatus,
  MarketplaceProviderType,
  EnvatoMarket,
} from '../common/enums/app.enums';
import { LicensePlan, LicensePlanDocument } from './schemas/license-plan.schema';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductVersion.name)
    private versionModel: Model<ProductVersionDocument>,
    @InjectModel(LicensePlan.name) private planModel: Model<LicensePlanDocument>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedSuperAdmin();
    await this.seedDefaultLicensePlans();
    await this.seedSampleProduct();
  }

  private async seedSuperAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123456!';

    const existing = await this.userModel.findOne({ email: adminEmail.toLowerCase() });
    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      await this.userModel.create({
        email: adminEmail.toLowerCase(),
        fullName: 'Super Administrator',
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      });

      this.logger.log(
        `✅ Initial Super Admin seeded: ${adminEmail} / ${adminPassword}`,
      );
    }
  }

  private async seedSampleProduct() {
    const count = await this.productModel.countDocuments();
    if (count === 0) {
      const sample = await this.productModel.create({
        name: 'HyperLicense Pro - WordPress Plugin',
        slug: 'hyperlicense-pro',
        description:
          'Enterprise WordPress licensing, auto-update, and remote management plugin.',
        shortDescription: 'Advanced licensing and update engine for WordPress.',
        productType: ProductType.WORDPRESS_PLUGIN,
        status: ProductStatus.ACTIVE,
        currentVersion: '1.2.0',
        latestStableVersion: '1.2.0',
        licenseSettings: {
          licenseRequired: true,
          defaultActivationLimit: 2,
          domainBinding: true,
          installationBinding: true,
          allowLocalhost: true,
          countLocalhost: false,
          allowStaging: true,
          countStaging: false,
          allowDeactivation: true,
          validationIntervalHours: 24,
          offlineGracePeriodDays: 7,
          automaticUpdatesEnabled: true,
          downloadsEnabled: true,
        },
        distributionChannels: [
          {
            provider: MarketplaceProviderType.INTERNAL,
            enabled: true,
          },
          {
            provider: MarketplaceProviderType.ENVATO,
            enabled: true,
            externalItemId: '28491048',
            market: EnvatoMarket.CODECANYON,
          },
        ],
      });

      await this.versionModel.create({
        productId: (sample as any)._id,
        version: '1.2.0',
        releaseName: 'Performance & Security Upgrade',
        releaseNotes:
          'Added automatic background heartbeats and improved token caching.',
        minPhpVersion: '7.4',
        minWordPressVersion: '5.8',
        isPublic: true,
        downloadPackageUrl:
          'https://downloads.example.com/packages/hyperlicense-pro-1.2.0.zip',
        publishedAt: new Date(),
      });

      this.logger.log('✅ Sample product seeded: "hyperlicense-pro" (v1.2.0)');
    }
  }

  private async seedDefaultLicensePlans() {
    const count = await this.planModel.countDocuments();
    if (count === 0) {
      const plans = [
        {
          name: 'Single Site',
          slug: 'single-site',
          description: 'Default license for a single website installation.',
          price: 49,
          currency: 'USD',
          sortOrder: 1,
          activationLimit: 1,
          licenseDurationDays: 365,
          supportDurationDays: 365,
          allowLocalhost: true,
          countLocalhost: false,
          allowStaging: true,
          countStaging: false,
          allowDeactivation: true,
          deactivationCooldownHours: 0,
          periodicValidation: true,
          validationIntervalHours: 24,
          offlineGracePeriodDays: 7,
          automaticUpdatesEnabled: true,
          downloadsEnabled: true,
          isDefault: true,
        },
        {
          name: '3 Sites',
          slug: '3-sites',
          description: 'License allowing activation on up to 3 separate websites.',
          price: 99,
          currency: 'USD',
          sortOrder: 2,
          activationLimit: 3,
          licenseDurationDays: 365,
          supportDurationDays: 365,
          allowLocalhost: true,
          countLocalhost: false,
          allowStaging: true,
          countStaging: false,
          allowDeactivation: true,
          deactivationCooldownHours: 0,
          periodicValidation: true,
          validationIntervalHours: 24,
          offlineGracePeriodDays: 7,
          automaticUpdatesEnabled: true,
          downloadsEnabled: true,
        },
        {
          name: 'Developer',
          slug: 'developer',
          description: 'Developer license supporting up to 5 activation slots.',
          price: 149,
          currency: 'USD',
          sortOrder: 3,
          activationLimit: 5,
          licenseDurationDays: 365,
          supportDurationDays: 365,
          allowLocalhost: true,
          countLocalhost: false,
          allowStaging: true,
          countStaging: false,
          allowDeactivation: true,
          deactivationCooldownHours: 0,
          periodicValidation: true,
          validationIntervalHours: 24,
          offlineGracePeriodDays: 7,
          automaticUpdatesEnabled: true,
          downloadsEnabled: true,
        },
        {
          name: '10 Sites',
          slug: '10-sites',
          description: 'License allowing activation on up to 10 separate websites.',
          price: 199,
          currency: 'USD',
          sortOrder: 4,
          activationLimit: 10,
          licenseDurationDays: 365,
          supportDurationDays: 365,
          allowLocalhost: true,
          countLocalhost: false,
          allowStaging: true,
          countStaging: false,
          allowDeactivation: true,
          deactivationCooldownHours: 0,
          periodicValidation: true,
          validationIntervalHours: 24,
          offlineGracePeriodDays: 7,
          automaticUpdatesEnabled: true,
          downloadsEnabled: true,
        },
        {
          name: 'Agency',
          slug: 'agency',
          description: 'Agency license supporting up to 25 activation slots.',
          price: 299,
          currency: 'USD',
          sortOrder: 5,
          isFeatured: true,
          activationLimit: 25,
          licenseDurationDays: 365,
          supportDurationDays: 365,
          allowLocalhost: true,
          countLocalhost: false,
          allowStaging: true,
          countStaging: false,
          allowDeactivation: true,
          deactivationCooldownHours: 0,
          periodicValidation: true,
          validationIntervalHours: 24,
          offlineGracePeriodDays: 7,
          automaticUpdatesEnabled: true,
          downloadsEnabled: true,
        },
        {
          name: 'Unlimited',
          slug: 'unlimited',
          description: 'License allowing activation on an unlimited number of websites.',
          price: 399,
          currency: 'USD',
          sortOrder: 6,
          activationLimit: 0,
          licenseDurationDays: 365,
          supportDurationDays: 365,
          allowLocalhost: true,
          countLocalhost: false,
          allowStaging: true,
          countStaging: false,
          allowDeactivation: true,
          deactivationCooldownHours: 0,
          periodicValidation: true,
          validationIntervalHours: 24,
          offlineGracePeriodDays: 7,
          automaticUpdatesEnabled: true,
          downloadsEnabled: true,
        },
        {
          name: 'Lifetime',
          slug: 'lifetime',
          description: 'Lifetime license with permanent updates and 1 year of support.',
          price: 599,
          currency: 'USD',
          sortOrder: 7,
          activationLimit: 1,
          licenseDurationDays: 0,
          supportDurationDays: 365,
          allowLocalhost: true,
          countLocalhost: false,
          allowStaging: true,
          countStaging: false,
          allowDeactivation: true,
          deactivationCooldownHours: 0,
          periodicValidation: true,
          validationIntervalHours: 24,
          offlineGracePeriodDays: 7,
          automaticUpdatesEnabled: true,
          downloadsEnabled: true,
        },
      ];

      for (const plan of plans) {
        await this.planModel.create(plan);
      }
      this.logger.log('✅ Default license plans seeded successfully.');
    } else {
      // Ensure existing plans have prices
      await this.planModel.updateMany({ price: { $exists: false } }, { $set: { price: 49, currency: 'USD' } });
    }
  }
}
