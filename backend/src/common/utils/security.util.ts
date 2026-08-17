import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Secrets that were previously committed to the repository as fallback
 * defaults. If a deployment still uses one of these, it must be treated as
 * public knowledge (anyone with repo access knows it).
 */
export const LEAKED_JWT_SECRET = 'super_secret_jwt_license_key_2026_secure_auth';
export const LEAKED_ACTIVATION_SECRET =
  'activation_signing_secret_hmac_2026_license_hub_token_sign';

const DEV_FALLBACK_JWT_SECRET = 'dev_only_insecure_jwt_secret_do_not_use_in_production';
const DEV_FALLBACK_ACTIVATION_SECRET = 'dev_only_insecure_activation_secret';

// Ephemeral secrets must be generated exactly ONCE per process: the JWT
// signing module and the passport verify strategy both resolve the secret
// independently, and two different randoms would invalidate every token.
let cachedEphemeralJwtSecret: string | null = null;
let cachedEphemeralActivationSecret: string | null = null;

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Resolve the JWT signing secret.
 *
 * - env value that is not the leaked default -> used as-is
 * - missing, or still the leaked default:
 *   - production -> random per-boot secret + loud error (sessions reset each
 *     boot until a real secret is set; fail-closed beats forgeable tokens)
 *   - development -> fixed dev-only fallback
 */
export function resolveJwtSecret(configValue: string | undefined): string {
  if (configValue && configValue !== LEAKED_JWT_SECRET) {
    return configValue;
  }

  if (isProduction()) {
    if (!cachedEphemeralJwtSecret) {
      new Logger('Security').error(
        'JWT_SECRET is missing or still equals the leaked default from the repository. ' +
          'Falling back to a random per-boot secret — all user sessions will be invalidated on every restart. ' +
          'Set a strong JWT_SECRET environment variable immediately.',
      );
      cachedEphemeralJwtSecret = crypto.randomBytes(48).toString('hex');
    }
    return cachedEphemeralJwtSecret;
  }

  return DEV_FALLBACK_JWT_SECRET;
}

/**
 * Resolve the activation-token signing secret (same policy as JWT).
 */
export function resolveActivationSecret(configValue: string | undefined): string {
  if (configValue && configValue !== LEAKED_ACTIVATION_SECRET) {
    return configValue;
  }

  if (isProduction()) {
    if (!cachedEphemeralActivationSecret) {
      new Logger('Security').error(
        'ACTIVATION_SECRET is missing or still equals the leaked default from the repository. ' +
          'Falling back to a random per-boot secret — previously issued activation tokens will be rejected. ' +
          'Set a strong ACTIVATION_SECRET environment variable immediately.',
      );
      cachedEphemeralActivationSecret = crypto.randomBytes(48).toString('hex');
    }
    return cachedEphemeralActivationSecret;
  }

  return DEV_FALLBACK_ACTIVATION_SECRET;
}

/**
 * Timing-safe string comparison (both values must be non-empty and of equal
 * length to be considered a match).
 */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
