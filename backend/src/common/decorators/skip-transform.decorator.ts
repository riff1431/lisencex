import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as bypassing the global TransformInterceptor. Use on
 * endpoints that write the raw HTTP response themselves (file streams,
 * redirects) — wrapping those in the JSON/HTML envelope throws
 * ERR_HTTP_HEADERS_SENT after the controller has already sent headers.
 */
export const SKIP_TRANSFORM_KEY = 'skipTransform';
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
