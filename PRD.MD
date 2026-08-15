# MASTER PRODUCT REQUIREMENTS DOCUMENT (PRD)

## License Key, Purchase Verification & Activation Management Ecosystem

### Project Type

Enterprise-grade License Management, Purchase Verification, Activation, Update, and Distribution System.

### Existing Technology Stack

* **Frontend:** Next.js
* **Backend:** NestJS
* **Database:** MongoDB
* **Architecture:** REST API-first modular architecture
* **Primary Purpose:** Validate purchases, issue licenses, activate products on customer websites/apps, manage installation limits, and continuously validate license status.

---

# 1. PRODUCT VISION

Build a centralized **License Key & Activation Management Ecosystem** that manages licenses for all digital products distributed by our company.

The system must support products sold through:

1. Our own marketplace
2. Envato CodeCanyon
3. Envato ThemeForest
4. Manual/admin-issued licenses
5. Future third-party marketplaces

The platform must support licensing for:

* WordPress Plugins
* WordPress Themes
* PHP Scripts
* Next.js Applications
* Next.js Themes
* Next.js Plugins
* SaaS Applications
* API Products
* Other downloadable digital products

The License Manager must act as the central source of truth for:

* Products
* Purchases
* Customers
* License keys
* Activation keys/tokens
* Installations
* Domains
* Activation limits
* License expiration
* Support expiration
* Product updates
* Downloads
* Marketplace verification
* Security
* License validation
* Audit logs
* Abuse detection

---

# 2. IMPORTANT ARCHITECTURAL PRINCIPLE

Do NOT implement this as a simple:

`Product → Activation Key`

system.

Use the following lifecycle:

```text
PRODUCT
   ↓
PURCHASE
   ↓
LICENSE
   ↓
INSTALLATION
   ↓
ACTIVATION
   ↓
SIGNED ACTIVATION TOKEN
   ↓
PERIODIC VALIDATION
```

A **Purchase Key** proves that a customer owns a product.

A **License** represents the customer's legal/technical entitlement to use the product.

An **Activation** represents one installation/domain/device using that license.

An **Activation Token** authorizes that installation to run the software.

These concepts must remain separate in both application architecture and database architecture.

---

# 3. BUSINESS GOALS

The system must allow us to:

* Sell products through our own marketplace.
* Sell the same products through Envato.
* Validate Envato purchase codes.
* Generate internal purchase/license keys.
* Convert purchases into licenses.
* Allow customers to activate licensed products.
* Limit the number of allowed installations.
* Bind licenses to domains/installations.
* Support staging/local environments.
* Allow license deactivation.
* Block unauthorized usage.
* Disable pirated/abused licenses.
* Monitor where products are installed.
* Push secure product updates.
* Restrict downloads to valid customers.
* Manage licenses centrally.
* Support future marketplaces without rewriting the licensing system.

---

# 4. USER ROLES

Implement role-based access control.

## 4.1 Super Admin

Full system access.

Capabilities:

* Manage admins
* Manage products
* Manage licenses
* Manage purchases
* Manage activations
* Manage users
* Manage marketplaces
* Manage security
* Configure global settings
* Configure API settings
* Configure product updates
* View audit logs
* Revoke licenses
* Manually activate/deactivate products

---

## 4.2 Admin

Admin permissions based on RBAC.

Possible access:

* Products
* Purchases
* Licenses
* Activations
* Customers
* Updates
* Downloads
* Reports

Sensitive settings can remain Super Admin only.

---

## 4.3 Customer

Customers should have their own dashboard.

Capabilities:

* View purchased products
* View licenses
* View license status
* View license expiration
* View activation count
* View activated domains
* Deactivate installations
* Download purchased products
* Download updates
* Verify/import Envato purchases
* View support status
* Regenerate appropriate credentials where permitted

---

## 4.4 API Client

Installed products communicate with the backend using secure API endpoints.

Examples:

* WordPress Plugin
* WordPress Theme
* PHP Script
* Next.js Application

API clients must never receive administrative privileges.

---

# 5. PRODUCT MANAGEMENT

Create a complete Product Management module.

## Product fields

Each product should contain:

```text
Product ID
Name
Slug
Description
Short Description
Product Type
Product Status
Product Logo/Icon
Product Banner
Current Version
Latest Stable Version
License Enabled
Automatic Updates Enabled
Downloads Enabled
Created At
Updated At
```

---

# 6. PRODUCT TYPES

Support:

```text
wordpress_plugin
wordpress_theme
php_script
nextjs_app
nextjs_theme
nextjs_plugin
saas
api
other
```

Do not hard-code license behavior specifically for WordPress.

Architecture should remain product-type agnostic wherever possible.

---

# 7. DISTRIBUTION CHANNELS

Each product can be sold through multiple marketplaces simultaneously.

Example:

```json
{
  "distributionChannels": [
    {
      "provider": "internal",
      "enabled": true
    },
    {
      "provider": "envato",
      "enabled": true,
      "externalItemId": "12345678",
      "market": "codecanyon"
    }
  ]
}
```

