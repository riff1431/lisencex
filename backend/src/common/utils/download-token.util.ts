import * as crypto from 'crypto';
import { resolveActivationSecret } from './security.util';

/**
 * Signed, expiring download tokens for package/version files.
 *
 * These used to be plain base64url JSON with no signature — anyone who knew
 * a productId/versionId could forge one with a far-future expiry and stream
 * paid packages. Tokens are now HMAC-SHA256 signed (`<body>.<sig>`), so they
 * can only be minted by this process.
 */
function getDownloadTokenSecret(): string {
  return (
    process.env.DOWNLOAD_TOKEN_SECRET ||
    resolveActivationSecret(process.env.ACTIVATION_SECRET)
  );
}

export function signDownloadToken(payload: Record<string, any>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getDownloadTokenSecret())
    .update(body)
    .digest('base64url');
  return `${body}.${signature}`;
}

export function verifyDownloadToken(token: string): Record<string, any> | null {
  try {
    const dotIndex = token.indexOf('.');
    if (dotIndex <= 0 || dotIndex === token.length - 1) return null;
    const body = token.slice(0, dotIndex);
    const signature = token.slice(dotIndex + 1);

    const expected = crypto
      .createHmac('sha256', getDownloadTokenSecret())
      .update(body)
      .digest('base64url');
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
