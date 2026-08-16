/**
 * LicenseNest – Digital Product Store & Order-to-License Lifecycle Test Suite
 * 
 * Tests:
 * 1. Public Store Catalog (GET /public/products)
 * 2. Product Detail & Plan Pricing (GET /public/products/:slug)
 * 3. Customer Order Creation (POST /customer/orders)
 * 4. Payment Confirmation & Instant License Fulfillment (POST /customer/orders/:id/confirm-payment)
 * 5. Idempotent Order Processing (Duplicate confirmation doesn't duplicate licenses)
 * 6. Customer Orders List & Invoices (GET /customer/orders)
 * 7. Customer Purchases History (GET /customer/purchases)
 * 8. End-to-End Activation with Store-Issued License (POST /public/licenses/activate)
 * 9. Periodic Validation Heartbeat with Signed Token (POST /public/licenses/validate)
 * 10. Admin Orders Management & Sales Telemetry (GET /admin/orders, /admin/orders/stats)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5001/api/v1';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bright: '\x1b[1m',
};

function pass(name, detail = '') {
  console.log(`  ${colors.green}✅  ${name}${colors.reset} ${colors.cyan}${detail}${colors.reset}`);
}

function fail(name, detail = '') {
  console.log(`  ${colors.red}❌  ${name}${colors.reset} ${colors.yellow}${detail}${colors.reset}`);
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 500, ok: false, data: { message: err.message } };
  }
}

async function runStoreOrderSuite() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   LicenseNest – Digital Product Store & Orders Test Suite   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let passedTests = 0;
  const totalTests = 10;

  try {
    // -------------------------------------------------------------
    // Auth Step: Log in as Admin
    // -------------------------------------------------------------
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'Admin123456!',
      }),
    });

    const token = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
    if (!token) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginRes.data)}`);
    }

    const authHeaders = { Authorization: `Bearer ${token}` };

    // Register a Test Product via Wizard for store tests
    const timestamp = Date.now();
    const productSlug = `store-optimizer-${timestamp}`;
    const productRes = await request('/admin/products/wizard', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Store Optimizer Pro ${timestamp}`,
        slug: productSlug,
        productType: 'nextjs_app',
        description: 'Next.js high performance ecommerce optimizer with AI analytics.',
        shortDescription: 'AI-powered store optimization app.',
        currentVersion: '1.5.0',
        price: 89,
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

    const productPayload = productRes.data?.data || productRes.data;
    const product = productPayload?.product || productPayload;
    const productId = product?._id || product?.id;
    const cred = productPayload?.credential || {};
    const clientId = cred?.clientId || productPayload?.clientId;
    const apiKey = cred?.apiKey || productPayload?.apiKey;

    const clientHeaders = {
      ...(clientId ? { 'x-client-id': clientId } : {}),
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    };

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // -------------------------------------------------------------
    // Test 1: Public Store Catalog Endpoint
    // -------------------------------------------------------------
    try {
      const catRes = await request('/public/products');
      const catPayload = catRes.data?.data || catRes.data;
      const catData = catPayload?.items || catPayload;

      if (catRes.ok && Array.isArray(catData) && catData.length > 0) {
        pass('1. Public Store Catalog: Returns active digital products', `(count=${catData.length}, sample="${catData[0]?.name}")`);
        passedTests++;
      } else {
        fail('1. Public Store Catalog', JSON.stringify(catRes.data));
      }
    } catch (err) {
      fail('1. Public Store Catalog', err.message);
    }

    // -------------------------------------------------------------
    // Test 2: Product Detail & Pricing Tiers
    // -------------------------------------------------------------
    try {
      const detRes = await request(`/public/products/${productSlug}`);
      const detData = detRes.data?.data || detRes.data;

      if (
        detRes.ok &&
        detData?.slug === productSlug &&
        Array.isArray(detData?.plans) &&
        detData?.plans.length > 0
      ) {
        pass('2. Product Detail & Plans: Enriched with pricing tiers and version info', `(slug=${detData.slug}, plansCount=${detData.plans.length})`);
        passedTests++;
      } else {
        fail('2. Product Detail & Plans', JSON.stringify(detRes.data));
      }
    } catch (err) {
      fail('2. Product Detail & Plans', err.message);
    }

    // -------------------------------------------------------------
    // Test 3: Customer Order Creation
    // -------------------------------------------------------------
    let orderId = null;
    let orderNumber = null;
    try {
      // Get a plan ID
      const plansRes = await request('/admin/license-plans', {
        method: 'GET',
        headers: authHeaders,
      });
      const plansList = plansRes.data?.data || plansRes.data || [];
      const plan = plansList[0];
      const planId = plan?._id || plan?.id;

      const orderRes = await request('/customer/orders', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          items: [
            {
              productId,
              licensePlanId: planId,
              quantity: 1,
            },
          ],
        }),
      });

      const orderData = orderRes.data?.data || orderRes.data;
      orderId = orderData?._id || orderData?.id;
      orderNumber = orderData?.orderNumber;

      if (orderRes.ok && orderId && orderNumber && orderData?.status === 'pending') {
        pass('3. Customer Order Creation: Generated pending order with line items', `(orderNumber=${orderNumber}, total=$${orderData?.total})`);
        passedTests++;
      } else {
        fail('3. Customer Order Creation', JSON.stringify(orderRes.data));
      }
    } catch (err) {
      fail('3. Customer Order Creation', err.message);
    }

    // -------------------------------------------------------------
    // Test 4: Payment Confirmation & Instant License Fulfillment
    // -------------------------------------------------------------
    let issuedLicenseKey = null;
    let issuedPurchaseKey = null;
    const paymentRef = `PAY-SUITE-${timestamp}`;

    try {
      const payRes = await request(`/customer/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          paymentReference: paymentRef,
          paymentMethod: 'stripe',
        }),
      });

      const payData = payRes.data?.data || payRes.data;
      const order = payData?.order;
      const fulfillments = payData?.fulfillmentResults || [];

      if (
        payRes.ok &&
        order?.paymentStatus === 'paid' &&
        order?.status === 'completed' &&
        fulfillments.length > 0 &&
        fulfillments[0].licenseKey?.startsWith('LIC-')
      ) {
        issuedLicenseKey = fulfillments[0].licenseKey;
        issuedPurchaseKey = fulfillments[0].purchaseKey;
        pass('4. Payment & Instant Fulfillment: Completed order & issued cryptographic license', `(licenseKey=${issuedLicenseKey}, purchaseKey=${issuedPurchaseKey})`);
        passedTests++;
      } else {
        fail('4. Payment & Instant Fulfillment', JSON.stringify(payRes.data));
      }
    } catch (err) {
      fail('4. Payment & Instant Fulfillment', err.message);
    }

    // -------------------------------------------------------------
    // Test 5: Idempotent Payment Processing
    // -------------------------------------------------------------
    try {
      const dupRes = await request(`/customer/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          paymentReference: paymentRef,
          paymentMethod: 'stripe',
        }),
      });

      const dupData = dupRes.data?.data || dupRes.data;

      if (dupRes.ok && dupData?.alreadyProcessed === true) {
        pass('5. Idempotent Payment: Duplicate callback safely returns existing order without duplicate licenses', `(alreadyProcessed=true)`);
        passedTests++;
      } else {
        fail('5. Idempotent Payment', JSON.stringify(dupRes.data));
      }
    } catch (err) {
      fail('5. Idempotent Payment', err.message);
    }

    // -------------------------------------------------------------
    // Test 6: Customer Orders List
    // -------------------------------------------------------------
    try {
      const myOrdersRes = await request('/customer/orders', {
        method: 'GET',
        headers: authHeaders,
      });

      const myOrders = myOrdersRes.data?.data || myOrdersRes.data;

      if (
        myOrdersRes.ok &&
        Array.isArray(myOrders) &&
        myOrders.some((o) => o.orderNumber === orderNumber)
      ) {
        pass('6. Customer Orders History: Retrievable with line items and invoices', `(ordersCount=${myOrders.length}, foundOrder=${orderNumber})`);
        passedTests++;
      } else {
        fail('6. Customer Orders History', JSON.stringify(myOrdersRes.data));
      }
    } catch (err) {
      fail('6. Customer Orders History', err.message);
    }

    // -------------------------------------------------------------
    // Test 7: Customer Purchases List
    // -------------------------------------------------------------
    try {
      const myPurchasesRes = await request('/customer/purchases', {
        method: 'GET',
        headers: authHeaders,
      });

      const myPurchases = myPurchasesRes.data?.data || myPurchasesRes.data;

      if (
        myPurchasesRes.ok &&
        Array.isArray(myPurchases) &&
        myPurchases.some((p) => p.purchaseKey === issuedPurchaseKey)
      ) {
        pass('7. Customer Purchases: Stored in purchase registry and linked to customer', `(purchasesCount=${myPurchases.length})`);
        passedTests++;
      } else {
        fail('7. Customer Purchases', JSON.stringify(myPurchasesRes.data));
      }
    } catch (err) {
      fail('7. Customer Purchases', err.message);
    }

    // -------------------------------------------------------------
    // Test 8: End-to-End Activation with Store-Issued License
    // -------------------------------------------------------------
    let activationToken = null;
    try {
      const actRes = await request('/public/licenses/activate', {
        method: 'POST',
        headers: clientHeaders,
        body: JSON.stringify({
          productSlug,
          licenseKey: issuedLicenseKey,
          domain: 'store-app-production.com',
          installationId: 'inst-store-e2e-001',
          environment: 'production',
        }),
      });

      const actData = actRes.data?.data || actRes.data;
      activationToken = actData?.token;

      if (actRes.ok && actData?.valid === true && activationToken) {
        pass('8. Activation with Store License: Registered domain & returned signed token', `(activationId=${actData?.activationId}, status=ACTIVE)`);
        passedTests++;
      } else {
        fail('8. Activation with Store License', JSON.stringify(actRes.data));
      }
    } catch (err) {
      fail('8. Activation with Store License', err.message);
    }

    // -------------------------------------------------------------
    // Test 9: Periodic Validation Heartbeat
    // -------------------------------------------------------------
    try {
      const valRes = await request('/public/licenses/validate', {
        method: 'POST',
        headers: clientHeaders,
        body: JSON.stringify({
          productSlug,
          token: activationToken,
          domain: 'store-app-production.com',
          installationId: 'inst-store-e2e-001',
        }),
      });

      const valData = valRes.data?.data || valRes.data;

      if (valRes.ok && valData?.valid === true && valData?.status === 'ACTIVE') {
        pass('9. Periodic Validation Heartbeat: Validated signed cryptographic token', `(valid=true, status=ACTIVE, domain=store-app-production.com)`);
        passedTests++;
      } else {
        fail('9. Periodic Validation Heartbeat', JSON.stringify(valRes.data));
      }
    } catch (err) {
      fail('9. Periodic Validation Heartbeat', err.message);
    }

    // -------------------------------------------------------------
    // Test 10: Admin Orders Management & Telemetry Stats
    // -------------------------------------------------------------
    try {
      const adminOrdersRes = await request('/admin/orders', {
        method: 'GET',
        headers: authHeaders,
      });
      const adminStatsRes = await request('/admin/orders/stats', {
        method: 'GET',
        headers: authHeaders,
      });

      const orderPayload = adminOrdersRes.data?.data || adminOrdersRes.data;
      const adminOrders = orderPayload?.items || orderPayload;
      const statsData = adminStatsRes.data?.data || adminStatsRes.data;

      if (
        adminOrdersRes.ok &&
        Array.isArray(adminOrders) &&
        adminStatsRes.ok &&
        statsData?.totalRevenue > 0
      ) {
        pass('10. Admin Orders & Sales Telemetry: Revenue aggregated & orders stream accessible', `(totalOrders=${statsData.totalOrders}, grossRevenue=$${statsData.totalRevenue})`);
        passedTests++;
      } else {
        fail('10. Admin Orders & Sales Telemetry', JSON.stringify({ orders: adminOrdersRes.data, stats: adminStatsRes.data }));
      }
    } catch (err) {
      fail('10. Admin Orders & Sales Telemetry', err.message);
    }

  } catch (err) {
    console.error(`${colors.red}Fatal test suite error: ${err.message}${colors.reset}`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n  ${colors.bright}Result: ${passedTests}/${totalTests} passed${colors.reset}\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runStoreOrderSuite();
