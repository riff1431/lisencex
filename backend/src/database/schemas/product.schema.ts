import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ProductStatus,
  ProductType,
  MarketplaceProviderType,
  EnvatoMarket,
  LicenseType,
  IntegrationStatus,
} from '../../common/enums/app.enums';

export type ProductDocument = Product & Document;

export enum MarketplaceSource {
  OWN_MARKETPLACE = 'own_marketplace',
  ENVATO = 'envato',
  BOTH = 'both',
}

@Schema({ _id: false })
export class LicenseSettings {
  @Prop({ type: Boolean, default: true })
  licenseRequired: boolean;

  @Prop({ type: String, enum: Object.values(LicenseType), default: LicenseType.REGULAR })
  defaultLicenseType: LicenseType;

  @Prop({ type: Number, default: 0 }) // 0 or null = lifetime
  licenseDurationDays?: number;

  @Prop({ type: Number, default: 180 }) // 180 days = 6 months
  supportDurationDays?: number;

  @Prop({ type: Number, default: 1 })
  defaultActivationLimit: number;

  @Prop({ type: Boolean, default: true })
  domainBinding: boolean;

  @Prop({ type: Boolean, default: true })
  installationBinding: boolean;

  @Prop({ type: Boolean, default: true })
  allowLocalhost: boolean;

  @Prop({ type: Boolean, default: false })
  countLocalhost: boolean;

  @Prop({ type: Boolean, default: true })
  allowStaging: boolean;

  @Prop({ type: Boolean, default: false })
  countStaging: boolean;

  @Prop({ type: Boolean, default: true })
  allowDeactivation: boolean;

  @Prop({ type: Number, default: 0 })
  deactivationCooldownHours: number;

  @Prop({ type: Boolean, default: true })
  periodicValidation: boolean;

  @Prop({ type: Number, default: 24 })
  validationIntervalHours: number;

  @Prop({ type: Number, default: 7 })
  offlineGracePeriodDays: number;

  @Prop({ type: Boolean, default: true })
  automaticUpdatesEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  downloadsEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  recoveryEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  autoApproveRecovery: boolean;

  @Prop({ type: Number, default: 3 })
  recoveryLimit: number;

  @Prop({ type: Number, default: 720 }) // 720 hours = 30 days
  recoveryCooldownHours: number;
}

export const LicenseSettingsSchema =
  SchemaFactory.createForClass(LicenseSettings);

@Schema({ _id: false })
export class DistributionChannel {
  @Prop({
    type: String,
    enum: Object.values(MarketplaceProviderType),
    required: true,
  })
  provider: MarketplaceProviderType;

  @Prop({ type: Boolean, default: true })
  enabled: boolean;

  @Prop({ type: String, default: null })
  externalItemId?: string;

  @Prop({ type: String, enum: Object.values(EnvatoMarket), default: null })
  market?: EnvatoMarket;

  @Prop({ type: String, default: null })
  productUrl?: string;

  @Prop({ type: Number, default: 0 })
  price?: number;

  @Prop({ type: Number, default: 0 })
  extendedPrice?: number;
}

export const DistributionChannelSchema =
  SchemaFactory.createForClass(DistributionChannel);

@Schema({ _id: false })
export class EmergencyKillSwitch {
  @Prop({ type: Boolean, default: false })
  disableNewActivations: boolean;

  @Prop({ type: Boolean, default: false })
  disableValidation: boolean;

  @Prop({ type: Boolean, default: false })
  disableUpdatesDownloads: boolean;

  @Prop({ type: Boolean, default: false })
  isProductSuspended: boolean;

  @Prop({ type: String, default: null })
  activeReason?: string;

  @Prop({ type: Date, default: null })
  activatedAt?: Date;

  @Prop({ type: String, default: null })
  activatedBy?: string;
}

