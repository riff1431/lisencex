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
  iconUrl?: string;

  @Prop({ type: String, default: null })
  logoUrl?: string;

  @Prop({ type: String, default: null })
  bannerUrl?: string;

  @Prop({ type: String, default: null })
  packageFileUrl?: string;

  @Prop({ type: String, default: '1.0.0' })
  currentVersion: string;

  @Prop({ type: String, default: '1.0.0' })
  latestStableVersion: string;

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

  @Prop({ type: Boolean, default: false })
  isArchived: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ status: 1 });
ProductSchema.index({ productType: 1 });
ProductSchema.index({ marketplaceSource: 1 });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ 'distributionChannels.externalItemId': 1 });