Possible providers:

```text
internal
envato
manual
future_marketplace
```

Admin must be able to enable or disable providers per product.

---

# 8. ENVATO SUPPORT

Support:

* CodeCanyon
* ThemeForest

Each product may contain:

```text
Envato Enabled
Envato Market
Envato Item ID
Envato Product URL
Envato Verification Settings
```

The system should validate a customer's Envato purchase code against the appropriate Envato product.

Do not allow a purchase code belonging to Product A to activate Product B.

---

# 9. MARKETPLACE PROVIDER ARCHITECTURE

Implement marketplace integrations using provider abstraction.

Example architecture:

```text
MarketplaceProvider
       │
       ├── InternalMarketplaceProvider
       ├── EnvatoMarketplaceProvider
       └── FutureMarketplaceProvider
```

Define a common interface similar to:

```typescript
interface MarketplaceProvider {
  verifyPurchase(input: VerifyPurchaseInput): Promise<PurchaseVerificationResult>;
}
```

Common response:

```typescript
{
  valid: boolean;
  provider: string;
  externalPurchaseId?: string;
  externalProductId?: string;
  purchaser?: string;
  purchasedAt?: Date;
  licenseType?: string;
  supportUntil?: Date;
}
```

The licensing module must not directly depend on Envato-specific logic.

---

# 10. PURCHASE MANAGEMENT

Create a dedicated `purchases` collection/module.

Purchase represents proof that a customer acquired a product.

## Internal marketplace purchase

Example:

```json
{
  "source": "internal",
  "productId": "...",
  "userId": "...",
  "orderId": "...",
  "orderNumber": "ORD-10001",
  "purchaseKey": "PUR-XXXX-XXXX-XXXX",
  "status": "completed"
}
```

---

## Envato purchase

Example:

```json
{
  "source": "envato",
  "productId": "...",
  "externalPurchaseCode": "...",
  "externalItemId": "...",
  "buyerUsername": "...",
  "purchasedAt": "...",
  "licenseType": "regular",
  "supportExpiresAt": "...",
  "verificationStatus": "verified"
}
```

---

# 11. PURCHASE KEY SYSTEM

For internal purchases generate secure purchase keys.

Example format:

```text
PUR-XXXX-XXXX-XXXX-XXXX
```

Requirements:

* Cryptographically random
* Unique
* Indexed
* Never sequential
* Can be revoked
* Must be associated with product
* Must be associated with purchase
* Must not itself grant unlimited runtime access

Purchase key should be used for ownership validation, not ongoing product authentication.

---

# 12. LICENSE MANAGEMENT

Create a dedicated License object after a purchase is verified.

Example:

```json
{
  "licenseKey": "LIC-XXXX-XXXX-XXXX-XXXX",
  "productId": "...",
  "userId": "...",
  "purchaseId": "...",
  "licenseType": "regular",
  "status": "active",
  "activationLimit": 1,
  "currentActivationCount": 0,
  "expiresAt": null,
  "supportExpiresAt": "...",
  "issuedAt": "..."
}
```

---

# 13. LICENSE TYPES

System should allow flexible license plans.

Examples:

```text
single_site
multi_site
unlimited
regular
extended
developer
agency
lifetime
subscription
trial
custom
```

Do not hard-code plan behavior.

Store plan/license restrictions inside configuration.

---

# 14. LICENSE STATUS

Support:

```text
active
expired
suspended
revoked
blocked
pending
cancelled
```

---

# 15. PRODUCT LICENSE CONFIGURATION

Every product must have independent license settings.

Example:

```text
License Required: ON

License Duration:
- Lifetime
- 1 Year
- Subscription
- Custom

Activation Limit:
1

Domain Binding:
ON

Installation Binding:
ON

Allow Local Development:
ON

Allow Staging:
ON

Count Local Activation:
OFF

Count Staging Activation:
OFF

Allow Deactivation:
ON

Deactivation Cooldown:
0 days

Periodic Validation:
ON

Validation Interval:
24 hours

Offline Grace Period:
7 days

Automatic Updates:
ON
```

---

# 16. INSTALLATION MANAGEMENT

Every installation must receive its own persistent `installationId`.

Example:

```text
ins_A3F8J29XFK21
```

Do not identify an installation using domain alone.

Installation fields:

```text
installationId
licenseId
productId
userId
domain
normalizedDomain
installationUrl
environment
serverFingerprint
appVersion
productVersion
platform
createdAt
lastSeenAt
```

---

# 17. SUPPORTED ENVIRONMENTS

Support:

```text
production
staging
development
localhost
test
unknown
```

Admin should configure which environments count against activation limits.

---

# 18. DOMAIN NORMALIZATION

The backend must normalize domains before comparing them.

These should normally be treated as the same primary domain:

```text
https://example.com
http://example.com
https://www.example.com
example.com/
```

Normalization logic should:

* Remove protocol
* Normalize lowercase
* Remove trailing slash
* Optionally normalize `www`
* Handle ports correctly
* Properly support subdomains

Do not incorrectly treat:

