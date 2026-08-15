import { EnvironmentType } from '../enums/app.enums';

export class DomainNormalizer {
  /**
   * Normalizes a raw URL or domain string into a clean hostname/domain.
   * e.g., "https://www.Example.com:8080/path?query=1" -> "example.com:8080"
   */
  static normalize(input: string): string {
    if (!input) return '';

    let cleaned = input.trim().toLowerCase();

    // If no protocol is provided, prepend http:// to parse with URL safely
    if (!/^https?:\/\//i.test(cleaned)) {
      cleaned = `http://${cleaned}`;
    }

    try {
      const parsed = new URL(cleaned);
      let hostname = parsed.hostname.toLowerCase();

      // Remove www.
      if (hostname.startsWith('www.')) {
        hostname = hostname.slice(4);
      }

      // Include non-standard port if present
      if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
        return `${hostname}:${parsed.port}`;
      }

      return hostname;
    } catch {
      // Fallback regex cleanup if URL parser fails
      return cleaned
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/.*$/, '')
        .trim();
    }
  }

  /**
   * Detects whether a domain is running on localhost, staging, test, or production.
   */
  static detectEnvironment(domainOrUrl: string): EnvironmentType {
    const normalized = this.normalize(domainOrUrl);
    const hostWithoutPort = normalized.split(':')[0];

    // Localhost patterns
    if (
      hostWithoutPort === 'localhost' ||
      hostWithoutPort === '127.0.0.1' ||
      hostWithoutPort === '::1' ||
      hostWithoutPort.endsWith('.local') ||
      hostWithoutPort.endsWith('.test') ||
      hostWithoutPort.endsWith('.dev') ||
      hostWithoutPort.endsWith('.example') ||
      hostWithoutPort.endsWith('.invalid')
    ) {
      return EnvironmentType.LOCALHOST;
    }

    // Staging patterns
    if (
      hostWithoutPort.includes('staging') ||
      hostWithoutPort.includes('stage.') ||
      hostWithoutPort.includes('dev.') ||
      hostWithoutPort.includes('test.') ||
      hostWithoutPort.includes('qa.') ||
      hostWithoutPort.includes('preview.') ||
      hostWithoutPort.includes('.vercel.app') ||
      hostWithoutPort.includes('.netlify.app') ||
      hostWithoutPort.includes('.ngrok.io') ||
      hostWithoutPort.includes('.ngrok-free.app') ||
      hostWithoutPort.includes('.loca.lt')
    ) {
      return EnvironmentType.STAGING;
    }

    return EnvironmentType.PRODUCTION;
  }
}
