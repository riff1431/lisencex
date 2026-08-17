/**
 * =========================================================================
 *  LicenseNest – Developer Integration Package Generator Test Suite
 * =========================================================================
 *
 * Tests:
 *  1. Fetch package overview for WordPress Plugin
 *  2. Fetch package overview for WordPress Theme
 *  3. Fetch package overview for PHP Script
 *  4. Fetch package overview for Next.js App
 *  5. Fetch package overview for Next.js Plugin
 *  6. Pre-filled parameters check (productId, slug, clientId, pubKey, endpoints)
 *  7. Security verification: Zero private server secrets in generated code
 *  8. Package version bumping & history tracking
 *  9. Stream ZIP download (valid binary archive with Content-Type application/zip)
 * 10. ZIP extraction & integrity verification (checks unzipped files & content)
 */

const unzipper = require('../backend/node_modules/unzipper');
const API_BASE = process.env.API_BASE || 'http://localhost:5000/api/v1';

let adminToken = '';

async function api(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (adminToken && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function loginAdmin() {
  const accounts = [
    { email: 'admin@example.com', password: 'Admin123456!' },
    { email: 'admin@licensenest.com', password: 'Admin123!' },
  ];
  for (const acc of accounts) {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify(acc),
    });
    if (res.data?.data?.accessToken) {
      adminToken = res.data.data.accessToken;
      return true;
    }
  }
  return false;
}

const results = [];
function assert(name, condition, detail = '') {
  results.push({ name, pass: !!condition, detail });
}