```text
app.example.com
store.example.com
```

as the same installation unless configured.

---

# 19. LOCALHOST & DEVELOPMENT DOMAINS

Handle:

```text
localhost
127.0.0.1
::1
*.local
*.test
*.dev
```

These can optionally be excluded from activation counts.

Product-specific settings must determine behavior.

---

# 20. ACTIVATION MANAGEMENT

Create dedicated `activations` collection.

Example:

```json
{
  "activationId": "ACT-X72JS91K",
  "licenseId": "...",
  "productId": "...",
  "userId": "...",
  "installationId": "ins_...",
  "domain": "example.com",
  "normalizedDomain": "example.com",
  "installationUrl": "https://example.com",
  "environment": "production",
  "status": "active",
  "productVersion": "1.5.0",
  "activatedAt": "...",
  "lastValidatedAt": "...",
  "deactivatedAt": null
}
```

---

# 21. ACTIVATION STATUS

Support:

```text
active
inactive
deactivated
suspended
revoked
expired
blocked
```

Never permanently delete activation history.

---

# 22. ACTIVATION FLOW

A typical WordPress plugin activation should work as follows:

```text
Customer installs plugin
        ↓
Plugin shows activation screen
        ↓
Customer provides purchase/license credential
        ↓
Plugin generates installation ID
        ↓
Plugin calls License API
        ↓
Backend identifies product
        ↓
Backend validates purchase
        ↓
Backend validates license
        ↓
Backend checks activation limits
        ↓
Backend validates domain
        ↓
Backend creates activation
        ↓
Backend signs activation token
        ↓
Token returned
        ↓
Plugin securely stores token
        ↓
Product becomes activated
```

---

# 23. PUBLIC ACTIVATION API

Create versioned APIs.

Example:

```http
POST /api/v1/licenses/activate
```

Request:

```json
{
  "productSlug": "advanced-booking",
  "licenseKey": "LIC-...",
  "purchaseCode": "...",
  "installationId": "ins_...",
  "domain": "example.com",
  "installationUrl": "https://example.com",
  "environment": "production",
  "productVersion": "1.0.0"
}
```

Not every credential should be required simultaneously.

Determine the appropriate verification method based on product/provider.

---

# 24. ACTIVATION RESPONSE

Example:

```json
{
  "success": true,
  "status": "activated",
  "activation": {
    "activationId": "ACT-XXXX",
    "installationId": "ins_XXXX",
    "domain": "example.com"
  },
  "license": {
    "status": "active",
    "activationLimit": 1,
    "currentActivations": 1,
    "expiresAt": null,
    "supportExpiresAt": null
  },
  "token": "SIGNED_ACTIVATION_TOKEN"
}
```

Never expose unnecessary internal database information.

---

# 25. SIGNED ACTIVATION TOKENS

Do not rely on plain activation codes alone.

Issue a signed activation token.

Use an appropriate cryptographic signing mechanism.

Prefer asymmetric signing when appropriate so installed products can validate signatures without containing server signing secrets.

Token payload may contain:

```json
{
  "licenseId": "...",
  "activationId": "...",
  "installationId": "...",
  "productId": "...",
  "domain": "example.com",
  "licenseStatus": "active",
  "issuedAt": "...",
  "expiresAt": "..."
}
```

The private signing key must never be distributed inside products.

---

# 26. PERIODIC LICENSE VALIDATION

Products should periodically validate their activation.

Endpoint:

```http
POST /api/v1/licenses/validate
```

Possible responses:

```text
VALID
INVALID
EXPIRED
SUSPENDED
REVOKED
DOMAIN_MISMATCH
INSTALLATION_MISMATCH
PRODUCT_MISMATCH
ACTIVATION_LIMIT_REACHED
BLOCKED
```

---

# 27. VALIDATION CACHING

Do not require remote API validation on every page request.

Products should cache validation locally.

Example defaults:

```text
Validation Interval: 24 hours
Offline Grace Period: 7 days
```

The values must be configurable per product.

---

# 28. OFFLINE GRACE PERIOD

If the License API temporarily becomes unavailable:

```text
Last successful validation
        ↓
Offline grace period
        ↓
Product continues functioning temporarily
```

Once the grace period expires, product-specific policy determines behavior.

---

# 29. LICENSE DEACTIVATION

Endpoint:

```http
POST /api/v1/licenses/deactivate
```

Deactivation must:

* Verify installation
* Mark activation inactive/deactivated
* Free appropriate activation slot
* Record timestamp
* Record reason
* Preserve historical record
* Create audit event

---

# 30. CUSTOMER SELF-DEACTIVATION

Customer dashboard should allow:

```text
License:
LIC-XXXX

Activations:
example.com
store.example.com

[Deactivate]
```

Product/admin settings may determine whether self-deactivation is allowed.

---

# 31. ACTIVATION TRANSFER

Allow an administrator to transfer a license from one installation to another.

Do not edit history destructively.

Use events:

```text
Old activation → deactivated

New activation → created
```

---

# 32. ADMIN MANUAL LICENSE CREATION

