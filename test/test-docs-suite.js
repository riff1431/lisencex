/**
 * =========================================================================
 *  LicenseNest – API Documentation & Developer Portal Test Suite
 * =========================================================================
 *
 * Tests:
 *  1. Public docs spec endpoint returns valid JSON spec
 *  2. Spec contains all required top-level fields
 *  3. All five endpoints are documented
 *  4. Error codes table is complete
 *  5. SDK types cover all product categories
 *  6. Rate limit configuration present
 *  7. Authentication section present
 *  8. Product credential CRUD flow works
 *  9. Credential rotation works with grace period
 * 10. Credential toggle (enable/disable) works
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api/v1';

let adminToken = '';
let testProductId = '';
let testCredentialId = '';

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
  // Try seeded super admin first
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
      const user = res.data.data.user;
      if (user?.role === 'super_admin' || user?.role === 'admin') {
        adminToken = res.data.data.accessToken;
        return true;
      }
    }
  }
  return false;
}

async function getTestProduct() {
  const res = await api('/admin/products?limit=1');
  const items = res.data?.data?.items || [];
  if (items.length > 0) {
    testProductId = items[0]._id;
    return true;
  }
  // Create one
  const createRes = await api('/admin/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Docs Test Plugin',
      slug: 'docs-test-plugin-' + Date.now(),
      type: 'wordpress_plugin',
      description: 'Test product for documentation tests',
      status: 'active',
    }),
  });
  const created = createRes.data?.data;
  if (created?._id) {
    testProductId = created._id;
    return true;
  }
  return false;
}

const results = [];
function assert(name, condition, detail = '') {
  results.push({ name, pass: !!condition, detail });
}

async function run() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   LicenseNest – Documentation & Developer Portal Tests     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ── Setup ──────────────────────────────────────────────────────
  await loginAdmin();
  await getTestProduct();

  // ── Test 1: Docs spec endpoint ─────────────────────────────────
  const spec = await api('/public/docs/spec', { skipAuth: true });
  assert(
    '1. Public docs spec endpoint returns JSON',
    spec.status === 200 && spec.data,
    `status=${spec.status}`
  );

  // ── Test 2: Required top-level fields ──────────────────────────
  const specData = spec.data?.data || spec.data || {};
  const requiredFields = ['version', 'title', 'baseUrl', 'authentication', 'rateLimits', 'endpoints', 'errorCodes', 'sdkTypes'];
  const missingFields = requiredFields.filter(f => !specData[f]);
  assert(
    '2. Spec contains all required top-level fields',
    missingFields.length === 0,
    missingFields.length > 0 ? `Missing: ${missingFields.join(', ')}` : 'All fields present'
  );

  // ── Test 3: All endpoints documented ───────────────────────────
  const endpoints = specData.endpoints || [];
  const expectedPaths = [
    '/api/v1/public/licenses/activate',
    '/api/v1/public/licenses/validate',
    '/api/v1/public/licenses/deactivate',
    '/api/v1/public/products/:slug/updates',
    '/api/v1/public/downloads/:token',
  ];
  const documentedPaths = endpoints.map(e => e.path);
  const missingEndpoints = expectedPaths.filter(p => !documentedPaths.includes(p));
  assert(
    '3. All five API endpoints are documented',
    missingEndpoints.length === 0,
    missingEndpoints.length > 0 ? `Missing: ${missingEndpoints.join(', ')}` : `${endpoints.length} endpoints documented`
  );

  // ── Test 4: Error codes complete ───────────────────────────────
  const errorCodes = specData.errorCodes || [];
  const criticalCodes = ['UNAUTHORIZED', 'LICENSE_NOT_FOUND', 'ACTIVATION_LIMIT_REACHED', 'TOKEN_INVALID', 'RATE_LIMITED'];
  const documentedCodes = errorCodes.map(e => e.code);
  const missingCodes = criticalCodes.filter(c => !documentedCodes.includes(c));
  assert(
    '4. Error codes table is complete',
    missingCodes.length === 0,
    `${errorCodes.length} codes documented, missing: ${missingCodes.join(', ') || 'none'}`
  );

  // ── Test 5: SDK types cover all product categories ─────────────
  const sdkTypes = specData.sdkTypes || [];
  const expectedSdkTypes = ['wordpress-plugin', 'wordpress-theme', 'php-script', 'nextjs-app', 'nextjs-plugin'];
  const documentedSdkTypes = sdkTypes.map(s => s.type);
  const missingSdkTypes = expectedSdkTypes.filter(t => !documentedSdkTypes.includes(t));
  assert(
    '5. SDK types cover all product categories',
    missingSdkTypes.length === 0,
    `${sdkTypes.length} SDK types, missing: ${missingSdkTypes.join(', ') || 'none'}`
  );

  // ── Test 6: Rate limit configuration ───────────────────────────
  const rateLimits = specData.rateLimits || {};
  assert(
    '6. Rate limit configuration present',
    rateLimits.requestsPerMinute > 0 && Array.isArray(rateLimits.headers),
    `rpm=${rateLimits.requestsPerMinute}, headers=${(rateLimits.headers || []).length}`
  );

  // ── Test 7: Authentication section ─────────────────────────────
  const auth = specData.authentication || {};
  assert(
    '7. Authentication section present',
    auth.type === 'header' && Array.isArray(auth.headers) && auth.headers.length >= 2,
    `type=${auth.type}, headers=${JSON.stringify(auth.headers)}`
  );

  // ── Test 8: Credential CRUD flow ───────────────────────────────
  if (testProductId) {
    const createRes = await api(`/admin/products/${testProductId}/credentials`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Docs Test Key',
        scopes: ['activate', 'validate', 'update'],
      }),
    });
    const cred = createRes.data?.data || createRes.data;
    const hasKeys = cred?.clientId?.startsWith('client_') && cred?.apiKey?.startsWith('pk_live_');
    testCredentialId = cred?._id;
    assert(
      '8. Product credential CRUD flow works',
      createRes.status < 300 && hasKeys,
      `clientId=${cred?.clientId?.slice(0, 15)}..., scopes=${JSON.stringify(cred?.scopes)}`
    );
  } else {
    assert('8. Product credential CRUD flow works', false, 'No test product available');
  }

  // ── Test 9: Credential rotation ────────────────────────────────
  if (testCredentialId && testProductId) {
    const rotateRes = await api(`/admin/products/${testProductId}/credentials/${testCredentialId}/rotate`, {
      method: 'POST',
    });
    const rotateData = rotateRes.data?.data || rotateRes.data;
    const oldRotated = rotateData?.rotated?.status === 'rotated';
    const newCreated = rotateData?.created?.clientId?.startsWith('client_');
    testCredentialId = rotateData?.created?._id || testCredentialId;
    assert(
      '9. Credential rotation with grace period',
      rotateRes.status < 300 && (oldRotated || newCreated),
      `old=${rotateData?.rotated?.status}, new=${rotateData?.created?.clientId?.slice(0, 15)}`
    );
  } else {
    assert('9. Credential rotation with grace period', false, 'No credential to rotate');
  }

  // ── Test 10: Credential toggle ─────────────────────────────────
  if (testCredentialId && testProductId) {
    const toggleRes = await api(`/admin/products/${testProductId}/credentials/${testCredentialId}/toggle`, {
      method: 'POST',
    });
    const toggled = toggleRes.data?.data || toggleRes.data;
    assert(
      '10. Credential toggle (enable/disable) works',
      toggleRes.status < 300 && toggled?.status,
      `status=${toggled?.status}`
    );
  } else {
    assert('10. Credential toggle (enable/disable) works', false, 'No credential to toggle');
  }

  // ── Report ─────────────────────────────────────────────────────
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

run().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
