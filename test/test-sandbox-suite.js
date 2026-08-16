/**
 * =========================================================================
 *  LicenseNest – Developer Sandbox & Test License Environment Test Suite
 * =========================================================================
 *
 * Tests:
 *  1. Sandbox overview endpoint returns dedicated test credentials & endpoints
 *  2. Pre-generates all 6 sandbox scenario keys (valid, expired, revoked, suspended, limit1, envato)
 *  3. Test Scenario 1: TEST_VALID activation succeeds with signed sandbox token
 *  4. Test Scenario 2: License validation heartbeat succeeds on sandbox endpoint
 *  5. Test Scenario 3: TEST_EXPIRED rejection with LICENSE_EXPIRED code
 *  6. Test Scenario 4: TEST_REVOKED rejection with LICENSE_REVOKED code
 *  7. Test Scenario 5: TEST_SUSPEND rejection with LICENSE_SUSPENDED code
 *  8. Test Scenario 6: TEST_LIMIT1 quota enforcement (rejects second domain)
 *  9. Test Scenario 7: Sandbox deactivation releases activation slot
 * 10. Sandbox Data Reset endpoint clears test activations and restores quota
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api/v1';

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
  console.log('║    LicenseNest – Developer Sandbox Environment Test Suite   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const authed = await loginAdmin();
  if (!authed) {
    console.error('Failed to log in as admin.');
    process.exit(1);
  }

  // Create product for sandbox testing
  const timestamp = Date.now();
  const prodRes = await api('/admin/products/wizard', {
    method: 'POST',
    body: JSON.stringify({
      name: `Sandbox App ${timestamp}`,
      slug: `sandbox-app-${timestamp}`,
      productType: 'nextjs_app',
      description: 'Product for sandbox environment automated testing',
      currentVersion: '1.2.0',
    }),
  });

  const product = (prodRes.data?.data || prodRes.data)?.product;
  const productId = product?._id;
  const productSlug = product?.slug;

  if (!productId) {
    console.error('Failed to create test product');
    process.exit(1);
  }

  // ── Test 1: Fetch Sandbox Overview ─────────────────────────────────────────
  const sandRes = await api(`/admin/products/${productId}/sandbox`);
  const sandData = sandRes.data?.data || sandRes.data || {};

  assert(
    '1. Sandbox overview returns dedicated test credentials & endpoints',
    sandRes.status < 300 &&
      sandData.credentials?.clientId?.startsWith('client_test_') &&
      sandData.credentials?.apiKey?.startsWith('pk_test_') &&
      sandData.endpoints?.activateUrl?.includes('/public/sandbox/licenses/activate'),
    `clientId=${sandData.credentials?.clientId}, activateUrl=${sandData.endpoints?.activateUrl}`
  );

  // ── Test 2: Check Scenario Keys ────────────────────────────────────────────
  const scenarios = sandData.scenarios || [];
  const expectedTypes = ['valid', 'expired', 'revoked', 'suspended', 'limit1', 'envato'];
  const hasAllScenarios = expectedTypes.every((t) => scenarios.some((s) => s.type === t));

  assert(
    '2. Pre-generates all 6 sandbox scenario keys (valid, expired, revoked, suspended, limit1, envato)',
    hasAllScenarios && scenarios.length === 6,
    `Found scenarios: ${scenarios.map((s) => s.type).join(', ')}`
  );

  const validKey = scenarios.find((s) => s.type === 'valid')?.key;
  const expiredKey = scenarios.find((s) => s.type === 'expired')?.key;
  const revokedKey = scenarios.find((s) => s.type === 'revoked')?.key;
  const suspendedKey = scenarios.find((s) => s.type === 'suspended')?.key;
  const limit1Key = scenarios.find((s) => s.type === 'limit1')?.key;

  // ── Test 3: TEST_VALID Activation ──────────────────────────────────────────
  const act1Res = await api('/public/sandbox/licenses/activate', {
    method: 'POST',
    body: JSON.stringify({
      licenseKey: validKey,
      productSlug,
      installationId: 'ins_sand_dev_1',
      domain: 'sandbox-dev.local',
    }),
    skipAuth: true,
  });

  const act1Data = act1Res.data?.data || act1Res.data || {};
  assert(
    '3. Test Scenario 1: TEST_VALID activation succeeds with signed sandbox token',
    act1Res.status < 300 && act1Data.valid === true && act1Data.isSandbox === true && act1Data.token?.length > 20,
    `valid=${act1Data.valid}, isSandbox=${act1Data.isSandbox}, status=${act1Data.status}`
  );

  const sandboxToken = act1Data.token;

  // ── Test 4: License Validation Heartbeat ───────────────────────────────────
  const valRes = await api('/public/sandbox/licenses/validate', {
    method: 'POST',
    body: JSON.stringify({
      token: sandboxToken,
      productSlug,
      installationId: 'ins_sand_dev_1',
      domain: 'sandbox-dev.local',
    }),
    skipAuth: true,
  });

  const valData = valRes.data?.data || valRes.data || {};
  assert(
    '4. Test Scenario 2: License validation heartbeat succeeds on sandbox endpoint',
    valRes.status < 300 && valData.valid === true && valData.isSandbox === true,
    `valid=${valData.valid}, status=${valData.status}`
  );

  // ── Test 5: TEST_EXPIRED Rejection ─────────────────────────────────────────
  const expRes = await api('/public/sandbox/licenses/activate', {
    method: 'POST',
    body: JSON.stringify({
      licenseKey: expiredKey,
      productSlug,
      installationId: 'ins_sand_dev_exp',
      domain: 'sandbox-dev.local',
    }),
    skipAuth: true,
  });

  const expData = expRes.data?.data || expRes.data || {};
  assert(
    '5. Test Scenario 3: TEST_EXPIRED rejection with LICENSE_EXPIRED code',
    expRes.status === 400 && (expRes.data?.code === 'LICENSE_EXPIRED' || expData?.code === 'LICENSE_EXPIRED'),
    `status=${expRes.status}, code=${expRes.data?.code || expData?.code}`
  );

  // ── Test 6: TEST_REVOKED Rejection ─────────────────────────────────────────
  const revRes = await api('/public/sandbox/licenses/activate', {
    method: 'POST',
    body: JSON.stringify({
      licenseKey: revokedKey,
      productSlug,
      installationId: 'ins_sand_dev_rev',
      domain: 'sandbox-dev.local',
    }),
    skipAuth: true,
  });

  const revData = revRes.data?.data || revRes.data || {};
  assert(
    '6. Test Scenario 4: TEST_REVOKED rejection with LICENSE_REVOKED code',
    revRes.status === 400 && (revRes.data?.code === 'LICENSE_REVOKED' || revData?.code === 'LICENSE_REVOKED'),
    `status=${revRes.status}, code=${revRes.data?.code || revData?.code}`
  );

  // ── Test 7: TEST_SUSPEND Rejection ─────────────────────────────────────────
  const suspRes = await api('/public/sandbox/licenses/activate', {
    method: 'POST',
    body: JSON.stringify({
      licenseKey: suspendedKey,
      productSlug,
      installationId: 'ins_sand_dev_susp',
      domain: 'sandbox-dev.local',
    }),
    skipAuth: true,
  });

  const suspData = suspRes.data?.data || suspRes.data || {};
  assert(
    '7. Test Scenario 5: TEST_SUSPEND rejection with LICENSE_SUSPENDED code',
    suspRes.status === 400 && (suspRes.data?.code === 'LICENSE_SUSPENDED' || suspData?.code === 'LICENSE_SUSPENDED'),
    `status=${suspRes.status}, code=${suspRes.data?.code || suspData?.code}`
  );

  // ── Test 8: TEST_LIMIT1 Quota Enforcement ──────────────────────────────────
  const lim1Res = await api('/public/sandbox/licenses/activate', {
    method: 'POST',
    body: JSON.stringify({
      licenseKey: limit1Key,
      productSlug,
      installationId: 'ins_sand_limit_1',
      domain: 'first-site.local',
    }),
    skipAuth: true,
  });

  const lim2Res = await api('/public/sandbox/licenses/activate', {
    method: 'POST',
    body: JSON.stringify({
      licenseKey: limit1Key,
      productSlug,
      installationId: 'ins_sand_limit_2',
      domain: 'second-site.local',
    }),
    skipAuth: true,
  });

  const lim2Data = lim2Res.data?.data || lim2Res.data || {};
  assert(
    '8. Test Scenario 6: TEST_LIMIT1 quota enforcement (rejects second domain)',
    lim1Res.status < 300 && lim2Res.status === 400 && (lim2Res.data?.code === 'ACTIVATION_LIMIT_REACHED' || lim2Data?.code === 'ACTIVATION_LIMIT_REACHED'),
    `firstHttp=${lim1Res.status}, secondHttp=${lim2Res.status}, code=${lim2Res.data?.code || lim2Data?.code}`
  );

  // ── Test 9: Sandbox Deactivation ───────────────────────────────────────────
  const deactRes = await api('/public/sandbox/licenses/deactivate', {
    method: 'POST',
    body: JSON.stringify({
      installationId: 'ins_sand_limit_1',
      domain: 'first-site.local',
    }),
    skipAuth: true,
  });

  const deactData = deactRes.data?.data || deactRes.data || {};
  assert(
    '9. Test Scenario 7: Sandbox deactivation releases activation slot',
    deactRes.status < 300 && (deactRes.data?.success === true || deactData?.success === true),
    `success=${deactRes.data?.success || deactData?.success}`
  );

  // ── Test 10: Sandbox Data Reset ────────────────────────────────────────────
  const resetRes = await api(`/admin/products/${productId}/sandbox/reset`, {
    method: 'POST',
  });

  const postResetOverview = await api(`/admin/products/${productId}/sandbox`);
  const postResetData = postResetOverview.data?.data || postResetOverview.data || {};

  assert(
    '10. Sandbox Data Reset clears all test activations and restores quota',
    resetRes.status < 300 && postResetData.stats?.activeSandboxActivations === 0,
    `clearedCount=${resetRes.data?.activationsCleared || resetRes.data?.data?.activationsCleared}, activeActivations=${postResetData.stats?.activeSandboxActivations}`
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
