/**
 * LicenseNest – License Revocation & Emergency Kill-Switch Test Suite
 * Validates instant product locks, mass suspensions, critical revocations, bulk actions, and audit logging.
 */

const BASE_URL = 'http://localhost:5000/api/v1';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

function pass(testName, detail = '') {
  console.log(`  ${colors.green}✅  ${testName}${colors.reset}  ${colors.cyan}${detail}${colors.reset}`);
}

function fail(testName, error) {
  console.log(`  ${colors.red}❌  ${testName}${colors.reset}`);
  console.error(`      ${colors.red}${error}${colors.reset}`);
}

async function request(url, options = {}) {
  const { headers, ...rest } = options;
  const res = await fetch(`${BASE_URL}${url}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

async function runEmergencySuite() {
  console.log(`\n${colors.bright}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}║   LicenseNest – Revocation & Kill-Switch Test Suite         ║${colors.reset}`);
  console.log(`${colors.bright}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  let passedTests = 0;
  const totalTests = 10;

  try {
    // 0. Login as admin
    const accounts = [
      { email: 'admin@example.com', password: 'Admin123456!' },
      { email: 'admin@licensenest.com', password: 'Admin123!' },
    ];
    let token = null;
    for (const acc of accounts) {
      const loginRes = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(acc),
      });
      if (loginRes.data?.data?.accessToken || loginRes.data?.accessToken) {
        token = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
        break;
      }
    }

    if (!token) {
      throw new Error('Admin login failed for all accounts');
    }

    const authHeaders = { Authorization: `Bearer ${token}` };

    // 0. Create a fresh test product
    const timestamp = Date.now();
    const productRes = await request('/admin/products/wizard', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `KillSwitch Target Product ${timestamp}`,
        slug: `killswitch-prod-${timestamp}`,
        description: 'Test product for emergency kill switch and revocation tests',
        productType: 'wordpress_plugin',
        currentVersion: '1.0.0',
      }),
    });

    const productPayload = productRes.data?.data || productRes.data;
    const product = productPayload?.product || productPayload;
    const productId = product?._id || product?.id;
    const cred = productPayload?.credential || {};
    const clientId = cred?.clientId || productPayload?.clientId;
    const apiKey = cred?.apiKey || productPayload?.apiKey;

    if (!productId) {
      throw new Error(`Failed to create product: ${JSON.stringify(productRes.data)}`);
    }

    const clientHeaders = {
      ...(clientId ? { 'x-client-id': clientId } : {}),
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    };

    // Create 3 active licenses for this product
    const lic1Res = await request('/admin/licenses', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId,
        customerEmail: 'admin@example.com',
        licenseType: 'regular',
        activationLimit: 5,
      }),
    });
    const lic2Res = await request('/admin/licenses', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId,
        customerEmail: 'admin@example.com',
        licenseType: 'regular',
        activationLimit: 5,
      }),
    });
    const lic3Res = await request('/admin/licenses', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId,
        customerEmail: 'admin@example.com',
        licenseType: 'regular',
        activationLimit: 5,
      }),
    });

    const getLic = (res) => (res.data?.data?.license || res.data?.data || res.data?.license || res.data);
    const lic1 = getLic(lic1Res);
    const lic2 = getLic(lic2Res);
    const lic3 = getLic(lic3Res);

    // Activate lic1 on a domain
    const act1Res = await request('/public/licenses/activate', {
      method: 'POST',
      headers: clientHeaders,
      body: JSON.stringify({
        productSlug: product.slug,
        licenseKey: lic1.licenseKey,
        domain: 'killswitch-site-alpha.com',
        installationId: 'inst-ks-alpha-001',
      }),
    });

    const act1Token = act1Res.data?.token || act1Res.data?.data?.token;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // -------------------------------------------------------------
    // Test 1: Emergency Kill-Switch - Disable New Activations
    // -------------------------------------------------------------
    try {
      const ksRes = await request(`/admin/emergency/products/${productId}/kill-switch`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          disableNewActivations: true,
          reason: 'Emergency lock: Suspicious wave of rapid activations detected.',
        }),
      });

      // Try to activate lic2
      const tryActRes = await request('/public/licenses/activate', {
        method: 'POST',
        headers: clientHeaders,
        body: JSON.stringify({
          productSlug: product.slug,
          licenseKey: lic2.licenseKey,
          domain: 'killswitch-site-beta.com',
          installationId: 'inst-ks-beta-002',
        }),
      });

      if (
        ksRes.ok &&
        tryActRes.status === 400 &&
        tryActRes.data?.code === 'PRODUCT_ACTIVATIONS_DISABLED'
      ) {
        pass('1. Product Kill-Switch: Disables new activations immediately', `(code=PRODUCT_ACTIVATIONS_DISABLED, msg="${tryActRes.data?.message?.slice(0, 40)}...")`);
        passedTests++;
      } else {
        fail('1. Product Kill-Switch: Disables new activations', JSON.stringify({ ksRes: ksRes.data, tryActRes: tryActRes.data }));
      }
    } catch (err) {
      fail('1. Product Kill-Switch: Disables new activations', err.message);
    }

    // -------------------------------------------------------------
    // Test 2: Emergency Kill-Switch - Disable Validation Heartbeat
    // -------------------------------------------------------------
    try {
      await request(`/admin/emergency/products/${productId}/kill-switch`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          disableNewActivations: false,
          disableValidation: true,
          reason: 'Security lockdown: Zero-day vulnerability under emergency audit.',
        }),
      });

      // Validate lic1 installation
      const valRes = await request('/public/licenses/validate', {
        method: 'POST',
        headers: clientHeaders,
        body: JSON.stringify({
          productSlug: product.slug,
          token: act1Token,
          domain: 'killswitch-site-alpha.com',
          installationId: 'inst-ks-alpha-001',
        }),
      });

      if (
        valRes.ok &&
        (valRes.data?.valid === false || valRes.data?.data?.valid === false) &&
        (valRes.data?.status === 'PRODUCT_VALIDATIONS_DISABLED' || valRes.data?.data?.status === 'PRODUCT_VALIDATIONS_DISABLED')
      ) {
        pass('2. Product Kill-Switch: Freezes license validation heartbeat', `(valid=false, status=PRODUCT_VALIDATIONS_DISABLED)`);
        passedTests++;
      } else {
        fail('2. Product Kill-Switch: Freezes license validation heartbeat', JSON.stringify(valRes.data));
      }
    } catch (err) {
      fail('2. Product Kill-Switch: Freezes license validation heartbeat', err.message);
    }

    // -------------------------------------------------------------
    // Test 3: Emergency Kill-Switch - Disable Updates & Downloads
    // -------------------------------------------------------------
    try {
      await request(`/admin/emergency/products/${productId}/kill-switch`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          disableValidation: false,
          disableUpdatesDownloads: true,
          reason: 'Release distribution halted due to critical hotfix verification.',
        }),
      });

      const updateRes = await request(`/public/products/${product.slug}/updates?currentVersion=1.0.0`, {
        method: 'GET',
        headers: {
          ...clientHeaders,
          'x-license-token': act1Token,
        },
      });

      if (updateRes.status === 403) {
        pass('3. Product Kill-Switch: Blocks releases, update checks & downloads', `(status=403, error="${updateRes.data?.message?.slice(0, 45)}...")`);
        passedTests++;
      } else {
        fail('3. Product Kill-Switch: Blocks releases & downloads', JSON.stringify(updateRes.data));
      }
    } catch (err) {
      fail('3. Product Kill-Switch: Blocks releases & downloads', err.message);
    }

    // -------------------------------------------------------------
    // Test 4: Mass Installation Action - Suspend All Active Installations
    // -------------------------------------------------------------
    try {
      const massRes = await request(`/admin/emergency/products/${productId}/kill-switch`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          disableValidation: false,
          disableUpdatesDownloads: false,
          suspendAllActiveInstallations: true,
          reason: 'Mass emergency suspension: API credential revocation in progress.',
        }),
      });

      // Next validation of act1 must return SUSPENDED
      const valRes = await request('/public/licenses/validate', {
        method: 'POST',
        headers: clientHeaders,
        body: JSON.stringify({
          productSlug: product.slug,
          token: act1Token,
          domain: 'killswitch-site-alpha.com',
          installationId: 'inst-ks-alpha-001',
        }),
      });

      const valData = valRes.data?.data || valRes.data;
      if (
        massRes.ok &&
        (valData?.valid === false) &&
        (valData?.status === 'SUSPENDED')
      ) {
        pass('4. Mass Installation Action: Suspends all active installations', `(status=SUSPENDED, valid=false)`);
        passedTests++;
      } else {
        fail('4. Mass Installation Action: Suspends all active installations', JSON.stringify({ massRes: massRes.data, valRes: valRes.data }));
      }
    } catch (err) {
      fail('4. Mass Installation Action: Suspends all active installations', err.message);
    }

    // -------------------------------------------------------------
    // Test 5: Mass Installation Action - Restore All Suspended Installations
    // -------------------------------------------------------------
    try {
      const restoreRes = await request(`/admin/emergency/products/${productId}/kill-switch`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          restoreAllInstallations: true,
          reason: 'Incident resolved: Safe operation confirmed across catalog.',
        }),
      });

      // Next validation of act1 must succeed
      const valRes = await request('/public/licenses/validate', {
        method: 'POST',
        headers: clientHeaders,
        body: JSON.stringify({
          productSlug: product.slug,
          token: act1Token,
          domain: 'killswitch-site-alpha.com',
          installationId: 'inst-ks-alpha-001',
        }),
      });

      const valData = valRes.data?.data || valRes.data;
      if (
        restoreRes.ok &&
        (valData?.valid === true) &&
        (valData?.status === 'ACTIVE')
      ) {
        pass('5. Mass Installation Action: Restores all suspended installations to active', `(valid=true, status=ACTIVE)`);
        passedTests++;
      } else {
        fail('5. Mass Installation Action: Restores all suspended installations', JSON.stringify({ restoreRes: restoreRes.data, valRes: valRes.data }));
      }
    } catch (err) {
      fail('5. Mass Installation Action: Restores all suspended installations', err.message);
    }

    // -------------------------------------------------------------
    // Test 6: Single License Instant Critical Revocation
    // -------------------------------------------------------------
    try {
      const lic1Id = lic1?._id || lic1?.id || lic1?.license?._id;
      const revokeRes = await request(`/admin/emergency/licenses/${lic1Id}/revoke`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          reason: 'Payment chargeback & unauthorized distribution on pirate hub.',
          critical: true,
        }),
      });

      const revData = revokeRes.data?.data || revokeRes.data;
      if (
        revokeRes.ok &&
        revData?.status === 'revoked' &&
        revData?.isCriticalRevoked === true
      ) {
        pass('6. Single License Instant Revocation: Revokes license with critical flag', `(licenseKey=${lic1.licenseKey}, isCriticalRevoked=true)`);
        passedTests++;
      } else {
        fail('6. Single License Instant Revocation', JSON.stringify(revokeRes.data));
      }
    } catch (err) {
      fail('6. Single License Instant Revocation', err.message);
    }

    // -------------------------------------------------------------
    // Test 7: Next Validation on Revoked License (Zero Grace Period)
    // -------------------------------------------------------------
    try {
      const valRes = await request('/public/licenses/validate', {
        method: 'POST',
        headers: clientHeaders,
        body: JSON.stringify({
          productSlug: product.slug,
          token: act1Token,
          domain: 'killswitch-site-alpha.com',
          installationId: 'inst-ks-alpha-001',
        }),
      });

      const valData = valRes.data?.data || valRes.data;
      if (
        valRes.ok &&
        valData?.valid === false &&
        valData?.status === 'REVOKED' &&
        valData?.isCriticalRevoked === true &&
        valData?.forceDeactivate === true
      ) {
        pass('7. Validation Enforcement: Immediate REVOKED status with forceDeactivate=true', `(valid=false, status=REVOKED, forceDeactivate=true)`);
        passedTests++;
      } else {
        fail('7. Validation Enforcement on Revoked License', JSON.stringify(valRes.data));
      }
    } catch (err) {
      fail('7. Validation Enforcement on Revoked License', err.message);
    }

    // -------------------------------------------------------------
    // Test 8: Single License Suspension and Subsequent Restoration
    // -------------------------------------------------------------
    try {
      const lic2Id = lic2?._id || lic2?.id || lic2?.license?._id;
      const suspRes = await request(`/admin/emergency/licenses/${lic2Id}/suspend`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          reason: 'Routine compliance verification pending identity check.',
        }),
      });

      const restRes = await request(`/admin/emergency/licenses/${lic2Id}/restore`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          reason: 'Identity verified; restoring active access.',
        }),
      });

      const suspData = suspRes.data?.data || suspRes.data;
      const restData = restRes.data?.data || restRes.data;

      if (
        suspRes.ok &&
        suspData?.status === 'suspended' &&
        restRes.ok &&
        restData?.status === 'active'
      ) {
        pass('8. Single License Lifecycle: Temporary suspension & clean restoration', `(suspended -> restored to active)`);
        passedTests++;
      } else {
        fail('8. Single License Lifecycle', JSON.stringify({ suspRes: suspRes.data, restRes: restRes.data }));
      }
    } catch (err) {
      fail('8. Single License Lifecycle', err.message);
    }

    // -------------------------------------------------------------
    // Test 9: Bulk Emergency Revocation Action
    // -------------------------------------------------------------
    try {
      const lic2Id = lic2?._id || lic2?.id || lic2?.license?._id;
      const lic3Id = lic3?._id || lic3?.id || lic3?.license?._id;
      const bulkRes = await request('/admin/emergency/bulk-revoke', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          licenseIds: [lic2Id, lic3Id],
          reason: 'Bulk leak detected in unauthorized GitLab mirror repository.',
          critical: true,
        }),
      });

      const bulkData = bulkRes.data?.data || bulkRes.data;
      if (
        bulkRes.ok &&
        bulkData?.revokedLicensesCount >= 2 &&
        bulkData?.isCriticalRevoked === true
      ) {
        pass('9. Bulk Emergency Action: Revokes multiple licenses & activations in batch', `(revokedCount=${bulkData?.revokedLicensesCount}, critical=true)`);
        passedTests++;
      } else {
        fail('9. Bulk Emergency Action', JSON.stringify(bulkRes.data));
      }
    } catch (err) {
      fail('9. Bulk Emergency Action', err.message);
    }

    // -------------------------------------------------------------
    // Test 10: Emergency Overview & Audit Log Trail Integrity
    // -------------------------------------------------------------
    try {
      const overRes = await request('/admin/emergency/overview', {
        method: 'GET',
        headers: authHeaders,
      });

      const overData = overRes.data?.data || overRes.data;
      const stats = overData?.stats;
      const logs = overData?.recentEmergencyLogs;

      if (
        overRes.ok &&
        stats?.totalRevokedLicenses >= 3 &&
        logs &&
        logs.length > 0 &&
        logs[0].actorEmail === 'admin@example.com'
      ) {
        pass('10. Emergency Overview & Audit Trail: Real-time telemetry & action logging', `(totalRevoked=${stats.totalRevokedLicenses}, recentLogsCount=${logs.length})`);
        passedTests++;
      } else {
        fail('10. Emergency Overview & Audit Trail', JSON.stringify(overRes.data));
      }
    } catch (err) {
      fail('10. Emergency Overview & Audit Trail', err.message);
    }

  } catch (err) {
    console.error(`${colors.red}Fatal suite failure: ${err.message}${colors.reset}`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n  ${colors.bright}Result: ${passedTests}/${totalTests} passed${colors.reset}\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runEmergencySuite();
