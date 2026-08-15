import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  User,
  UserSchema,
  Product,
  ProductSchema,
  ProductVersion,
  ProductVersionSchema,
  Purchase,
  PurchaseSchema,
  License,
  LicenseSchema,
  Installation,
  InstallationSchema,
  Activation,
  ActivationSchema,
  ActivationToken,
  ActivationTokenSchema,
  ValidationLog,
  ValidationLogSchema,
  AuditLog,
  AuditLogSchema,
  BlockedEntity,
  BlockedEntitySchema,
  Settings,
  SettingsSchema,
  DownloadLog,
  DownloadLogSchema,
  LicensePlan,
  LicensePlanSchema,
  ProductCredential,
  ProductCredentialSchema,
} from './schemas';

const models = [
  { name: User.name, schema: UserSchema },
  { name: Product.name, schema: ProductSchema },
  { name: ProductVersion.name, schema: ProductVersionSchema },
  { name: Purchase.name, schema: PurchaseSchema },
  { name: License.name, schema: LicenseSchema },
  { name: Installation.name, schema: InstallationSchema },
  { name: Activation.name, schema: ActivationSchema },
  { name: ActivationToken.name, schema: ActivationTokenSchema },
  { name: ValidationLog.name, schema: ValidationLogSchema },
  { name: AuditLog.name, schema: AuditLogSchema },
  { name: BlockedEntity.name, schema: BlockedEntitySchema },
  { name: Settings.name, schema: SettingsSchema },
  { name: DownloadLog.name, schema: DownloadLogSchema },
  { name: LicensePlan.name, schema: LicensePlanSchema },
  { name: ProductCredential.name, schema: ProductCredentialSchema },
];

@Global()
@Module({
  imports: [MongooseModule.forFeature(models)],
  exports: [MongooseModule.forFeature(models)],
})
export class DatabaseModule {}
