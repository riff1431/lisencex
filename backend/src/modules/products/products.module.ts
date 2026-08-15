import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductCredentialsController } from './product-credentials.controller';
import { ProductsIntegrationController } from './products-integration.controller';
import { ProductsIntegrationService } from './products-integration.service';
import { ProductsWizardController } from './products-wizard.controller';
import { ProductsPackageGeneratorController } from './products-package-generator.controller';
import { ProductsPackageGeneratorService } from './products-package-generator.service';
import { ProductsVerificationController } from './products-verification.controller';
import { ProductsVerificationService } from './products-verification.service';

@Module({
  controllers: [
    ProductsController,
    ProductCredentialsController,
    ProductsIntegrationController,
    ProductsWizardController,
    ProductsPackageGeneratorController,
    ProductsVerificationController,
  ],
  providers: [
    ProductsService,
    ProductsIntegrationService,
    ProductsPackageGeneratorService,
    ProductsVerificationService,
  ],
  exports: [
    ProductsService,
    ProductsIntegrationService,
    ProductsPackageGeneratorService,
    ProductsVerificationService,
  ],
})
export class ProductsModule {}
