/**
 * Resolve the caller IP for security decisions (rate limiting, blocklists,
 * audit logs).
 *
 * Relies on express `trust proxy` being configured (see main.ts): req.ip then
 * derives from the exact number of trusted proxy hops and ignores spoofed
 * values a client appends to X-Forwarded-For. Never read X-Forwarded-For
 * directly for security decisions — it is client-controlled.
 */
interface IpCapableRequest {
  ip?: string;
  socket?: { remoteAddress?: string };
  connection?: { remoteAddress?: string };
}

export function getClientIp(request: IpCapableRequest | undefined): string {
  return (
    request?.ip ||
    request?.socket?.remoteAddress ||
    request?.connection?.remoteAddress ||
    ''
  );
}
