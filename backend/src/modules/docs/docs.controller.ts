import { Controller, Get } from '@nestjs/common';

@Controller('public/docs')
export class DocsController {
  @Get('spec')
  getApiSpec() {
    return {
      version: 'v1',
      title: 'LicenseNest API',
      description:
        'Software licensing, activation, validation, and distribution API for WordPress, PHP, and Next.js products.',
      baseUrl: '/api/v1',
      authentication: {
        type: 'header',
        headers: ['X-Client-ID', 'X-API-Key'],
        description:
          'All public SDK endpoints require product client credentials sent as HTTP headers. Credentials are generated per product in the Admin Panel.',
      },
      rateLimits: {
        requestsPerMinute: 60,
        headers: [
          'X-RateLimit-Limit',
          'X-RateLimit-Remaining',
          'X-RateLimit-Reset',
          'Retry-After',
        ],
      },
      endpoints: [
        {
          method: 'POST',
          path: '/api/v1/public/licenses/activate',
          summary: 'Activate a license key on a new domain/installation',
          scopes: ['activate'],
          requestBody: {
            productSlug: { type: 'string', required: true },
            licenseKey: { type: 'string', required: false, description: 'Required if purchaseCode is not provided' },
            purchaseCode: { type: 'string', required: false, description: 'Alternative to licenseKey for Envato purchases' },
            installationId: { type: 'string', required: true },
            domain: { type: 'string', required: true },
            installationUrl: { type: 'string', required: false },
            environment: { type: 'enum', values: ['production', 'staging', 'localhost'], required: false },
            productVersion: { type: 'string', required: false },
            serverFingerprint: { type: 'string', required: false },
          },
        },
        {
          method: 'POST',
          path: '/api/v1/public/licenses/validate',
          summary: 'Periodic heartbeat validation of an active installation',
          scopes: ['validate'],
          requestBody: {
            productSlug: { type: 'string', required: true },
            installationId: { type: 'string', required: true },
            token: { type: 'string', required: true, description: 'Activation token from activation response' },
            domain: { type: 'string', required: true },
            productVersion: { type: 'string', required: false },
          },
        },
        {
          method: 'POST',
          path: '/api/v1/public/licenses/deactivate',
          summary: 'Deactivate an installation, freeing up the activation slot',
          scopes: ['activate'],
          requestBody: {
            installationId: { type: 'string', required: true },
            token: { type: 'string', required: false },
            licenseKey: { type: 'string', required: false },
            domain: { type: 'string', required: false },
            reason: { type: 'string', required: false },
          },
        },
        {
          method: 'GET',
          path: '/api/v1/public/products/:slug/updates',
          summary: 'Check if a newer version of the product is available',
          scopes: ['update'],
          queryParams: {
            currentVersion: { type: 'string', required: true },
            token: { type: 'string', required: true },
            domain: { type: 'string', required: true },
          },
        },
        {
          method: 'GET',
          path: '/api/v1/public/downloads/:token',
          summary: 'Stream download a package file using a temporary signed download token',
          scopes: ['download'],
          description: 'Returns binary ZIP file stream',
        },
      ],
      errorCodes: [
        { code: 'UNAUTHORIZED', httpStatus: 401, description: 'Missing or invalid client credentials' },
        { code: 'FORBIDDEN', httpStatus: 403, description: 'Valid credentials but insufficient scope' },
        { code: 'PRODUCT_NOT_FOUND', httpStatus: 404, description: 'Product slug does not exist' },
        { code: 'LICENSE_NOT_FOUND', httpStatus: 404, description: 'License key does not exist' },
        { code: 'LICENSE_EXPIRED', httpStatus: 400, description: 'License term has expired' },
        { code: 'LICENSE_SUSPENDED', httpStatus: 400, description: 'License suspended by admin' },
        { code: 'LICENSE_REVOKED', httpStatus: 400, description: 'License permanently revoked' },
        { code: 'LICENSE_BLOCKED', httpStatus: 403, description: 'License blocked by security policy' },
        { code: 'ACTIVATION_LIMIT_REACHED', httpStatus: 400, description: 'Max activation slots exhausted' },
        { code: 'ACTIVATION_NOT_FOUND', httpStatus: 404, description: 'No active activation found' },
        { code: 'DOMAIN_MISMATCH', httpStatus: 400, description: 'Domain/environment not allowed' },
        { code: 'TOKEN_INVALID', httpStatus: 401, description: 'Activation token is invalid' },
        { code: 'TOKEN_EXPIRED', httpStatus: 401, description: 'Activation token has expired' },
        { code: 'BLOCKED', httpStatus: 403, description: 'IP, domain, or license blocked' },
        { code: 'RATE_LIMITED', httpStatus: 429, description: 'Too many requests' },
        { code: 'INTERNAL_ERROR', httpStatus: 500, description: 'Server-side error' },
      ],
      sdkTypes: [
        { type: 'wordpress-plugin', language: 'PHP', sdkClass: 'LicenseNest_Plugin' },
        { type: 'wordpress-theme', language: 'PHP', sdkClass: 'LicenseNest_Theme' },
        { type: 'php-script', language: 'PHP', sdkClass: 'LicenseNest_PHP' },
        { type: 'nextjs-app', language: 'TypeScript', sdkClass: 'LicenseNestNextApp' },
        { type: 'nextjs-plugin', language: 'TypeScript', sdkClass: 'LicenseNestPlugin' },
      ],
    };
  }
}
