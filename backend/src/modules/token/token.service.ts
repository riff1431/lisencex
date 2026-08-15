import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

export interface ActivationTokenPayload {
  tokenId: string;
  activationId: string;
  installationId: string;
  licenseId: string;
  productId: string;
  productSlug: string;
  domain: string;
  environment: string;
  issuedAt: number;
  expiresAt: number;
}

@Injectable()
export class TokenService {
  private secret: string;

  constructor(private configService: ConfigService) {
    this.secret =
      this.configService.get<string>('ACTIVATION_SECRET') ||
      'activation_signing_secret_hmac_2026_license_hub_token_sign';
  }

  /**
   * Generates a signed activation token
   */
  signActivationToken(payload: Omit<ActivationTokenPayload, 'tokenId' | 'issuedAt' | 'expiresAt'>, validityDays = 30): { token: string; tokenId: string; expiresAt: Date } {
    const tokenId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + validityDays * 24 * 60 * 60;

    const fullPayload: ActivationTokenPayload = {
      ...payload,
      tokenId,
      issuedAt: now,
      expiresAt: exp,
    };

    const token = jwt.sign(fullPayload, this.secret, {
      algorithm: 'HS256',
    });

    return {
      token,
      tokenId,
      expiresAt: new Date(exp * 1000),
    };
  }

  /**
   * Verifies the activation token signature and expiration
   */
  verifyActivationToken(token: string): ActivationTokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      }) as ActivationTokenPayload;
      return decoded;
    } catch (error: any) {
      throw new UnauthorizedException(
        `Invalid or expired activation token: ${error.message}`,
      );
    }
  }

  /**
   * Generates SHA-256 hash for secure token storage
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
