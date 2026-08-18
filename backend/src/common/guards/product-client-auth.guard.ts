import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ProductCredential,
  ProductCredentialDocument,
} from '../../database/schemas/product-credential.schema';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import { getClientIp } from '../utils/client-ip.util';

@Injectable()
export class ProductClientAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(ProductCredential.name)
    private credentialModel: Model<ProductCredentialDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Credentials come from headers only. Query strings leak secrets into
    // proxy/access logs and browser history; every shipped SDK sends headers.
    const clientId = request.headers['x-client-id'];
    const apiKey = request.headers['x-api-key'];

    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      'scopes',
      [context.getHandler(), context.getClass()],
    );

    const ip = getClientIp(request);
    const userAgent = request.headers['user-agent'] || '';

    if (!clientId || !apiKey) {
      await this.logFailure(
        'MISSING_CREDENTIALS',
        clientId || 'unknown',
        ip,
        userAgent,
        'Client ID or API Key is missing in headers/query',
      );
      throw new UnauthorizedException(
        'Product client credentials (X-Client-ID and X-API-Key headers) are required',
      );
    }

    const credential = await this.credentialModel.findOne({
      clientId: clientId.trim(),
      apiKey: apiKey.trim(),
    });

    if (!credential) {
      await this.logFailure(
        'INVALID_CREDENTIALS',
        clientId,
        ip,
        userAgent,
        'Invalid Client ID or API Key pair',
      );
      throw new UnauthorizedException('Invalid product client credentials');
    }

    if (credential.status === 'disabled') {
      await this.logFailure(
        'DISABLED_CREDENTIALS',
        clientId,
        ip,
        userAgent,
        `The credentials for Client ID ${clientId} are disabled`,
      );
      throw new ForbiddenException(
        'Product API credentials have been disabled',
      );
    }

    if (
      credential.status === 'rotated' &&
      credential.expiresAt &&
      new Date(credential.expiresAt) < new Date()
    ) {
      await this.logFailure(
        'EXPIRED_ROTATED_CREDENTIALS',
        clientId,
        ip,
        userAgent,
        `The rotated credential has expired for Client ID ${clientId}`,
      );
      throw new ForbiddenException(
        'Product API credentials have expired (grace period elapsed)',
      );
    }

    // Verify scopes if defined
    if (requiredScopes && requiredScopes.length > 0) {
      const hasScope = requiredScopes.every((scope) =>
        credential.scopes.includes(scope),
      );
      if (!hasScope) {
        await this.logFailure(
          'INSUFFICIENT_SCOPES',
          clientId,
          ip,
          userAgent,
          `Credential lacks required scopes: ${requiredScopes.join(', ')}. Had: ${credential.scopes.join(', ')}`,
        );
        throw new ForbiddenException('Insufficient scopes for this operation');
      }
    }

    const product = await this.productModel.findById(credential.productId);
    if (!product || product.isArchived) {
      await this.logFailure(
        'PRODUCT_NOT_FOUND',
        clientId,
        ip,
        userAgent,
        `Product linked to Client ID ${clientId} not found or archived`,
      );
      throw new UnauthorizedException(
        'Associated product not found or archived',
      );
    }

    // Attach verified product and credentials to request
    request.product = product;
    request.credential = credential;

    return true;
  }

  private async logFailure(
    reasonCode: string,
    clientId: string,
    ip: string,
    userAgent: string,
    reasonDetail: string,
  ) {
    try {
      await this.auditLogModel.create({
        actorEmail: 'client-api-authenticator',
        action: 'CLIENT_AUTH_FAILED',
        targetType: 'security',
        targetId: clientId,
        before: { clientId, ip, userAgent },
        after: { reasonCode, reasonDetail },
      });
    } catch (e) {
      // Don't block request if audit log failed
      console.error('Failed to log CLIENT_AUTH_FAILED audit record', e);
    }
  }
}
