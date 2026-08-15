export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  CUSTOMER = 'customer',
}

export enum ProductType {
  WORDPRESS_PLUGIN = 'wordpress_plugin',
  WORDPRESS_THEME = 'wordpress_theme',
  PHP_SCRIPT = 'php_script',
  NEXTJS_APP = 'nextjs_app',
  NEXTJS_THEME = 'nextjs_theme',
  NEXTJS_PLUGIN = 'nextjs_plugin',
  SAAS = 'saas',
  API = 'api',
  OTHER = 'other',
}

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived',
}

export enum MarketplaceProviderType {
  INTERNAL = 'internal',
  ENVATO = 'envato',
  MANUAL = 'manual',
  RESELLER = 'reseller',
  BULK = 'bulk',
  CUSTOM = 'custom',
}

export enum EnvatoMarket {
  CODECANYON = 'codecanyon',
  THEMEFOREST = 'themeforest',
}

export enum LicenseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
  BLOCKED = 'blocked',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
}

export enum LicenseType {
  SINGLE_SITE = 'single_site',
  MULTI_SITE = 'multi_site',
  UNLIMITED = 'unlimited',
  REGULAR = 'regular',
  EXTENDED = 'extended',
  DEVELOPER = 'developer',
  AGENCY = 'agency',
  LIFETIME = 'lifetime',
  SUBSCRIPTION = 'subscription',
  TRIAL = 'trial',
  CUSTOM = 'custom',
}

export enum ActivationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEACTIVATED = 'deactivated',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  BLOCKED = 'blocked',
}

export enum EnvironmentType {
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'development',
  LOCALHOST = 'localhost',
  TEST = 'test',
  UNKNOWN = 'unknown',
}

export enum ReleaseChannel {
  STABLE = 'stable',
  BETA = 'beta',
  ALPHA = 'alpha',
  DEV = 'dev',
}

export enum BlockedEntityType {
  IP = 'ip',
  DOMAIN = 'domain',
  LICENSE = 'license',
  USER = 'user',
  INSTALLATION = 'installation',
}

export enum NotificationType {
  // Customer events
  LICENSE_ACTIVATED = 'license_activated',
  LICENSE_DEACTIVATED = 'license_deactivated',
  LICENSE_EXPIRING_SOON = 'license_expiring_soon',
  LICENSE_EXPIRED = 'license_expired',
  LICENSE_RENEWED = 'license_renewed',
  SUPPORT_EXPIRING_SOON = 'support_expiring_soon',
  SUPPORT_EXPIRED = 'support_expired',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  PRODUCT_UPDATE_AVAILABLE = 'product_update_available',

  // Admin events
  ACTIVATION_FAILED = 'activation_failed',
  INVALID_KEY_ATTEMPT = 'invalid_key_attempt',
  ACTIVATION_LIMIT_REACHED = 'activation_limit_reached',
  ENTITY_BLOCKED = 'entity_blocked',
  SUSPICIOUS_LICENSE = 'suspicious_license',
  ENVATO_CLAIM_FAILED = 'envato_claim_failed',
  SECURITY_ALERT = 'security_alert',
  SYSTEM_ALERT = 'system_alert',
}

export enum NotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
}

export enum NotificationRecipientType {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
}

export enum IntegrationStatus {
  NOT_INTEGRATED = 'not_integrated',
  INTEGRATED = 'integrated',
  TESTING = 'testing',
  VERIFIED = 'verified',
  PRODUCTION_READY = 'production_ready',
}
