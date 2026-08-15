# LicenseNest Client SDK

A fully reusable, multi-platform licensing integration layer for all product types sold through the LicenseNest platform.

## SDK Structure

```
sdk/
├── core/
│   ├── LicenseNest_Base_Client.php     ← PHP base class (shared by WP + PHP Script)
│   └── LicenseNestBaseClient.ts        ← TypeScript base class (shared by Next.js)
│
├── wordpress/
│   ├── plugin/
│   │   ├── class-licensenest-plugin.php   ← WordPress Plugin integration
│   │   └── example-plugin.php             ← Full integration demo
│   └── theme/
│       └── class-licensenest-theme.php    ← WordPress Theme integration
│
├── php/
│   └── LicenseNest_PHP.php              ← Generic PHP Script/App integration
│
├── nextjs/
│   ├── LicenseNestNextApp.ts            ← Next.js App integration
│   ├── LicenseNestPlugin.ts             ← Next.js Theme/Plugin integration
│   └── examples/
│       ├── useLicense.ts                ← React hook for client components
│       └── middleware.example.ts        ← Route-level license gating
│
└── README.md                            ← This file
```

---

## API Contract

All integrations expose the **same 5 methods**. Future product types inherit these without rebuilding any logic.

| Method | Description |
|---|---|
| `activate(credential, options?)` | Activate with license key or Envato purchase code |
| `validate()` | Check validity (cached; server call only when `cachedUntil` expires) |
| `getLicenseStatus()` | Read cached status synchronously (no network) |
| `deactivate(reason?)` | Release activation slot and clear local cache |
| `checkUpdate()` | Query update availability for the current version |

---

## Security Model

> ⚠️ **Never store private server secrets (ACTIVATION_SECRET, JWT_SECRET) in distributed product code.**

| Concern | Solution |
|---|---|
| Signing keys | Kept exclusively on the LicenseNest server |
| Token storage | Signed JWT stored **client-side** (wp_options / file / localStorage) |
| Offline access | Grace period (default 7d) allows product to work without internet |
| Replay attacks | Token is rotated on each server validation |
| Slot abuse | Server counts active activations — deactivation frees the slot |
| Domain binding | Token is bound to `installationId` + `domain` at activation |

---

## Integration Quick Start

### WordPress Plugin

```php
// In your plugin's main .php file:
require_once __DIR__ . '/includes/class-licensenest-plugin.php';

$license = new LicenseNest_Plugin_License(
    'https://your-api.com/api/v1',
    'your-plugin-slug',          // must match admin panel slug
    MY_PLUGIN_VERSION,
    __FILE__
);
$license->register();

// Gate premium features:
if ($license->isActive()) {
    require_once __DIR__ . '/pro/pro-features.php';
}
```

**What `register()` does automatically:**
- Adds a **License Key** page under Settings
- Handles activate / deactivate form submissions
- Shows an admin notice when not activated
- Schedules a **daily WP-Cron heartbeat**
- Hooks into WordPress **automatic updates**

---

### WordPress Theme

```php
// In functions.php:
require_once get_template_directory() . '/inc/class-licensenest-theme.php';

$theme_license = new LicenseNest_Theme_License(
    'https://your-api.com/api/v1',
    'your-theme-slug',
    wp_get_theme()->get('Version')
);
$theme_license->register();

// Gate pro customizer options:
if ($theme_license->isActive()) {
    add_action('customize_register', 'mytheme_pro_customizer_options');
}
```

---

### PHP Script

```php
require_once __DIR__ . '/includes/LicenseNest_PHP.php';

$license = new LicenseNest_PHP(
    'https://your-api.com/api/v1',
    'your-script-slug',
    '2.4.1',
    __DIR__ . '/storage'  // writable directory
);

// Call on every request (self-throttled by file cache)
$status = $license->validate();

if (!$status['valid']) {
    http_response_code(402);
    die('License error: ' . $status['message']);
}

// Optional: check for updates
$update = $license->checkUpdate();
if ($update['updateAvailable']) {
    error_log('Update available: v' . $update['latestVersion']);
}
```

---

### Next.js App

```typescript
// lib/license.ts
import { LicenseNestNextApp } from '@/sdk/nextjs/LicenseNestNextApp';

export const license = new LicenseNestNextApp(
    process.env.NEXT_PUBLIC_LICENSENEST_API!,
    process.env.NEXT_PUBLIC_PRODUCT_SLUG!,
    process.env.NEXT_PUBLIC_PRODUCT_VERSION ?? '1.0.0',
);
```

