/**
 * =========================================================================
 *  LicenseNest – License Integration Verification & Certification Tests
 * =========================================================================
 *
 * Tests:
 *  1. Verification overview endpoint returns integration status and history
 *  2. Execute 13-point verification suite in Testing environment
 *  3. Verification of all 13 required test items:
 *     - Valid activation
 *     - Invalid license key
 *     - Duplicate activation (idempotency)
 *     - Activation limit reached
 *     - Domain mismatch
 *     - Installation mismatch
 *     - License validation heartbeat
 *     - Suspended license handling
 *     - Revoked license handling
 *     - Expired license handling
 *     - Installation deactivation
 *     - Slot reactivation
 *     - Auto-update authorization
 *  4. Official Certificate generation (Certificate ID, 100% score, isCertified)
 *  5. Status flow advancement: Transitions product to 'verified'
 *  6. Environment support: Runs successfully across Development, Testing, Production
 *  7. Verification history tracking & auditing
 *  8. Production Ready Gate: Rejects certifying unverified products (HTTP 400)
 *  9. Production Ready Certification: Marks verified product as 'production_ready'
 * 10. Diagnostics integrity: Request/response payloads & suggested fixes included
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
  console.log('║   LicenseNest – Verification & Certification Test Suite     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const authed = await loginAdmin();
  if (!authed) {
    console.error('Failed to log in as admin.');
    process.exit(1);
  }

  // Create product for verification testing
  const timestamp = Date.now();
  const prodRes = await api('/admin/products/wizard', {
    method: 'POST',
    body: JSON.stringify({
      name: `Verification Suite Product ${timestamp}`,
      slug: `verify-suite-${timestamp}`,
      productType: 'wordpress_plugin',
      description: 'Test product for verification and certification system',
      currentVersion: '4.0.0',
    }),
  });

  const product = (prodRes.data?.data || prodRes.data)?.product;
  const productId = product?._id;

  if (!productId) {
    console.error('Failed to create test product');
    process.exit(1);
  }

  // ── Test 1: Get Verification Overview ──────────────────────────────────────
  const overRes = await api(`/admin/products/${productId}/verify`);
  const overData = overRes.data?.data || overRes.data || {};
  assert(
    '1. Verification overview endpoint returns integration status and history',
    overRes.status < 300 && overData.productId === productId,
    `status=${overData.integrationStatus}, hasHistory=${Array.isArray(overData.history)}`
  );

  // ── Test 2: Run 13-Point Verification Suite ────────────────────────────────
  const verifyRes = await api(`/admin/products/${productId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ environment: 'testing' }),
  });
  const certData = verifyRes.data?.data || verifyRes.data || {};
  const testItems = certData.results || [];

  assert(
    '2. Execute 13-point verification suite in Testing environment',
    verifyRes.status < 300 && testItems.length === 13 && certData.passedCount === 13,
    `passed=${certData.passedCount}/${certData.totalTests}, score=${certData.scorePercentage}%`
  );

  // ── Test 3: Verification of all 13 Test Items ──────────────────────────────
  const requiredTestIds = [
    'valid_activation',
    'invalid_license_key',
    'duplicate_activation',
    'activation_limit_reached',
    'domain_mismatch',
    'installation_mismatch',
    'license_validation',
    'suspended_license',
    'revoked_license',
    'expired_license',
    'deactivation',
    'reactivation',
    'update_authorization',
  ];

  const all13Present = requiredTestIds.every((id) =>
    testItems.some((t) => t.id === id && t.status === 'passed')
  );

  assert(
    '3. All 13 required test scenarios passed (activation, security, lifecycle, updates)',
    all13Present,
    `Tested IDs: ${requiredTestIds.join(', ')}`
  );

  // ── Test 4: Official Certificate Generation ────────────────────────────────
  assert(
    '4. Official Certificate generation with score, ID & certified badge',
    certData.certificationId?.startsWith('CERT-') && certData.isCertified === true && certData.scorePercentage === 100,
    `certId=${certData.certificationId}, verifiedBy=${certData.verifiedBy}`
  );

  // ── Test 5: Status Flow Advancement to 'verified' ──────────────────────────
  const postVerifyOver = await api(`/admin/products/${productId}/verify`);
  const postVerifyData = postVerifyOver.data?.data || postVerifyOver.data || {};

  assert(
    '5. Status flow advancement: Automatically transitions to "verified"',
    postVerifyData.integrationStatus === 'verified',
    `integrationStatus=${postVerifyData.integrationStatus}`
  );

  // ── Test 6: Environment Support (Development, Testing, Production) ─────────
  const devRes = await api(`/admin/products/${productId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ environment: 'development' }),
  });
  const devData = devRes.data?.data || devRes.data || {};

  const prodVerifyRes = await api(`/admin/products/${productId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ environment: 'production' }),
  });
  const prodVerifyData = prodVerifyRes.data?.data || prodVerifyRes.data || {};

  assert(
    '6. Multi-environment support (Development, Testing, Production)',
    devData.environment === 'development' && prodVerifyData.environment === 'production',
    `devScore=${devData.scorePercentage}%, prodScore=${prodVerifyData.scorePercentage}%`
  );

  // ── Test 7: Verification History Tracking ──────────────────────────────────
  const histOver = await api(`/admin/products/${productId}/verify`);
  const histData = histOver.data?.data || histOver.data || {};
  assert(
    '7. Verification history tracking & auditing per product',
    histData.history?.length >= 3,
    `historyEntriesCount=${histData.history?.length}`
  );

  // ── Test 8: Production Ready Gate (Unverified Product Blocked) ──────────────
  const unverifiedProdRes = await api('/admin/products/wizard', {
    method: 'POST',
    body: JSON.stringify({
      name: `Unverified Product ${timestamp}`,
      slug: `unverified-${timestamp}`,
      productType: 'php_script',
    }),
  });
  const unverifiedId = (unverifiedProdRes.data?.data || unverifiedProdRes.data)?.product?._id;

  const blockedCertifyRes = await api(`/admin/products/${unverifiedId}/certify`, {
    method: 'POST',
  });

  assert(
    '8. Production Ready Gate: Blocks certifying unverified products',
    blockedCertifyRes.status === 400,
    `status=${blockedCertifyRes.status}, error="${(blockedCertifyRes.data?.message || '').slice(0, 45)}..."`
  );

  // ── Test 9: Production Ready Certification (Verified Product) ──────────────
  const certifyRes = await api(`/admin/products/${productId}/certify`, {
    method: 'POST',
  });
  const certifyData = certifyRes.data?.data || certifyRes.data || {};

  assert(
    '9. Production Ready Certification: Marks verified product as "production_ready"',
    certifyRes.status < 300 && certifyData.integrationStatus === 'production_ready',
    `status=${certifyData.integrationStatus}, message="${certifyData.message}"`
  );

  // ── Test 10: Diagnostics Integrity & Suggested Fixes ───────────────────────
  const hasPayloads = testItems.every((t) => t.requestPayload && t.responsePayload && t.durationMs >= 0);
  const sampleTest = testItems[0];

  assert(
    '10. Diagnostics integrity: Request/response payloads & duration recorded',
    hasPayloads,
    `sample=${sampleTest.id}, duration=${sampleTest.durationMs}ms, expected="${sampleTest.expectedResult.slice(0, 30)}..."`
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