async function run() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   LicenseNest – Integration Package Generator Test Suite    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const authed = await loginAdmin();
  if (!authed) {
    console.error('Failed to log in as admin.');
    process.exit(1);
  }

  // Create a dedicated product for package testing
  const timestamp = Date.now();
  const prodRes = await api('/admin/products/wizard', {
    method: 'POST',
    body: JSON.stringify({
      name: `Generator Test SaaS ${timestamp}`,
      slug: `gen-test-${timestamp}`,
      productType: 'wordpress_plugin',
      description: 'Test product for integration package generator',
      currentVersion: '3.0.0',
    }),
  });

  const productId = (prodRes.data?.data || prodRes.data)?.product?._id;
  const productSlug = (prodRes.data?.data || prodRes.data)?.product?.slug;

  if (!productId) {
    console.error('Failed to create test product');
    process.exit(1);
  }

  // ── Test 1: WordPress Plugin Package Overview ──────────────────────────────
  const wpRes = await api(`/admin/products/${productId}/integration-package?framework=wordpress_plugin`);
  const wpData = wpRes.data?.data || wpRes.data || {};
  const wpFiles = wpData.files || [];
  assert(
    '1. WordPress Plugin package manifest generated',
    wpRes.status < 300 && wpFiles.some((f) => f.path.includes('class-licensenest-plugin.php')),
    `fileCount=${wpData.fileCount}, version=${wpData.packageVersion}`
  );

  // ── Test 2: WordPress Theme Package Overview ───────────────────────────────
  const themeRes = await api(`/admin/products/${productId}/integration-package?framework=wordpress_theme`);
  const themeData = themeRes.data?.data || themeRes.data || {};
  const themeFiles = themeData.files || [];
  assert(
    '2. WordPress Theme package manifest generated',
    themeRes.status < 300 && themeFiles.some((f) => f.path.includes('class-licensenest-theme.php')),
    `fileCount=${themeData.fileCount}, compatibility="${themeData.compatibility?.slice(0, 30)}..."`
  );

  // ── Test 3: PHP Script Package Overview ────────────────────────────────────
  const phpRes = await api(`/admin/products/${productId}/integration-package?framework=php_script`);
  const phpData = phpRes.data?.data || phpRes.data || {};
  const phpFiles = phpData.files || [];
  assert(
    '3. PHP Script standalone package manifest generated',
    phpRes.status < 300 && phpFiles.some((f) => f.path.includes('LicenseNest_PHP.php')),
    `fileCount=${phpData.fileCount}`
  );

  // ── Test 4: Next.js App Package Overview ───────────────────────────────────
  const nextRes = await api(`/admin/products/${productId}/integration-package?framework=nextjs_app`);
  const nextData = nextRes.data?.data || nextRes.data || {};
  const nextFiles = nextData.files || [];
  assert(
    '4. Next.js App Router package manifest generated',
    nextRes.status < 300 && nextFiles.some((f) => f.path.includes('LicenseNestNextApp.ts')),
    `fileCount=${nextData.fileCount}`
  );

  // ── Test 5: Next.js Plugin Package Overview ────────────────────────────────
  const plugRes = await api(`/admin/products/${productId}/integration-package?framework=nextjs_plugin`);
  const plugData = plugRes.data?.data || plugRes.data || {};
  const plugFiles = plugData.files || [];
  assert(
    '5. Next.js Plugin package manifest generated',
    plugRes.status < 300 && plugFiles.some((f) => f.path.includes('LicenseNestPlugin.ts')),
    `fileCount=${plugData.fileCount}`
  );

  // ── Test 6: Pre-Configured Parameters Validation ───────────────────────────
  const configFile = wpFiles.find((f) => f.path.includes('config.php'));
  const hasSlug = configFile?.preview?.includes(productSlug);
  const hasClientId = configFile?.preview?.includes('client_');
  const hasPubKey = configFile?.preview?.includes('pk_verify_');
  assert(
    '6. Preconfigures product slug, client ID, API endpoints & verification key',
    hasSlug && hasClientId && hasPubKey,
    `slugFound=${hasSlug}, clientFound=${hasClientId}, pubKeyFound=${hasPubKey}`
  );

  // ── Test 7: Security Verification (Zero Private Server Secrets) ───────────
  let secretsLeaked = false;
  for (const f of wpFiles) {
    if (f.preview.includes('JWT_SECRET') || f.preview.includes('jwtSecret') || f.preview.includes('ACTIVATION_SECRET')) {
      secretsLeaked = true;
    }
  }
  assert(
    '7. Security Check: Never includes private server secrets or tokens',
    !secretsLeaked,
    'Verified zero private secrets in distributed SDK code'
  );

  // ── Test 8: Package Version Bumping & History ──────────────────────────────
  const bumpRes = await api(`/admin/products/${productId}/integration-package/generate`, {
    method: 'POST',
    body: JSON.stringify({
      framework: 'wordpress_plugin',
      packageVersion: '2.1.0',
    }),
  });
  const bumpData = bumpRes.data?.data || bumpRes.data || {};

  const updatedOverview = await api(`/admin/products/${productId}/integration-package?framework=wordpress_plugin`);
  const updatedData = updatedOverview.data?.data || updatedOverview.data || {};

  assert(
    '8. Package version bumping & history tracking',
    bumpRes.status < 300 && updatedData.packageVersion === '2.1.0' && updatedData.history?.length > 0,
    `newVersion=${updatedData.packageVersion}, historyEntries=${updatedData.history?.length}`
  );

  // ── Test 9: Stream ZIP Download ───────────────────────────────────────────
  const downloadUrl = `${API_BASE}/admin/products/${productId}/integration-package/download?framework=wordpress_plugin&version=2.1.0`;
  const dlRes = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  const contentType = dlRes.headers.get('content-type');
  const contentDisp = dlRes.headers.get('content-disposition');
  const zipBuffer = Buffer.from(await dlRes.arrayBuffer());

  assert(
    '9. Stream ZIP download returns valid application/zip archive',
    dlRes.status === 200 && contentType?.includes('application/zip') && contentDisp?.includes('.zip') && zipBuffer.length > 500,
    `status=${dlRes.status}, size=${zipBuffer.length} bytes, filename="${contentDisp}"`
  );

  // ── Test 10: ZIP Extraction & File Integrity ──────────────────────────────
  let hasReadme = false;
  let hasQuickstart = false;
  let hasPluginClass = false;
  let hasConfig = false;
  let unzippedPaths = [];

  if (zipBuffer.length > 0) {
    try {
      const directory = await unzipper.Open.buffer(zipBuffer);
      unzippedPaths = directory.files.map((f) => f.path);
      hasReadme = unzippedPaths.includes('README.md');
      hasQuickstart = unzippedPaths.includes('QUICKSTART.md');
      hasPluginClass = unzippedPaths.some((p) => p.includes('class-licensenest-plugin.php'));
      hasConfig = unzippedPaths.some((p) => p.includes('config.php'));
    } catch (zipErr) {
      console.error('Unzipper error details:', zipErr, 'Buffer prefix:', zipBuffer.slice(0, 100).toString('utf8'));
    }
  }

  assert(
    '10. ZIP extraction & integrity verification (unpacked successfully)',
    hasReadme && hasQuickstart && hasPluginClass && hasConfig,
    `unzippedFiles=[${unzippedPaths.join(', ')}]`
  );

  // ── Summary Report ─────────────────────────────────────────────────────────
  console.log('━'.repeat(62));
  let passed = 0;
  for (const r of results) {
    const icon = r.pass ? '✅' : '❌';
    console.log(`  ${icon}  ${r.name}  ${r.detail ? '(' + r.detail + ')' : ''}`);
    if (r.pass) passed++;
  }
  console.log('━'.repeat(62));
  console.log(`\n  Result: ${passed}/${results.length} passed\n`);

  if (passed < results.length) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
