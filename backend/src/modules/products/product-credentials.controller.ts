import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { ProductCredential, ProductCredentialDocument } from '../../database/schemas/product-credential.schema';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { CreateProductCredentialDto } from './dto/product-credential.dto';

@Controller('admin/products/:productId/credentials')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ProductCredentialsController {
  constructor(
    @InjectModel(ProductCredential.name)
    private credentialModel: Model<ProductCredentialDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  @Get()
  async getCredentials(@Param('productId') productId: string) {
    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    return this.credentialModel.find({ productId: new Types.ObjectId(productId) }).sort({ createdAt: -1 });
  }

  @Post()
  async createCredential(
    @Param('productId') productId: string,
    @Body() dto: CreateProductCredentialDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    const clientId = 'client_' + crypto.randomBytes(12).toString('hex');
    const apiKey = 'pk_live_' + crypto.randomBytes(24).toString('hex');

    const credential = await this.credentialModel.create({
      productId: product._id,
      clientId,
      apiKey,
      name: dto.name,
      scopes: dto.scopes || ['activate', 'validate', 'update', 'download'],
      status: 'active',
    });

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'PRODUCT_CREDENTIAL_CREATED',
      targetType: 'product',
      targetId: productId,
      after: {
        credentialId: credential._id.toString(),
        name: credential.name,
        clientId: credential.clientId,
        scopes: credential.scopes,
      },
    });

    return credential;
  }

  @Post(':id/rotate')
  async rotateCredential(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    const oldCred = await this.credentialModel.findOne({
      _id: new Types.ObjectId(id),
      productId: product._id,
    });

    if (!oldCred) throw new NotFoundException('Credential not found');
    if (oldCred.status === 'disabled') {
      throw new BadRequestException('Cannot rotate a disabled API credential. Enable it first.');
    }

    // Update old credential as rotated with 30-day grace period
    const previousStatus = oldCred.status;
    oldCred.status = 'rotated';
    oldCred.rotatedAt = new Date();
    oldCred.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await oldCred.save();

    // Create a new key
    const newClientId = 'client_' + crypto.randomBytes(12).toString('hex');
    const newApiKey = 'pk_live_' + crypto.randomBytes(24).toString('hex');

    const newCred = await this.credentialModel.create({
      productId: product._id,
      clientId: newClientId,
      apiKey: newApiKey,
      name: oldCred.name + ' (Rotated)',
      scopes: oldCred.scopes,
      status: 'active',
    });

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'PRODUCT_CREDENTIAL_ROTATED',
      targetType: 'product',
      targetId: productId,
      before: {
        credentialId: oldCred._id.toString(),
        status: previousStatus,
        expiresAt: oldCred.expiresAt,
      },
      after: {
        newCredentialId: newCred._id.toString(),
        name: newCred.name,
        clientId: newCred.clientId,
      },
    });

    return {
      rotated: oldCred,
      created: newCred,
    };
  }

  @Post(':id/toggle')
  async toggleCredential(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    const cred = await this.credentialModel.findOne({
      _id: new Types.ObjectId(id),
      productId: product._id,
    });

    if (!cred) throw new NotFoundException('Credential not found');

    const previousStatus = cred.status;
    cred.status = cred.status === 'disabled' ? 'active' : 'disabled';
    if (cred.status === 'active') {
      cred.expiresAt = undefined;
      cred.rotatedAt = undefined;
    }
    await cred.save();

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: cred.status === 'disabled' ? 'PRODUCT_CREDENTIAL_DISABLED' : 'PRODUCT_CREDENTIAL_ENABLED',
      targetType: 'product',
      targetId: productId,
      before: { credentialId: cred._id.toString(), status: previousStatus },
      after: { credentialId: cred._id.toString(), status: cred.status },
    });

    return cred;
  }

  @Delete(':id')
  async deleteCredential(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    const cred = await this.credentialModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      productId: product._id,
    });

    if (!cred) throw new NotFoundException('Credential not found');

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'PRODUCT_CREDENTIAL_DELETED',
      targetType: 'product',
      targetId: productId,
      before: {
        credentialId: cred._id.toString(),
        name: cred.name,
        clientId: cred.clientId,
      },
    });

    return { success: true };
  }
}
