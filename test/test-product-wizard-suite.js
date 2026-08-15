/**
 * =========================================================================
 *  LicenseNest – Developer Product Registration & Wizard Test Suite
 * =========================================================================
 *
 * Tests:
 *  1. Register product through wizard with automated slug, SKU, & rules
 *  2. Auto-provisions Client ID, API Key, Public Verification Key & Sandbox License
 *  3. Initial checklist state is configured correctly
 *  4. API Test Console: Activation test execution & checklist advancement
 *  5. API Test Console: Heartbeat validation test execution & checklist advancement
 *  6. API Test Console: Update checker test execution & checklist advancement
 *  7. API Test Console: Deactivation test execution & checklist advancement
 *  8. Production Gate Enforcement: Rejects finalization if required tests not run
 *  9. Finalize Wizard: Successfully transitions product to Production Ready after tests pass
 * 10. Multi-product type wizard support (WP Plugin, WP Theme, PHP, Next.js App/Plugin)
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
  console.log('║   LicenseNest – Product Registration Wizard Test Suite      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const authed = await loginAdmin();
  if (!authed) {
    console.error('Failed to log in as admin.');
    process.exit(1);
  }

  // ── Test 1: Register Product via Wizard ─────────────────────────────────────
  const timestamp = Date.now();
  const regRes = await api('/admin/products/wizard', {
    method: 'POST',
    body: JSON.stringify({
      name: `WooCommerce Cart Optimizer Pro ${timestamp}`,
      slug: `woo-cart-optimizer-${timestamp}`,
      productType: 'wordpress_plugin',
      description: 'High performance cart optimizer for WordPress ecommerce stores',
      currentVersion: '2.1.0',
      price: 79,
      licenseSettings: {
        defaultActivationLimit: 3,
        validationIntervalHours: 24,
        offlineGracePeriodDays: 7,
        allowLocalhost: true,
        countLocalhost: false,
        allowStaging: true,
        countStaging: false,
        domainBinding: true,
        installationBinding: true,
        allowDeactivation: true,
        automaticUpdatesEnabled: true,
        downloadsEnabled: true,
      },
    }),
  });

  const regData = regRes.data?.data || regRes.data || {};
  const product1 = regData.product;
  const cred1 = regData.credential;

  assert(
    '1. Register product through wizard with automated parameters',
    regRes.status < 300 && product1?._id && product1?.slug?.includes('woo-cart-optimizer'),
    `id=${product1?._id}, slug=${product1?.slug}`
  );

  // ── Test 2: Auto-Provisioned Credentials & Test License ────────────────────
  assert(
    '2. Auto-provisions Client ID, API Key & Sandbox License',
    cred1?.clientId?.startsWith('client_') && cred1?.apiKey?.startsWith('pk_live_') && regData.testLicenseKey?.startsWith('LIC-'),
    `clientId=${cred1?.clientId?.slice(0, 15)}..., testKey=${regData.testLicenseKey}`
  );

  // ── Test 3: Initial Checklist State ────────────────────────────────────────
  const chk1 = regData.checklist || {};
  assert(
    '3. Initial checklist state is configured correctly',
    chk1.productCreated === true && chk1.apiConfigured === true && chk1.productionReady === false,
    `created=${chk1.productCreated}, apiConfigured=${chk1.apiConfigured}, prodReady=${chk1.productionReady}`
  );

  // ── Test 4: Test Console - Activate Test ───────────────────────────────────
  const actRes = await api(`/admin/products/wizard/${product1._id}/test`, {
    method: 'POST',
    body: JSON.stringify({
      testType: 'activate',
      licenseKey: regData.testLicenseKey,
      domain: 'test-site.example.com',
    }),
  });
  const actData = actRes.data?.data || actRes.data || {};
  assert(
    '4. API Test Console: Activate test passes and updates checklist',
    actRes.status < 300 && actData.checklist?.activationTested === true && actData.checklist?.sdkIntegrated === true,
    `actTested=${actData.checklist?.activationTested}, sdkIntegrated=${actData.checklist?.sdkIntegrated}`
  );

  // ── Test 5: Test Console - Validate Test ───────────────────────────────────
  const valRes = await api(`/admin/products/wizard/${product1._id}/test`, {
    method: 'POST',
    body: JSON.stringify({
      testType: 'validate',
      domain: 'test-site.example.com',
    }),
  });
  const valData = valRes.data?.data || valRes.data || {};
  assert(
    '5. API Test Console: Heartbeat validation test passes and updates checklist',
    valRes.status < 300 && valData.checklist?.validationTested === true,
    `valTested=${valData.checklist?.validationTested}`
  );

  // ── Test 6: Test Console - Check Update Test ───────────────────────────────
  const updRes = await api(`/admin/products/wizard/${product1._id}/test`, {
    method: 'POST',
    body: JSON.stringify({
      testType: 'checkUpdate',
      domain: 'test-site.example.com',
    }),
  });
  const updData = updRes.data?.data || updRes.data || {};
  assert(
    '6. API Test Console: Update checker test passes',
    updRes.status < 300 && updData.checklist?.updateTested === true,
    `updateTested=${updData.checklist?.updateTested}`
  );

  // ── Test 7: Test Console - Deactivation Test ───────────────────────────────
  const deactRes = await api(`/admin/products/wizard/${product1._id}/test`, {
    method: 'POST',
    body: JSON.stringify({
      testType: 'deactivate',
      domain: 'test-site.example.com',
    }),
  });
  const deactData = deactRes.data?.data || deactRes.data || {};
  assert(
    '7. API Test Console: Deactivation test passes and releases slot',
    deactRes.status < 300 && deactData.checklist?.deactivationTested === true,
    `deactTested=${deactData.checklist?.deactivationTested}`
  );

  // ── Test 8: Production Gate Enforcement ────────────────────────────────────
  // Create an untested second product
  const unTestedRes = await api('/admin/products/wizard', {
    method: 'POST',
    body: JSON.stringify({
      name: `Untested Draft Plugin ${timestamp}`,
      slug: `untested-plugin-${timestamp}`,
      productType: 'wordpress_plugin',
    }),
  });
  const unTestedId = (unTestedRes.data?.data || unTestedRes.data)?.product?._id;

  // Try to finalize before running tests -> must be blocked
  const blockedFinRes = await api(`/admin/products/wizard/${unTestedId}/finalize`, {
    method: 'POST',
  });

  assert(
    '8. Production Gate Enforcement: Blocks finalization if tests not run',
    blockedFinRes.status === 400,
    `status=${blockedFinRes.status}, error="${(blockedFinRes.data?.message || blockedFinRes.data?.data?.message || '').slice(0, 50)}..."`
  );

  // ── Test 9: Finalize Wizard (Tests Passed) ──────────────────────────────────
  const finalizeRes = await api(`/admin/products/wizard/${product1._id}/finalize`, {
    method: 'POST',
  });
  const finData = finalizeRes.data?.data || finalizeRes.data || {};
  assert(
    '9. Finalize Wizard: Successfully transitions product to Production Ready',
    finalizeRes.status < 300 && finData.checklist?.productionReady === true && finData.product?.integrationStatus === 'production_ready',
    `status=${finData.product?.integrationStatus}, prodReady=${finData.checklist?.productionReady}`
  );

  // ── Test 10: Multi-Product Type Wizard Registration ────────────────────────
  const typesToTest = ['php_script', 'nextjs_app', 'nextjs_plugin', 'wordpress_theme'];
  let multiPass = true;
  for (const pType of typesToTest) {
    const res = await api('/admin/products/wizard', {
      method: 'POST',
      body: JSON.stringify({
        name: `Wizard Test for ${pType} ${timestamp}`,
        slug: `wiz-${pType.replace(/_/g, '-')}-${timestamp}`,
        productType: pType,
      }),
    });
    if (res.status >= 300 || !(res.data?.data || res.data)?.product?._id) {
      multiPass = false;
      break;
    }
  }

  assert(
    '10. Supports all product types (PHP, Next.js App, Next.js Plugin, WP Theme)',
    multiPass,
    'All platform product types registered successfully'
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
