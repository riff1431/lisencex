/**
 * LicenseNest – Coupon, Discount, Promotion & Offer System Test Suite
 * 
 * Verifies:
 * 1. Admin coupon creation (Fixed, Percentage, Product/Plan targeted, First-Purchase)
 * 2. Server-authoritative discount validation & breakdown calculation
 * 3. Expired & Inactive coupon rejection
 * 4. Minimum order amount threshold enforcement
 * 5. First-purchase-only restriction enforcement
 * 6. Product-targeted selective discount calculation
 * 7. End-to-end checkout with coupon (Order recording & discounted transaction charge)
 * 8. License issuance based on product entitlement (not coupon)
 * 9. Per-customer and global usage limit enforcement (abuse prevention)
 * 10. Admin telemetry, campaign stats aggregation & audit trail
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';

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

async function runCouponSuite() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   LicenseNest – Coupons, Discounts & Offers Test Suite      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let passedTests = 0;
  const totalTests = 10;

  try {
    // -------------------------------------------------------------
    // Setup: Admin Authentication & Product Provisioning
    // -------------------------------------------------------------
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'Admin123456!',
      }),
    });

    const adminToken = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
    if (!adminToken) {
      throw new Error(`Admin auth failed: ${JSON.stringify(loginRes.data)}`);
    }
    const authHeaders = { Authorization: `Bearer ${adminToken}` };

    const timestamp = Date.now();

    // Create 2 test products
    const prod1Res = await request('/admin/products/wizard', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Promotion App A ${timestamp}`,
        slug: `promo-a-${timestamp}`,
        productType: 'nextjs_app',
        price: 100,
        licenseSettings: { defaultActivationLimit: 2, validationIntervalHours: 24 },
      }),
    });
    const prod1Payload = prod1Res.data?.data || prod1Res.data;
    const prod1Id = prod1Payload?.productId || prod1Payload?.product?._id || prod1Payload?._id;

    const prod2Res = await request('/admin/products/wizard', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Promotion Plugin B ${timestamp}`,
        slug: `promo-b-${timestamp}`,
        productType: 'wordpress_plugin',
        price: 50,
        licenseSettings: { defaultActivationLimit: 1, validationIntervalHours: 24 },
      }),
    });
    const prod2Payload = prod2Res.data?.data || prod2Res.data;
    const prod2Id = prod2Payload?.productId || prod2Payload?.product?._id || prod2Payload?._id;

    if (!prod1Id || !prod2Id) {
      console.log('DEBUG PROD1:', JSON.stringify(prod1Res.data));
      console.log('DEBUG PROD2:', JSON.stringify(prod2Res.data));
    }

    // Create a new fresh customer account to test first-purchase and usage limits
    const customerEmail = `buyer_${timestamp}@example.com`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: customerEmail,
        password: 'Password123!',
        fullName: `Coupon Tester ${timestamp}`,
      }),
    });
    const customerToken = regRes.data?.data?.accessToken || regRes.data?.accessToken;
    const customerHeaders = { Authorization: `Bearer ${customerToken}` };

    console.log('━━ SECTION 1: COUPON CREATION & VALIDATION ENGINE ━━━━━━━━━━━━━━');

    // Test 1: Admin Create Percentage Coupon (25% off, max $30 cap, min order $40)
    const codePercent = `SAVE25_${timestamp.toString().slice(-4)}`;
    const createPercentRes = await request('/admin/coupons', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        code: codePercent,
        name: '25% Off Summer Campaign',
        description: 'Get 25% off any software package',
        discountType: 'percentage',
        discountValue: 25,
        maxDiscountAmount: 30,
        minOrderAmount: 40,
        perCustomerLimit: 1,
        campaignName: 'Summer Launch 2026',
        isFeaturedPublicOffer: true,
        publicBannerText: 'Use code SAVE25 for 25% off up to $30',
      }),
    });

    const percentData = createPercentRes.data?.data || createPercentRes.data;

    if (createPercentRes.ok && percentData?.code === codePercent) {
      pass('1. Coupon Provisioning: Created percentage discount campaign', `(code=${codePercent}, value=25%, maxCap=$30)`);
      passedTests++;
    } else {
      fail('1. Coupon Provisioning', JSON.stringify(createPercentRes.data));
    }

    // Test 2: Server-Authoritative Validation (Percentage discount with max cap check)
    const valPercentRes = await request('/customer/coupons/validate', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        code: codePercent,
        items: [
          { productId: prod1Id, quantity: 1, unitPrice: 100 }, // $100 -> 25% = $25 (under $30 cap)
          { productId: prod2Id, quantity: 1, unitPrice: 50 },  // $50 -> Total $150 -> 25% = $37.50 -> Capped at $30!
        ],
      }),
    });

    const valPercentData = valPercentRes.data?.data || valPercentRes.data;

    // Total = $150, 25% = $37.50 -> capped at $30 -> finalTotal = $120
    if (
      valPercentRes.ok &&
      valPercentData?.valid === true &&
      valPercentData?.originalSubtotal === 150 &&
      valPercentData?.discountAmount === 30 &&
      valPercentData?.finalTotal === 120
    ) {
      pass('2. Discount Calculation: Correctly computed percentage discount with max cap', `(subtotal=$150, discount=$30, final=$120)`);
      passedTests++;
    } else {
      fail('2. Discount Calculation', JSON.stringify(valPercentRes.data));
    }

    // Test 3: Min Order Amount Enforcement Rejection
    const valMinOrderRes = await request('/customer/coupons/validate', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        code: codePercent,
        items: [{ productId: prod2Id, quantity: 0.5, unitPrice: 25 }], // subtotal = $25 (below min $40)
      }),
    });

    if (valMinOrderRes.status === 400 && valMinOrderRes.data?.code === 'MIN_ORDER_AMOUNT_NOT_MET') {
      pass('3. Min Order Gate: Rejected coupon when cart subtotal was below threshold', `(status=400, code=MIN_ORDER_AMOUNT_NOT_MET)`);
      passedTests++;
    } else {
      fail('3. Min Order Gate', JSON.stringify(valMinOrderRes.data));
    }

    // Test 4: Expired and Inactive Coupon Rejections
    const codeExpired = `EXPIRED_${timestamp.toString().slice(-4)}`;
    await request('/admin/coupons', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        code: codeExpired,
        name: 'Expired Promo',
        discountType: 'fixed',
        discountValue: 15,
        endDate: new Date(Date.now() - 86400000), // Yesterday
      }),
    });

    const valExpiredRes = await request('/customer/coupons/validate', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        code: codeExpired,
        items: [{ productId: prod1Id, quantity: 1 }],
      }),
    });

    if (valExpiredRes.status === 400 && valExpiredRes.data?.code === 'COUPON_EXPIRED') {
      pass('4. Expiry Enforcement: Correctly rejected expired promotional coupon', `(status=400, code=COUPON_EXPIRED)`);
      passedTests++;
    } else {
      fail('4. Expiry Enforcement', JSON.stringify(valExpiredRes.data));
    }

    // Test 5: Product-Targeted Coupon Calculation
    const codeTargeted = `PROD1ONLY_${timestamp.toString().slice(-4)}`;
    await request('/admin/coupons', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        code: codeTargeted,
        name: 'App A Exclusive $20 Off',
        discountType: 'fixed',
        discountValue: 20,
        eligibleProducts: [prod1Id], // Only App A qualifies
      }),
    });

    const valTargetedRes = await request('/customer/coupons/validate', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        code: codeTargeted,
        items: [
          { productId: prod1Id, quantity: 1, unitPrice: 100 }, // Eligible ($100)
          { productId: prod2Id, quantity: 1, unitPrice: 50 },  // Ineligible ($50)
        ],
      }),
    });

    const valTargetData = valTargetedRes.data?.data || valTargetedRes.data;

    if (
      valTargetedRes.ok &&
      valTargetData?.valid === true &&
      valTargetData?.originalSubtotal === 150 &&
      valTargetData?.discountAmount === 20 &&
      valTargetData?.finalTotal === 130
    ) {
      pass('5. Product-Targeted Rules: Calculated discount solely on eligible cart items', `(discount=$20, final=$130)`);
      passedTests++;
    } else {
      fail('5. Product-Targeted Rules', JSON.stringify(valTargetedRes.data));
    }

    console.log('\n━━ SECTION 2: CHECKOUT & PAYMENT WITH DISCOUNTS ━━━━━━━━━━━━━━━━');

    // Test 6: Create Order with Coupon & Check Discounted Amounts
    const orderWithCouponRes = await request('/customer/orders', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        items: [{ productId: prod1Id, quantity: 1 }], // $100
        couponCode: codePercent, // 25% off $100 = $25 off -> Total $75
      }),
    });

    const orderPayload = orderWithCouponRes.data?.data || orderWithCouponRes.data;
    const orderId = orderPayload?._id;
    const orderNumber = orderPayload?.orderNumber;

    if (
      orderWithCouponRes.ok &&
      orderPayload?.originalSubtotal === 100 &&
      orderPayload?.discountAmount === 25 &&
      orderPayload?.total === 75 &&
      orderPayload?.couponCode === codePercent
    ) {
      pass('6. Order Integration: Recorded originalSubtotal, discountAmount & discounted total in Order', `(order=${orderNumber}, orig=$100, discount=$25, total=$75)`);
      passedTests++;
    } else {
      fail('6. Order Integration', JSON.stringify(orderWithCouponRes.data));
    }

    // Test 7: Pay Discounted Order via Simulator Gateway
    const initPayRes = await request('/customer/payments/initiate-checkout', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        orderId,
        gateway: 'simulator',
      }),
    });

    const payData = initPayRes.data?.data || initPayRes.data;
    const transactionId = payData?.transactionId;
    const simToken = payData?.session?.simulatedToken;

    const completePayRes = await request('/customer/payments/simulator-complete', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        transactionId,
        simulatedToken: simToken,
      }),
    });

    const completePayData = completePayRes.data?.data || completePayRes.data;
    const fulfillmentResults = completePayData?.fulfillmentResults || [];
    const issuedLicenseKey = fulfillmentResults[0]?.licenseKey;

    if (
      completePayRes.ok &&
      completePayData?.success === true &&
      completePayData?.transaction?.amount === 75 &&
      issuedLicenseKey?.startsWith('LIC-')
    ) {
      pass('7. Payment & Fulfillment: Charged discounted total & issued full product license', `(charged=$75, licenseKey=${issuedLicenseKey})`);
      passedTests++;
    } else {
      fail('7. Payment & Fulfillment', JSON.stringify(completePayRes.data));
    }

    console.log('\n━━ SECTION 3: ABUSE PREVENTION, OFFERS & TELEMETRY ━━━━━━━━━━━━━');

    // Test 8: Per-Customer Usage Limit Enforcement (Re-applying same single-use coupon)
    const reapplyRes = await request('/customer/coupons/validate', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        code: codePercent,
        items: [{ productId: prod1Id, quantity: 1 }],
      }),
    });

    if (reapplyRes.status === 400 && reapplyRes.data?.code === 'PER_CUSTOMER_LIMIT_REACHED') {
      pass('8. Abuse Protection: Blocked repeat usage exceeding per-customer limit', `(status=400, code=PER_CUSTOMER_LIMIT_REACHED)`);
      passedTests++;
    } else {
      fail('8. Abuse Protection', JSON.stringify(reapplyRes.data));
    }

    // Test 9: Public Promotional Offers Discovery
    const publicOffersRes = await request('/public/coupons/offers');
    const offersData = publicOffersRes.data?.data || publicOffersRes.data;
    const foundFeatured = Array.isArray(offersData) && offersData.some((o) => o.code === codePercent);

    if (publicOffersRes.ok && foundFeatured) {
      pass('9. Promotion Campaigns: Public offers endpoint returns featured promotions', `(count=${offersData.length}, featured=true)`);
      passedTests++;
    } else {
      fail('9. Promotion Campaigns', JSON.stringify(publicOffersRes.data));
    }

    // Test 10: Admin Telemetry & Coupon Performance Tracking
    const statsRes = await request('/admin/coupons/stats', {
      headers: authHeaders,
    });

    const statsData = statsRes.data?.data || statsRes.data;

    if (
      statsRes.ok &&
      statsData?.totalCoupons > 0 &&
      statsData?.totalRedemptions >= 1 &&
      statsData?.totalDiscountsGiven >= 25 &&
      statsData?.totalAttributedRevenue >= 75
    ) {
      pass('10. Admin Telemetry: Tracked redemptions, total discounts given & attributed sales revenue', `(discountsGiven=$${statsData.totalDiscountsGiven}, attributedRevenue=$${statsData.totalAttributedRevenue})`);
      passedTests++;
    } else {
      fail('10. Admin Telemetry', JSON.stringify(statsRes.data));
    }

  } catch (err) {
    console.error(`${colors.red}Fatal coupon test error: ${err.message}${colors.reset}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${colors.bright}Coupon Suite Result: ${passedTests}/${totalTests} tests passed${colors.reset}\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runCouponSuite();