Admin must be able to create a license manually.

Fields:

```text
Customer
Product
License Type
Activation Limit
Expiration
Support Expiration
Notes
Marketplace Source
```

---

# 33. LICENSE ACTIONS

Admin should be able to:

* Activate
* Suspend
* Revoke
* Restore
* Expire
* Extend
* Change activation limit
* Change expiration
* Extend support
* Reset activations
* Transfer installation
* Add notes
* Block domain
* Block IP
* Disable updates
* Disable downloads

Every sensitive action must create an audit log.

---

# 34. ADMIN PRODUCT MANAGEMENT UI

Create:

### Products List

Columns:

```text
Product
Type
Version
Marketplaces
License Status
Total Licenses
Active Installations
Status
Updated At
Actions
```

Actions:

```text
View
Edit
Versions
Licenses
Activations
Downloads
Security
Delete/Archive
```

---

# 35. ADMIN PRODUCT DETAIL

Tabs:

```text
Overview
Licensing
Distribution
Versions
Downloads
Licenses
Activations
Customers
Security
API
Logs
Settings
```

---

# 36. ADMIN LICENSE LIST

Columns:

```text
License
Customer
Product
Source
Plan
Activations
Expiration
Support
Status
Created
Actions
```

Filters:

```text
Product
Customer
Marketplace
License Status
License Plan
Expiration
Activation Count
```

---

# 37. ADMIN ACTIVATION LIST

Columns:

```text
Activation ID
Product
Customer
License
Domain
Installation
Environment
IP
Version
Last Check
Status
Activated At
```

---

# 38. ACTIVATION DETAIL PAGE

Display:

```text
Activation ID
Product
Customer
License
Purchase
Marketplace
Domain
Installation URL
Installation ID
Environment
IP
Country
Product Version
Created At
Activated At
Last Validation
License Status
```

Also include:

```text
Activation History
Validation History
IP History
Version History
Admin Actions
Security Events
```

---

# 39. CUSTOMER DASHBOARD

Customer navigation:

```text
Dashboard
My Products
My Licenses
Activations
Downloads
Envato Purchases
Support
Account
```

---

# 40. MY PRODUCTS

Display purchased products.

Each card should show:

```text
Product
Purchase Source
License
License Status
Activation Count
Support Status
Latest Version
Download
Manage License
```

---

# 41. MY LICENSES

Display:

```text
License Key
Product
Plan
Status
Activation Usage
Expiration
Support Expiration
Marketplace
```

Sensitive license keys should be partially masked by default.

---

# 42. ENVATO PURCHASE IMPORT

Customer can enter an Envato purchase code.

Flow:

```text
Enter Purchase Code
        ↓
Verify with Envato
        ↓
Identify Envato Product
        ↓
Map to Internal Product
        ↓
Check duplicate
        ↓
Create Purchase
        ↓
Create/associate License
        ↓
Show in Customer Dashboard
```

A purchase code must never create duplicate licenses repeatedly.

---

# 43. DUPLICATE PURCHASE PROTECTION

Add unique constraints for:

```text
provider + externalPurchaseCode
```

and other appropriate identities.

Do not allow multiple accounts to claim the same purchase unless an admin explicitly transfers ownership.

---

# 44. PRODUCT VERSIONS

Create product version management.

Fields:

```text
Product
Version
Release Name
Release Notes
Minimum Compatible Version
Minimum PHP Version
Minimum WordPress Version
Minimum Node Version
Release Channel
Published At
Status
Package
Checksum
File Size
```

---

# 45. UPDATE CHANNELS

Support:

```text
stable
beta
alpha
development
custom
```

---

# 46. AUTO UPDATE API

Example:

```http
GET /api/v1/products/:slug/updates
```

Client sends:

```text
Current Version
Installation ID
Activation Token
Domain
```

Server responds:

```json
{
  "updateAvailable": true,
  "currentVersion": "1.0.0",
  "latestVersion": "1.1.0",
  "releaseNotes": "...",
  "downloadUrl": "SIGNED_TEMPORARY_URL"
}
```

Only valid licensed installations should receive protected updates.

---

# 47. SECURE DOWNLOADS

Never expose permanent direct download URLs for protected products.

Generate expiring signed download URLs.

Validate:

```text
User
Purchase
License
License Status
Product
Support/update entitlement if applicable
```

before providing file access.

---

# 48. DOWNLOAD TRACKING

Log:

```text
User
Product
Version
License
IP
Date
Source
```

---

# 49. WORDPRESS PLUGIN INTEGRATION

Provide a reusable licensing SDK/library for WordPress plugins.

Functions should conceptually include:

```php
activate_license()
validate_license()
deactivate_license()
check_for_updates()
download_update()
get_license_status()
```

Do not duplicate core licensing logic inside every plugin.

Create a reusable package.

---

# 50. WORDPRESS THEME INTEGRATION

Provide equivalent licensing library for WordPress themes.

Must support:

* Theme activation
* Domain registration
* Update checking
* Download authorization
* License status
* Admin notices

---