export const EmergencyKillSwitchSchema = SchemaFactory.createForClass(EmergencyKillSwitch);

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ type: String, default: null, trim: true })
  sku?: string;

  @Prop({ type: String, default: '' })
  description: string;

  @Prop({ type: String, default: '' })
  shortDescription: string;

  @Prop({
    type: String,
    enum: Object.values(ProductType),
    default: ProductType.WORDPRESS_PLUGIN,
  })
  productType: ProductType;

  @Prop({
    type: String,
    enum: Object.values(ProductStatus),
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @Prop({
    type: String,
    enum: Object.values(MarketplaceSource),
    default: MarketplaceSource.OWN_MARKETPLACE,
  })
  marketplaceSource: MarketplaceSource;

  @Prop({ type: Number, default: 49 })
  price: number;

  @Prop({ type: Number, default: 199 })
  extendedPrice: number;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: String, default: null })
  thumbnailUrl?: string;

  @Prop({ type: String, default: null })
  iconUrl?: string;

  @Prop({ type: String, default: null })
  logoUrl?: string;

  @Prop({ type: String, default: null })
  bannerUrl?: string;

  @Prop({ type: [String], default: [] })
  screenshots: string[];

  @Prop({ type: [Object], default: [] })
  mediaGallery: Array<{
    url: string;
    title?: string;
    type?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
    order?: number;
    uploadedAt?: Date;
  }>;

  @Prop({ type: Object, default: {} })
  mediaMetadata?: Record<string, any>;

  @Prop({ type: String, default: null })
  packageFileUrl?: string;

  @Prop({ type: String, default: '1.0.0' })
  currentVersion: string;

  @Prop({ type: String, default: '1.0.0' })
  latestStableVersion: string;

  @Prop({ type: String, default: null })
  demoUrl?: string;

  @Prop({ type: String, default: null })
  documentationUrl?: string;

  @Prop({ type: String, default: '' })
  requirements: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null, index: true })
  primaryCategoryId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [], index: true })
  categoryIds: Types.ObjectId[];

  @Prop({ type: [String], default: [], index: true })
  tags: string[];

  @Prop({ type: Boolean, default: false, index: true })
  isFeatured: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isPopular: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isNewRelease: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isBestSeller: boolean;

  @Prop({ type: String, default: null })
  badgeLabel?: string;

  @Prop({ type: Number, default: 0, index: true })
  salesCount: number;

  @Prop({ type: Number, default: 0, index: true })
  viewCount: number;

  @Prop({ type: Number, default: 5.0, index: true })
  averageRating: number;

  @Prop({ type: Number, default: 0 })
  totalReviews: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
  bundleProductIds: Types.ObjectId[];

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        description: { type: String, default: '' },
        licenseType: { type: String, default: 'regular' },
      },
    ],
    default: [],
  })
  addons: Array<{
    name: string;
    price: number;
    description?: string;
    licenseType?: string;
  }>;

  @Prop({ type: Object, default: {} })
  compatibility: {
    minPhpVersion?: string;
    maxPhpVersion?: string;
    minWordPressVersion?: string;
    minNodeVersion?: string;
    databases?: string[];
    frameworks?: string[];
    browsers?: string[];
  };

  @Prop({ type: LicenseSettingsSchema, default: () => ({}) })
  licenseSettings: LicenseSettings;

  @Prop({ type: [DistributionChannelSchema], default: [] })
  distributionChannels: DistributionChannel[];

  @Prop({ type: Types.ObjectId, ref: 'LicensePlan', default: null })
  defaultLicensePlanId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LicensePlan', default: null })
  envatoLicensePlanId?: Types.ObjectId;

  @Prop({ type: Object, default: null })
  licenseSettingsOverrides?: Record<string, any>;

  @Prop({
    type: String,
    enum: Object.values(IntegrationStatus),
    default: IntegrationStatus.NOT_INTEGRATED,
  })
  integrationStatus: IntegrationStatus;

  @Prop({ type: Object, default: null })
  integrationMetadata?: Record<string, any>;

  @Prop({ type: EmergencyKillSwitchSchema, default: () => ({}) })
  emergencyKillSwitch: EmergencyKillSwitch;

  @Prop({ type: Boolean, default: false })
  isArchived: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ status: 1 });
ProductSchema.index({ productType: 1 });
ProductSchema.index({ marketplaceSource: 1 });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ 'distributionChannels.externalItemId': 1 });
