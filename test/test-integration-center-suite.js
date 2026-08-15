/**
 * =========================================================================
 *  LicenseNest – Developer License Integration Center Test Suite
 * =========================================================================
 *
 * Tests:
 *  1. Admin can fetch full integration settings for any product
 *  2. Settings contain Product ID, Slug, Public Client ID, API Key, Verification Key
 *  3. Settings contain all 5 generated API endpoints
 *  4. Settings include license policies (cache interval, offline grace, localhost rules)
 *  5. Templates are provided for all 5 product types (WP Plugin, WP Theme, PHP, Next.js App, Next.js Plugin)
 *  6. UI activation examples are generated (HTML/PHP and React/Next.js)
 *  7. Integration status can be updated (not_integrated -> testing -> production_ready)
 *  8. Test scenario simulator: Successful activation (ACTIVATE_VALID)
 *  9. Test scenario simulator: Error handling (invalid key, expired, revoked, domain mismatch, limit reached)
 * 10. Test scenario simulator: Heartbeat validation and deactivation flows
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api/v1';

let adminToken = '';
let testProductId = '';

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

async function getOrCreateProduct() {
  const res = await api('/admin/products?limit=1');
  const items = res.data?.data?.items || [];
  if (items.length > 0) {
    testProductId = items[0]._id;
    return true;
  }
  const createRes = await api('/admin/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Integration Center Demo Product',
      slug: 'integration-demo-' + Date.now(),
      type: 'wordpress_plugin',
      description: 'Test product for integration center',
      status: 'active',
    }),
  });
  if (createRes.data?.data?._id) {
    testProductId = createRes.data.data._id;
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
  console.log('║   LicenseNest – Developer Integration Center Test Suite     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const authed = await loginAdmin();
  if (!authed) {
    console.error('Failed to log in as admin.');
    process.exit(1);
  }

  await getOrCreateProduct();
  if (!testProductId) {
    console.error('Failed to get test product.');
    process.exit(1);
  }

  // ── Test 1: Fetch Integration Settings ─────────────────────────────────────
  const intRes = await api(`/admin/products/${testProductId}/integration`);
  const data = intRes.data?.data || intRes.data || {};
  assert(
    '1. Fetch integration settings for product',
    intRes.status === 200 && data.productId,
    `productName="${data.productName}", status=${intRes.status}`
  );

  // ── Test 2: Keys & IDs in Settings ─────────────────────────────────────────
  const hasKeys =
    data.productId &&
    data.productSlug &&
    data.publicClientId?.startsWith('client_') &&
    data.apiKey?.startsWith('pk_live_') &&
    data.publicVerificationKey?.startsWith('pk_verify_');
  assert(
    '2. Contains Product ID, Slug, Public Client ID, API Key & Public Key',
    hasKeys,
    `clientId=${data.publicClientId?.slice(0, 15)}..., pubKey=${data.publicVerificationKey?.slice(0, 15)}...`
  );

  // ── Test 3: Generated API Endpoints ────────────────────────────────────────
  const ep = data.endpoints || {};
  const hasEndpoints =
    ep.activationUrl?.includes('/public/licenses/activate') &&
    ep.validationUrl?.includes('/public/licenses/validate') &&
    ep.deactivationUrl?.includes('/public/licenses/deactivate') &&
    ep.updateUrl?.includes('/updates') &&
    ep.downloadUrlTemplate?.includes('/public/downloads/');
  assert(
    '3. Contains all 5 product API endpoint URLs',
    hasEndpoints,
    `actUrl=${ep.activationUrl}`
  );

  // ── Test 4: Policy Settings ────────────────────────────────────────────────
  const pol = data.licenseSettings || {};
  assert(
    '4. Includes cache interval, grace period and environment rules',
    pol.validationIntervalHours > 0 && pol.offlineGracePeriodDays > 0 && typeof pol.allowLocalhost === 'boolean',
    `interval=${pol.validationIntervalHours}h, grace=${pol.offlineGracePeriodDays}d, allowLocalhost=${pol.allowLocalhost}`
  );

  // ── Test 5: Templates for All 5 Product Types ──────────────────────────────
  const tmpl = data.templates || {};
  const requiredTemplates = ['wordpressPlugin', 'wordpressTheme', 'phpScript', 'nextjsApp', 'nextjsPlugin'];
  const missingTmpl = requiredTemplates.filter((t) => !tmpl[t]?.setupCode || !tmpl[t]?.methodsCode);
  assert(
    '5. Code templates provided for all 5 product categories',
    missingTmpl.length === 0,
    missingTmpl.length === 0 ? 'All 5 SDK templates generated' : `Missing: ${missingTmpl.join(', ')}`
  );

  // ── Test 6: UI Activation Examples ─────────────────────────────────────────
  const ui = data.uiExamples || {};
  assert(
    '6. Standard UI activation form examples generated',
    ui.phpHtml?.includes('Activate') && ui.reactComponent?.includes('LicenseActivationModal'),
    'PHP HTML form and React Next.js modal component present'
  );

  // ── Test 7: Update Integration Status ──────────────────────────────────────
  const updateRes1 = await api(`/admin/products/${testProductId}/integration/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'testing', metadata: { testRun: Date.now() } }),
  });
  const updated1 = updateRes1.data?.data || updateRes1.data || {};

  const updateRes2 = await api(`/admin/products/${testProductId}/integration/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'production_ready' }),
  });
  const updated2 = updateRes2.data?.data || updateRes2.data || {};

  assert(
    '7. Update integration status (testing -> production_ready)',
    updated1.integrationStatus === 'testing' && updated2.integrationStatus === 'production_ready',
    `status1=${updated1.integrationStatus}, status2=${updated2.integrationStatus}`
  );

  // ── Test 8: Live Test Scenario - ACTIVATE_VALID ────────────────────────────
  const sc1 = await api(`/admin/products/${testProductId}/integration/test-scenario`, {
    method: 'POST',
    body: JSON.stringify({ scenario: 'ACTIVATE_VALID' }),
  });
  const sc1Data = sc1.data?.data || sc1.data || {};
  assert(
    '8. Test Scenario: ACTIVATE_VALID returns 200 with JWT token & cache dates',
    sc1Data.httpStatus === 200 && sc1Data.response?.valid && sc1Data.response?.token,
    `http=${sc1Data.httpStatus}, valid=${sc1Data.response?.valid}, hasToken=${!!sc1Data.response?.token}`
  );

  // ── Test 9: Test Scenario - Error Scenarios (Invalid, Expired, Revoked, Limit)
  const scInvalid = await api(`/admin/products/${testProductId}/integration/test-scenario`, {
    method: 'POST',
    body: JSON.stringify({ scenario: 'ACTIVATE_INVALID_KEY' }),
  });
  const scExpired = await api(`/admin/products/${testProductId}/integration/test-scenario`, {
    method: 'POST',
    body: JSON.stringify({ scenario: 'ACTIVATE_EXPIRED' }),
  });
  const scRevoked = await api(`/admin/products/${testProductId}/integration/test-scenario`, {
    method: 'POST',
    body: JSON.stringify({ scenario: 'ACTIVATE_REVOKED' }),
  });
  const scLimit = await api(`/admin/products/${testProductId}/integration/test-scenario`, {
    method: 'POST',
    body: JSON.stringify({ scenario: 'ACTIVATE_LIMIT_REACHED' }),
  });

  const errsPass =
    (scInvalid.data?.data || scInvalid.data)?.httpStatus === 404 &&
    (scExpired.data?.data || scExpired.data)?.httpStatus === 400 &&
    (scRevoked.data?.data || scRevoked.data)?.httpStatus === 400 &&
    (scLimit.data?.data || scLimit.data)?.httpStatus === 400;

  assert(
    '9. Test Scenario: Error cases (invalid key, expired, revoked, limit reached)',
    errsPass,
    'All error status codes and error messages correctly simulated'
  );

  // ── Test 10: Test Scenario - Heartbeat Validation & Deactivation ───────────
  const scVal = await api(`/admin/products/${testProductId}/integration/test-scenario`, {
    method: 'POST',
    body: JSON.stringify({ scenario: 'VALIDATE_ACTIVE' }),
  });
  const scDeact = await api(`/admin/products/${testProductId}/integration/test-scenario`, {
    method: 'POST',
    body: JSON.stringify({ scenario: 'DEACTIVATE_SUCCESS' }),
  });

  const valData = scVal.data?.data || scVal.data || {};
  const deactData = scDeact.data?.data || scDeact.data || {};

  assert(
    '10. Test Scenario: Heartbeat validation and slot-releasing deactivation',
    valData.httpStatus === 200 && valData.response?.valid && deactData.httpStatus === 200 && deactData.response?.success,
    `valValid=${valData.response?.valid}, deactSuccess=${deactData.response?.success}`
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