# 51. PHP SCRIPT SDK

Provide a lightweight reusable PHP SDK.

Responsibilities:

```text
Activation
Validation
Token storage
Offline validation
Deactivation
Update checking
```

---

# 52. NEXT.JS SDK

Provide reusable Next.js/Node.js licensing SDK.

Possible package:

```text
@company/license-client
```

Functions:

```typescript
activate()
validate()
deactivate()
checkUpdate()
getLicenseStatus()
```

---

# 53. SERVER FINGERPRINT

For appropriate product types optionally create a server/device fingerprint.

Possible inputs:

```text
Installation ID
Hostname
Domain
Platform
Application ID
```

Avoid relying on unstable or privacy-invasive fingerprints.

Installation ID should remain the primary installation identifier.

---

# 54. SECURITY MODULE

Create dedicated Security module.

Admin pages:

```text
Security Dashboard
Blocked Domains
Blocked IPs
Blocked Licenses
Suspicious Activations
Rate Limits
API Abuse
Failed Verification
```

---

# 55. BLOCKLIST

Allow:

```text
Domain Block
IP Block
License Block
User Block
Installation Block
```

Support:

```text
Reason
Created By
Created At
Expires At
Permanent
```

---

# 56. RATE LIMITING

Apply strict rate limiting to:

```text
Purchase Verification
Activation
Validation
Deactivation
Login
Download
Update Checking
```

Use reasonable limits so legitimate installations are not disrupted.

---

# 57. BRUTE FORCE PROTECTION

Detect repeated attempts to guess:

```text
Purchase Keys
License Keys
Activation Credentials
```

Possible response:

```text
Temporary IP restriction
Risk event
Admin notification
CAPTCHA for web flow
```

---

# 58. NEVER TRUST CLIENT INPUT

Always verify server-side:

```text
Product
Domain
Installation ID
License
Purchase
Marketplace
Activation Limit
Expiration
Status
```

Never trust a client to tell the backend that its license is valid.

---

# 59. SECRET MANAGEMENT

Do not:

* Hard-code marketplace tokens
* Hard-code JWT secrets
* Store private signing keys in source
* Put private credentials in frontend

Use secure environment variables / secret management.

---

# 60. HASHING SENSITIVE KEYS

Where practical, do not store sensitive keys entirely in plain text.

Consider storing:

```text
keyHash
keyPrefix
lastFourCharacters
```

for lookup/display patterns.

Design based on whether exact external purchase credentials must be reused with providers.

---

# 61. AUDIT LOGGING

Every important admin/system operation must create immutable audit logs.

Examples:

```text
License created
License revoked
License restored
Activation created
Activation removed
Activation transferred
Activation limit changed
Product settings updated
Marketplace settings changed
Version published
IP blocked
Domain blocked
```

Fields:

```text
Actor
Action
Target Type
Target ID
Before
After
IP
User Agent
Timestamp
Metadata
```

---

# 62. EVENT LOGGING

Create dedicated license events.

Example:

```text
PURCHASE_VERIFIED
LICENSE_CREATED
LICENSE_ACTIVATED
LICENSE_VALIDATED
ACTIVATION_DEACTIVATED
LICENSE_SUSPENDED
LICENSE_REVOKED
LICENSE_EXPIRED
DOMAIN_CHANGED
UPDATE_DOWNLOADED
```

---

# 63. DATABASE COLLECTIONS

Recommended MongoDB collections:

```text
users
roles
permissions

products
product_versions
product_files

marketplace_integrations
purchases

licenses
license_plans

installations
activations
activation_tokens

license_validation_logs
license_events

downloads
update_checks

blocked_entities
security_events

api_clients
webhooks

audit_logs
notifications

settings
```

Do not create one giant license document containing all history.

---

# 64. MONGODB INDEXING

Add proper indexes.

Examples:

```text
products.slug → unique

licenses.licenseKeyHash → unique

purchases.purchaseKeyHash → unique

provider + externalPurchaseCodeHash → unique

activations.activationId → unique

installations.installationId → unique

licenses.userId
licenses.productId
activations.licenseId
activations.productId
activations.normalizedDomain
```

Use indexes based on actual queries.

---

# 65. NESTJS MODULE ARCHITECTURE

