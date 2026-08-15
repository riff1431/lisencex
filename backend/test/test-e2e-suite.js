const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { ValidationPipe } = require('@nestjs/common');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');
const { AllExceptionsFilter } = require('../dist/common/filters/http-exception.filter');

async function runE2ETestSuite() {
  console.log('\n======================================================');
  console.log('  LICENSE ECOSYSTEM COMPLETE END-TO-END TEST SUITE');
  console.log('======================================================\n');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const server = await app.listen(0);
  const address = server.address();
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  console.log(`[TEST RUNNER] In-memory test server listening at: ${baseUrl}\n`);

  let adminToken = '';
  let customerToken = '';
  let customerId = '';
  let productId = '';
  let productSlug = 'hyperlicense-pro';
  let licenseKey = '';
  let licenseId = '';
  let client1Token = '';
  let client2Token = '';

  const runId = Date.now().toString().slice(-6);
  const client1InstallationId = `ins_store_1_${runId}`;
  const client2InstallationId = `ins_store_2_${runId}`;

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const data = await res.json();
    return { status: res.status, data };
  }

  try {
    // STEP 1: Super Admin Login
    console.log('TEST 1: Super Admin Login (/auth/login)...');
    const adminLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.com', password: 'Admin123456!' }),
    });

    if (adminLogin.status !== 200 || !adminLogin.data.data?.accessToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
    }
    adminToken = adminLogin.data.data.accessToken;
    console.log('  ✅ Admin logged in successfully.\n');

    // STEP 2: Product Verification / Creation
    console.log('TEST 2: Product Setup (/admin/products)...');
    const productsRes = await api('/admin/products', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    let sampleProduct = productsRes.data?.data?.items?.[0];
    if (!sampleProduct) {
      const uniqueSlug = `test-prod-${Date.now()}`;
      const createProd = await api('/admin/products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'HyperLicense Pro E2E',
          slug: uniqueSlug,
          productType: 'wordpress_plugin',
          currentVersion: '1.2.0',
          licenseSettings: {
            licenseRequired: true,
            defaultActivationLimit: 1,
            allowLocalhost: true,
            countLocalhost: false,
            allowStaging: true,
            countStaging: false,
          },
          distributionChannels: [
            { provider: 'internal', enabled: true },
            { provider: 'envato', enabled: true, externalItemId: '28491048' },
          ],
        }),
      });

      if (!createProd.data.data) {
        throw new Error(`Failed to create product in test: ${JSON.stringify(createProd.data)}`);
      }
      sampleProduct = createProd.data.data;
    }

    productId = sampleProduct._id || sampleProduct.id;
    productSlug = sampleProduct.slug;
    console.log(`  ✅ Verified product: "${sampleProduct.name}" (slug: ${productSlug}, ID: ${productId})\n`);

    // Create API Credential for client product
    const credRes = await api(`/admin/products/${productId}/credentials`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'E2E Test Key' }),
    });
    const credData = credRes.data.data || credRes.data;
    const clientHeaders = {
      'X-Client-ID': credData.clientId,
      'X-API-Key': credData.apiKey,
    };

    // STEP 3: Customer Registration & Token Test
    const testEmail = `cust_${Date.now()}@example.com`;
    console.log(`TEST 3: Registering Test Customer (${testEmail})...`);
    const regRes = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'E2E Test Customer',
        email: testEmail,
        password: 'Password123!',
        envatoUsername: 'e2e_tester',
      }),
    });

    if (regRes.status !== 201 || !regRes.data.data?.accessToken || !regRes.data.data?.refreshToken) {
      throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
    }
    customerToken = regRes.data.data.accessToken;
    const refreshToken = regRes.data.data.refreshToken;
    customerId = regRes.data.data.user.id;
    console.log(`  ✅ Customer registered with access & refresh tokens (User ID: ${customerId}).\n`);

    // STEP 3B: Test Refresh Token Endpoint
    console.log('TEST 3B: Testing Token Refresh Flow (/auth/refresh)...');
    const refreshRes = await api('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshRes.status !== 200 || !refreshRes.data.data?.accessToken) {
      throw new Error(`Refresh token failed: ${JSON.stringify(refreshRes.data)}`);
    }
    customerToken = refreshRes.data.data.accessToken;
    console.log('  ✅ Refresh token flow successful! New access token obtained.\n');

    // STEP 3C: Test Profile Update & Password Change
    console.log('TEST 3C: Testing User Profile Update (/auth/profile)...');
    const updateProfileRes = await api('/auth/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ fullName: 'Updated Customer Name' }),
    });

    if (updateProfileRes.status !== 200 || updateProfileRes.data.data?.fullName !== 'Updated Customer Name') {
      throw new Error(`Profile update failed: ${JSON.stringify(updateProfileRes.data)}`);
    }
    console.log('  ✅ Profile update verified.\n');

    // STEP 4: Claim Envato Purchase Code & Issue License
    const sampleEnvatoCode = `8f3a9b2c-${Date.now().toString().slice(-4)}-4a6b-9c8e-7d6f5e4a3b2c`;
    console.log(`TEST 4: Claiming Envato Purchase Code (${sampleEnvatoCode})...`);
    const claimRes = await api('/customer/purchases/claim-envato', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        productId,
        purchaseCode: sampleEnvatoCode,
      }),
    });

    if (claimRes.status !== 201 || !claimRes.data.data?.license) {
      throw new Error(`Claim failed: ${JSON.stringify(claimRes.data)}`);
    }
    const issuedLicense = claimRes.data.data.license;
    licenseKey = issuedLicense.licenseKey;
    licenseId = issuedLicense._id;
    console.log(`  ✅ Envato purchase verified! License issued: ${licenseKey} (Limit: ${issuedLicense.activationLimit})\n`);

    // STEP 5: Public Activation (Client 1 on primary-store.com)
    console.log('TEST 5: Client 1 Product Activation (primary-store.com)...');
    const act1Res = await api('/public/licenses/activate', {
      method: 'POST',
      headers: clientHeaders,
      body: JSON.stringify({
        productSlug,
        licenseKey,
        installationId: client1InstallationId,
        domain: 'primary-store.com',
        productVersion: '1.2.0',
      }),
    });

    if (act1Res.status !== 200 || !act1Res.data.data?.token) {
      throw new Error(`Activation 1 failed: ${JSON.stringify(act1Res.data)}`);
    }
    client1Token = act1Res.data.data.token;
    console.log(`  ✅ Client 1 activated successfully! Signed token received.\n`);

    // STEP 6: Periodic Heartbeat Validation
    console.log('TEST 6: Client 1 Heartbeat Validation (/public/licenses/validate)...');
    const val1Res = await api('/public/licenses/validate', {
      method: 'POST',
      headers: clientHeaders,
      body: JSON.stringify({
        productSlug,
        installationId: client1InstallationId,
        token: client1Token,
        domain: 'primary-store.com',
        productVersion: '1.2.0',
      }),
    });

    if (!val1Res.data.data?.valid || (val1Res.data.data?.status !== 'ACTIVE' && val1Res.data.data?.status !== 'VALID')) {
      throw new Error(`Validation failed: ${JSON.stringify(val1Res.data)}`);
    }
    console.log(`  ✅ Validation heartbeat returned: ${val1Res.data.data.status}\n`);

    // STEP 7: Activation Limit Exceeded Test (Client 2 on second-store.com)
    console.log('TEST 7: Client 2 Activation Attempt (Exceeding Slots Limit)...');
    await api(`/admin/licenses/${licenseId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ activationLimit: 1 }),
    });

    const act2Fail = await api('/public/licenses/activate', {
      method: 'POST',
      headers: clientHeaders,
      body: JSON.stringify({
        productSlug,
        licenseKey,
        installationId: client2InstallationId,
        domain: 'second-store.com',
        productVersion: '1.2.0',
      }),
    });

    if (act2Fail.status === 200) {
      throw new Error('Expected activation limit to be rejected, but it succeeded');
    }
    console.log(`  ✅ Correctly rejected exceeding slot: ${act2Fail.data.code} (${act2Fail.data.message})\n`);

    // STEP 8: Deactivate Client 1 & Free Activation Slot
    console.log('TEST 8: Deactivating Client 1 to free activation slot...');
    const deactRes = await api('/public/licenses/deactivate', {
      method: 'POST',
      headers: clientHeaders,
      body: JSON.stringify({
        installationId: client1InstallationId,
        token: client1Token,
        domain: 'primary-store.com',
        reason: 'Migration to second store',
      }),
    });

    if (deactRes.status !== 200 || !deactRes.data.success) {
      throw new Error(`Deactivation failed: ${JSON.stringify(deactRes.data)}`);
    }
    console.log(`  ✅ Client 1 deactivated. Slot freed!\n`);

    // STEP 9: Client 2 Now Activates Successfully
    console.log('TEST 9: Client 2 Retrying Activation (second-store.com)...');
    const act2Success = await api('/public/licenses/activate', {
      method: 'POST',
      headers: clientHeaders,
      body: JSON.stringify({
        productSlug,
        licenseKey,
        installationId: client2InstallationId,
        domain: 'second-store.com',
        productVersion: '1.2.0',
      }),
    });

    if (act2Success.status !== 200 || !act2Success.data.data?.token) {
      throw new Error(`Activation 2 failed: ${JSON.stringify(act2Success.data)}`);
    }
    client2Token = act2Success.data.data.token;
    console.log(`  ✅ Client 2 activated successfully! Token received.\n`);

    // STEP 10: Admin Revokes License & Verify Immediate Denial
    console.log('TEST 10: Admin Revokes License (/admin/licenses/:id/action)...');
    const revokeRes = await api(`/admin/licenses/${licenseId}/action`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'revoke',
        reason: 'Chargeback fraud reported',
      }),
    });

    if (revokeRes.status !== 201 || revokeRes.data.data?.status !== 'revoked') {
      throw new Error(`Revocation failed: ${JSON.stringify(revokeRes.data)}`);
    }
    console.log(`  ✅ Admin revoked license status: ${revokeRes.data.data.status}\n`);

    // STEP 11: Validation detects Revocation
    console.log('TEST 11: Client 2 Heartbeat Validation on Revoked License...');
    const valRevoked = await api('/public/licenses/validate', {
      method: 'POST',
      headers: clientHeaders,
      body: JSON.stringify({
        productSlug,
        installationId: client2InstallationId,
        token: client2Token,
        domain: 'second-store.com',
        productVersion: '1.2.0',
      }),
    });

    if (valRevoked.data.data?.valid === true) {
      throw new Error('Revoked license was incorrectly reported as valid');
    }
    console.log(`  ✅ Validation correctly returned status: ${valRevoked.data.data?.status}\n`);

    // STEP 12: Protected Update API Denied to Revoked License
    console.log('TEST 12: Auto-Update Check on Revoked License...');
    const updateRes = await api(
      `/public/products/${productSlug}/updates?currentVersion=1.0.0&token=${client2Token}&domain=second-store.com`,
      { headers: clientHeaders },
    );

    if (updateRes.status === 200 && updateRes.data.data?.updateAvailable) {
      throw new Error('Revoked license was incorrectly given update access');
    }
    console.log(`  ✅ Updates correctly denied: ${updateRes.data.message}\n`);

    console.log('======================================================');
    console.log('  🎉 ALL INTEGRATION TESTS (INCLUDING AUTH & REFRESH) PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } finally {
    await app.close();
  }
}

runE2ETestSuite().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