```tsx
// components/LicenseGate.tsx — Client Component
'use client';
import { useLicense } from '@/sdk/nextjs/examples/useLicense';
import { license } from '@/lib/license';

export function LicenseGate({ children }: { children: React.ReactNode }) {
    const { status, loading, activate, error } = useLicense(license);

    if (loading) return <div>Validating license...</div>;

    if (!status?.valid) {
        return <ActivationForm onActivate={activate} error={error} />;
    }

    return <>{children}</>;
}
```

```typescript
// app/page.tsx — Server Component (build-time check)
import { license } from '@/lib/license';

export default async function Page() {
    const status = await license.validate();
    if (!status.valid) redirect('/activate');
    return <App />;
}
```

---

### Next.js Theme / Plugin

```typescript
// index.ts (plugin entry point)
import { LicenseNestPlugin } from './sdk/LicenseNestPlugin';

export const pluginLicense = new LicenseNestPlugin({
    apiUrl:         process.env.NEXT_PUBLIC_LICENSENEST_API!,
    productSlug:    'my-nextjs-theme',
    productVersion: '3.1.0',
    licenseKeyEnvVar: 'LICENSENEST_KEY',  // reads from .env.local
});

// In instrumentation.ts (runs once at server startup):
export async function register() {
    await pluginLicense.autoActivate();
}

// In a server action / RSC:
const isLicensed = await pluginLicense.isLicensedForBuild();
```

**.env.local in end-user project:**
```env
LICENSENEST_KEY=LIC-XXXX-XXXX-XXXX-XXXX
NEXT_PUBLIC_SITE_URL=https://myclient.com
```

---

## Validation Flow

```
Boot
 │
 ├─ Load cached token from storage
 │   ├─ No token → INACTIVE
 │   └─ Token exists
 │       ├─ cachedUntil > now → ACTIVE (no network call)
 │       └─ cachedUntil elapsed
 │           ├─ POST /public/licenses/validate
 │           │   ├─ Server returns valid → refresh cache, ACTIVE
 │           │   └─ Server rejects → clear cache, status code
 │           └─ Network unreachable
 │               ├─ gracePeriodUntil > now → ACTIVE (offline grace)
 │               └─ Grace expired → GRACE_PERIOD_EXPIRED
```

---

## License Status Values

| Status | Meaning | Product should |
|---|---|---|
| `ACTIVE` | Valid and within cache interval | Allow full access |
| `INACTIVE` | Not activated | Show activation form |
| `EXPIRED` | License duration ended | Block + show renewal link |
| `SUSPENDED` | Admin suspended | Block + show contact info |
| `REVOKED` | Admin revoked (fraud/chargeback) | Block permanently |
| `DOMAIN_MISMATCH` | Domain changed without transfer | Show domain transfer option |
| `INSTALLATION_MISMATCH` | installationId doesn't match server | Block |
| `GRACE_PERIOD_EXPIRED` | Offline too long | Block + require internet check |

---

## Adding a New Product Type

1. **PHP product**: Extend `LicenseNest_Base_Client` and implement the 4 abstract methods: `writeCache`, `readCache`, `deleteCache`, `getInstallationId`, `getDomain`.

2. **TypeScript product**: Extend `LicenseNestBaseClient` and implement `getDomain()`. Pass a custom `ILicenseStorage` if needed.

The 5-method API contract (`activate`, `validate`, `getLicenseStatus`, `deactivate`, `checkUpdate`) is already implemented in the base classes — no logic needs to be rebuilt.

---

## Environment Variables Reference

| Variable | Used by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_LICENSENEST_API` | Next.js | API base URL |
| `NEXT_PUBLIC_PRODUCT_SLUG` | Next.js App | Product identifier |
| `NEXT_PUBLIC_PRODUCT_VERSION` | Next.js App | Current version |
| `NEXT_PUBLIC_SITE_URL` | Next.js | Domain detection |
| `LICENSENEST_KEY` | Next.js Plugin | License key (server-only) |
| `NEXT_PUBLIC_LICENSENEST_KEY` | Next.js Plugin | License key (client-side only, less secure) |