Recommended:

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── roles/
│   ├── products/
│   ├── marketplace/
│   │   ├── envato/
│   │   ├── internal/
│   │   └── providers/
│   │
│   ├── purchases/
│   ├── licenses/
│   ├── installations/
│   ├── activations/
│   ├── validation/
│   ├── updates/
│   ├── downloads/
│   ├── security/
│   ├── api-clients/
│   ├── audit/
│   ├── notifications/
│   ├── webhooks/
│   └── settings/
│
├── common/
├── config/
├── database/
├── guards/
├── decorators/
├── interceptors/
├── filters/
├── middleware/
└── utils/
```

Maintain strong module boundaries.

---

# 66. PUBLIC API VS ADMIN API

Separate client-facing endpoints from admin endpoints.

Example:

```text
/api/v1/public/licenses/*
/api/v1/public/products/*
/api/v1/public/updates/*
```

Admin:

```text
/api/v1/admin/products/*
/api/v1/admin/licenses/*
/api/v1/admin/activations/*
/api/v1/admin/purchases/*
```

Customer:

```text
/api/v1/customer/licenses/*
/api/v1/customer/activations/*
```

Do not expose admin service methods through public routes.

---

# 67. API VERSIONING

All external product integrations must use versioned APIs.

Example:

```text
/api/v1/
```

Future breaking changes should allow:

```text
/api/v2/
```

without immediately breaking existing customer installations.

---

# 68. API RESPONSE STANDARD

Use consistent responses.

Success:

```json
{
  "success": true,
  "message": "License activated successfully.",
  "data": {},
  "requestId": "req_..."
}
```

Error:

```json
{
  "success": false,
  "code": "ACTIVATION_LIMIT_REACHED",
  "message": "Maximum activation limit reached.",
  "requestId": "req_..."
}
```

---

# 69. STANDARD ERROR CODES

Create reusable error enums.

Examples:

```text
PRODUCT_NOT_FOUND
PRODUCT_DISABLED
PURCHASE_INVALID
PURCHASE_NOT_FOUND
PURCHASE_ALREADY_CLAIMED
LICENSE_INVALID
LICENSE_EXPIRED
LICENSE_SUSPENDED
LICENSE_REVOKED
ACTIVATION_LIMIT_REACHED
DOMAIN_MISMATCH
INSTALLATION_MISMATCH
PRODUCT_MISMATCH
TOKEN_INVALID
TOKEN_EXPIRED
UPDATE_NOT_ALLOWED
DOWNLOAD_NOT_ALLOWED
RATE_LIMITED
BLOCKED
```

Do not return random error strings from different modules.

---

# 70. IDEMPOTENCY

Activation must be idempotent.

If the same installation calls activate twice:

```text
Do NOT consume two activation slots.
```

Return the existing active activation when appropriate.

The same applies to purchase importing.

---

# 71. RACE CONDITION PROTECTION

Prevent simultaneous requests from bypassing activation limits.

Example:

```text
Activation Limit = 1

Request A
Request B
```

Both must not succeed due to concurrency.

Use atomic database operations/transactions where appropriate.

---

# 72. CUSTOMER OWNERSHIP

An internal marketplace purchase should automatically belong to the purchasing user.

An Envato purchase should be claimable after valid verification.

Once claimed:

```text
Envato Purchase Code
→ Customer
```

Do not allow another customer to claim it without authorized transfer.

---

# 73. ADMIN DASHBOARD METRICS

Show:

```text
Total Products
Total Customers
Total Purchases
Total Licenses
Active Licenses
Expired Licenses
Suspended Licenses
Total Activations
Active Installations
Envato Purchases
Internal Purchases
Downloads Today
Validations Today
Failed Activations
Suspicious Requests
```

---

# 74. ANALYTICS

Charts:

```text
Activations over time
License growth
Marketplace distribution
Most active products
Most downloaded products
License status distribution
Failed activation trend
Top installation countries
Version distribution
```

---

# 75. SEARCH

Global admin search should allow searching:

```text
Customer Name
Customer Email
Product
License Key
Purchase Key
Envato Purchase Code
Domain
Activation ID
Installation ID
Order ID
```

Sensitive values may use masked representation.

---

# 76. FILTERING

Use server-side pagination/filtering.

Do not load thousands of licenses client-side.

---

# 77. PAGINATION

Standard pagination:

```text
page
limit
sort
search
filters
```

Return:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "pages": 25
  }
}
```

---

# 78. WEBHOOKS

Support future webhooks.

Events:

```text
license.created
license.activated
license.deactivated
license.suspended
license.revoked
license.expired
purchase.verified
update.published
```

Use signed webhook payloads.

---

# 79. NOTIFICATIONS

Admin/customer notifications for:

```text
License expiring
Support expiring
New activation
Suspicious activation
License revoked
New product version
Failed Envato verification
Activation limit reached
```

Channels can later support:

```text
Dashboard
Email
Webhook
```

---

# 80. LICENSE EXPIRATION JOBS

Implement background scheduled jobs for:

```text
License expiration
Support expiration
Token cleanup
Expired download URL cleanup
Risk checks
Notification delivery
Analytics aggregation
```

NestJS scheduling/queue architecture should remain modular.

---

# 81. API CLIENT CREDENTIALS

Allow products/applications to identify themselves securely.

Each product may have:

```text
Client ID
Public Identifier
Signing/Public Key Configuration
Allowed API Scopes
```

Never embed master administrative secrets in distributed products.

---

# 82. CLIENT SDK SECURITY

Assume PHP, JavaScript, WordPress, and distributed source code can be inspected.

Therefore:

* Never embed backend secrets.
* Never rely on obscurity.
* Use signed server responses.
* Validate sensitive state server-side.
* Treat client code as untrusted.

---

# 83. TOKEN REVOCATION

When a license is revoked:

```text
Existing cached activation token may remain technically valid until its expiry.
```

Therefore keep activation token lifetime reasonable and require periodic server validation.

---

# 84. LICENSE VALIDATION HISTORY

Log meaningful validation events but prevent uncontrollable database growth.

Options:

```text
Keep detailed recent logs
Aggregate historical logs
Set retention policy
```

---

# 85. PRODUCT UPDATE SECURITY

Update packages should include:

```text
Version
File checksum
Signature/hash
Published timestamp
```

Client should verify package integrity where feasible.

---

# 86. FILE STORAGE ABSTRACTION

Do not tightly couple product files to local filesystem.

Use storage provider architecture:

```text
StorageProvider
 ├── Local
 ├── S3
 ├── Cloudflare R2
 └── Future Provider
```

---

# 87. SOFT DELETE

Use soft-delete/archive where appropriate for:

```text
Products
Licenses
Users
Marketplace integrations
```

Do not destructively remove important licensing records.

---

# 88. PRODUCT ARCHIVING

A product may be:

```text
draft
active
paused
deprecated
archived
```

Archived products should retain customer/license history.

---

# 89. LICENSE NOTES

Admins should be able to attach internal notes:

```text
License flagged by customer support.
Customer moved domain after migration.
Manual 30-day extension approved.
```

Notes should include author and timestamp.

---

# 90. ADMIN PERMISSIONS

Fine-grained permissions:

```text
products.read
products.create
products.update

licenses.read
licenses.create
licenses.update
licenses.revoke

activations.read
activations.manage

purchases.read
purchases.verify

security.read
security.manage

settings.manage
audit.read
```

---

# 91. DATA VALIDATION

Use NestJS DTOs and validation pipes.

Validate:

```text
URLs
Domains
Enums
Object IDs
Versions
Pagination
License limits
Dates
Provider fields
```

Never directly trust raw request bodies.

---

# 92. OBSERVABILITY

Add:

```text
Request IDs
Structured logs
Error logging
API latency measurement
Activation latency
Envato response latency
Update/download failures
```

---

# 93. HEALTH ENDPOINTS

Add protected/publicly-safe system health endpoints.

Examples:

```text
/health
/health/database
```

Do not expose secrets.

---

# 94. FRONTEND ADMIN UI

Use the existing Next.js design system.

Requirements:

* Modern
* Responsive
* Professional SaaS dashboard
* Reusable components
* Table pagination
* Search
* Filters
* Empty states
* Loading skeletons
* Confirmation dialogs
* Toast feedback
* Proper permission-aware navigation

Do not create a completely separate visual system unless necessary.

---

# 95. CUSTOMER UI

Customer UI must remain simple.

Primary goals:

```text
See products
See licenses
Activate/manage domains
Download products
Import Envato purchase
Check updates/support
```

Do not expose technical complexity unnecessarily.

---

# 96. WORDPRESS ACTIVATION EXPERIENCE

Recommended:

```text
License & Activation

Purchase Source
[Own Marketplace] [Envato]

License / Purchase Code
[____________________________]

[Activate License]
```

After success:

```text
License Status: Active
Domain: example.com
Plan: Regular
Activations: 1 / 1
Support Until: ...
Last Checked: ...

[Deactivate License]
```

---

# 97. PHP/NEXT.JS ACTIVATION EXPERIENCE

Provide an activation UI/API integration pattern for apps.

Example:

```text
Product Activation

Email
License Key / Purchase Code

[Activate]
```

Backend must always remain authoritative.

---

# 98. MVP REQUIREMENTS

Phase 1 must include:

1. Product management
2. Internal marketplace provider
3. Envato provider
4. Purchase verification
5. License generation
6. Customer license assignment
7. Installation ID
8. Domain-based activation
9. Activation limits
10. License validation
11. Deactivation
12. Admin license management
13. Customer dashboard
14. Activation history
15. Audit logs
16. Security/rate limiting
17. Signed activation tokens
18. Product version management
19. Protected update endpoint
20. Protected downloads

---

# 99. PHASE 2

Implement:

* Auto updates
* SDKs
* Analytics
* Notifications
* Webhooks
* Advanced security
* Staging detection
* Abuse detection
* Advanced license plans
* Subscription licenses
* Trial licenses
* Product release channels

---

# 100. PHASE 3

Prepare system for:

* Additional marketplaces
* Organization/team licenses
* Reseller licensing
* Agency licenses
* API-based licensing
* White-label licensing
* Marketplace APIs
* License provisioning API
* High-volume enterprise customers

---

# 101. CRITICAL IMPLEMENTATION RULES FOR ANTIGRAVITY

Before changing code:

1. Inspect the complete existing repository.
2. Understand the current Next.js structure.
3. Understand the NestJS backend structure.
4. Understand MongoDB schemas/models.
5. Understand current authentication.
6. Understand admin/customer roles.
7. Understand existing API patterns.
8. Reuse existing architecture where appropriate.
9. Do not unnecessarily rebuild existing working functionality.
10. Do not create duplicate modules/components/services.

---

# 102. BACKWARD COMPATIBILITY

Existing website functionality must continue working.

Do not introduce breaking changes unless unavoidable.

If restructuring is required:

```text
Migrate safely
Preserve existing routes where possible
Provide compatibility layer where necessary
```

---

# 103. CODE QUALITY

Implementation must use:

* TypeScript strict typing
* Modular NestJS architecture
* Reusable services
* DTO validation
* Dependency injection
* Repository/service separation where useful
* Centralized enums/constants
* Centralized error handling
* Proper logging
* Secure environment configuration

Avoid:

* Huge services
* Duplicate logic
* Hard-coded provider conditions everywhere
* Hard-coded product IDs
* Hard-coded Envato logic in controllers
* Direct MongoDB access from controllers

---

# 104. NO MOCK FUNCTIONALITY IN FINAL IMPLEMENTATION

Do not leave:

```text
Fake activations
Fake license checks
Fake marketplace responses
Placeholder admin tables
Hard-coded products
Hard-coded keys
```

UI and backend should connect to real database-backed APIs.

---

# 105. TESTING

Implement tests for critical workflows.

At minimum:

### Purchase

```text
Valid internal purchase
Invalid purchase
Duplicate purchase
Valid Envato purchase
Wrong Envato product
Already claimed Envato purchase
```

### Activation

```text
Valid activation
Invalid license
Expired license
Revoked license
Blocked domain
Activation limit reached
Duplicate activation
Staging activation
Localhost activation
```

### Validation

```text
Valid token
Expired token
Wrong domain
Wrong product
Wrong installation
Revoked license
```

### Deactivation

```text
Valid deactivation
Duplicate deactivation
Unauthorized deactivation
```

---

# 106. SECURITY TESTING

Test:

* Brute-force attempts
* Tampered tokens
* Modified domain
* Modified installation ID
* Replay attempts
* Unauthorized admin APIs
* Unauthorized download
* Unauthorized update
* Rate-limit behavior

---

# 107. ACCEPTANCE CRITERIA — PRIMARY FLOW

The implementation is considered successful when:

```text
Admin creates a WordPress plugin product.

Admin enables:
- Internal Marketplace
- Envato CodeCanyon

Customer purchases product internally
OR
imports a valid Envato purchase.

System creates a normalized Purchase.

System creates/assigns a License.

Customer installs the product.

Product sends activation request.

System validates ownership.

System verifies license status.

System checks activation limit.

System creates Installation.

System creates Activation.

System returns signed Activation Token.

Product becomes licensed.

Admin can see:
- Customer
- Product
- Purchase
- Marketplace
- License
- Activation
- Domain
- Installation ID
- IP
- Product Version
- Activation Time
- Last Validation

Customer can deactivate the installation.

Activation slot becomes available again.

Admin can revoke the license.

Next validation detects the revocation.

Protected product updates are denied to revoked licenses.
```

---

# 108. REQUIRED SYSTEM RELATIONSHIP

Final data relationship should behave conceptually as:

```text
USER
 │
 ├──────────── PURCHASE
 │                │
 │                ▼
 │              LICENSE
 │                │
 │        ┌───────┴────────┐
 │        │                │
 │        ▼                ▼
 │   INSTALLATION     INSTALLATION
 │        │                │
 │        ▼                ▼
 │   ACTIVATION       ACTIVATION
 │
 ▼
DOWNLOADS / UPDATES / SUPPORT
```

Product sits above the entire relationship:

```text
PRODUCT
 ├── PURCHASES
 ├── LICENSES
 ├── INSTALLATIONS
 ├── ACTIVATIONS
 ├── VERSIONS
 ├── DOWNLOADS
 └── MARKETPLACE CONFIG
```

---

# 109. FINAL DEVELOPMENT REQUIREMENT

Implement this as a reusable licensing platform, not as one feature designed only for one WordPress plugin.

A single License Manager must eventually be capable of managing hundreds or thousands of products across:

```text
WordPress
PHP
Next.js
SaaS
Envato
Internal Marketplace
Future Marketplace Providers
```

The architecture must remain modular, scalable, secure, auditable, and extensible.

---

# 110. ANTIGRAVITY EXECUTION INSTRUCTION

Start by conducting a repository-wide architecture audit.

Then:

```text
1. Document current architecture.
2. Identify reusable existing modules.
3. Identify database migrations/schema additions.
4. Define final module structure.
5. Define MongoDB schemas.
6. Define API contracts.
7. Implement backend core.
8. Implement admin interfaces.
9. Implement customer interfaces.
10. Implement marketplace integrations.
11. Implement activation APIs.
12. Implement validation/token system.
13. Implement security.
14. Implement update/download system.
15. Implement tests.
16. Perform integration testing.
17. Remove temporary/mock functionality.
18. Verify all end-to-end flows.
```

Do not stop after generating UI pages or database schemas.

Continue until the full system is integrated from:

**Purchase → License → Activation → Validation → Deactivation → Update/Download.**

The final implementation must be production-oriented and compatible with the existing Next.js + NestJS + MongoDB application.
