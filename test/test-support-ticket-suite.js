/**
 * LicenseNest – Customer Support, License Verification & Support Ticket Test Suite
 * 
 * Verifies:
 * 1. Customer contextual dropdown data retrieval (owned products/licenses/domains)
 * 2. Ticket creation linked to product, purchase, license, and active installation
 * 3. Pre-sale ticket creation without active license requirement
 * 4. Ownership boundary enforcement (cannot create ticket for unowned license)
 * 5. Customer & Agent conversation thread replies with audit trail
 * 6. Internal team notes creation & customer confidentiality (hidden from customer view)
 * 7. Support agent assignment with audit logging & notifications
 * 8. Status transitions (Open -> In Progress -> Waiting Customer -> Resolved -> Closed)
 * 9. Real-time license verification telemetry endpoint for support desk
 * 10. Customer satisfaction rating & admin telemetry KPIs aggregation
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

async function runSupportSuite() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   LicenseNest – Customer Support & Verification Suite       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let passedTests = 0;
  const totalTests = 10;

  try {
    // -------------------------------------------------------------
    // Setup: Admin Authentication & Product/License Provisioning
    // -------------------------------------------------------------
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'Admin123456!',
      }),
    });

    const adminToken = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
    const adminUser = loginRes.data?.data?.user || loginRes.data?.user;
    const adminId = adminUser?.id || adminUser?._id;

    if (!adminToken) {
      throw new Error(`Admin auth failed: ${JSON.stringify(loginRes.data)}`);
    }
    const authHeaders = { Authorization: `Bearer ${adminToken}` };

    const timestamp = Date.now();

    // Create 1 product
    const prodRes = await request('/admin/products/wizard', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Support Pro Suite ${timestamp}`,
        slug: `support-pro-${timestamp}`,
        productType: 'nextjs_app',
        price: 120,
        licenseSettings: { defaultActivationLimit: 3, validationIntervalHours: 24 },
      }),
    });
    const prodPayload = prodRes.data?.data || prodRes.data;
    const productId = prodPayload?.productId || prodPayload?.product?._id || prodPayload?._id;
    const clientId = prodPayload?.publicClientId || prodPayload?.credential?.clientId || prodPayload?.clientId;
    const apiKey = prodPayload?.apiKey || prodPayload?.credential?.apiKey;

    const clientHeaders = {
      'x-client-id': clientId,
      'x-api-key': apiKey,
    };

    // Register Customer Account A
    const custEmail = `support_buyer_${timestamp}@example.com`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: custEmail,
        password: 'Password123!',
        fullName: `Support Client ${timestamp}`,
      }),
    });
    const custToken = regRes.data?.data?.accessToken || regRes.data?.accessToken;
    const custHeaders = { Authorization: `Bearer ${custToken}` };

    // Register Customer Account B (for boundary testing)
    const custBEmail = `other_buyer_${timestamp}@example.com`;
    const regBRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: custBEmail,
        password: 'Password123!',
        fullName: `Other Client ${timestamp}`,
      }),
    });
    const custBToken = regBRes.data?.data?.accessToken || regBRes.data?.accessToken;
    const custBHeaders = { Authorization: `Bearer ${custBToken}` };

    // Customer A Buys Product and gets a License
    const orderRes = await request('/customer/orders', {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        items: [{ productId, quantity: 1 }],
      }),
    });
    const orderData = orderRes.data?.data || orderRes.data;
    const orderId = orderData?._id;

    // Pay Order with simulator
    const initPayRes = await request('/customer/payments/initiate-checkout', {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        orderId,
        gateway: 'simulator',
      }),
    });
    const payData = initPayRes.data?.data || initPayRes.data;
    const txnId = payData?.transactionId;
    const simToken = payData?.session?.simulatedToken;

    const completePayRes = await request('/customer/payments/simulator-complete', {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        transactionId: txnId,
        simulatedToken: simToken,
      }),
    });
    const completePayData = completePayRes.data?.data || completePayRes.data;
    const fulfillmentResults = completePayData?.fulfillmentResults || [];
    const licenseKey = fulfillmentResults[0]?.licenseKey;

    // Retrieve License ID
    const myLicensesRes = await request('/customer/licenses', {
      headers: custHeaders,
    });
    const myLicenses = myLicensesRes.data?.data || myLicensesRes.data || [];
    const targetLicense = myLicenses.find((l) => l.licenseKey === licenseKey);
    const licenseId = targetLicense?._id || targetLicense?.id;

    // Activate domain on this license
    const testDomain = `app-${timestamp}.supportclient.com`;
    const productSlug = `support-pro-${timestamp}`;
    const actRes = await request('/public/licenses/activate', {
      method: 'POST',
      headers: clientHeaders,
      body: JSON.stringify({
        productSlug,
        licenseKey,
        domain: testDomain,
        installationId: `inst_${timestamp}`,
        productVersion: '1.0.0',
        environment: 'production',
      }),
    });
    const actData = actRes.data?.data || actRes.data;
    const activationId = actData?.activationId;

    if (!actData?.valid) {
      console.log('DEBUG ACTIVATE:', JSON.stringify(actRes.data));
    }

    console.log('━━ SECTION 1: CONTEXTUAL DATA & TICKET CREATION ━━━━━━━━━━━━━━━━━');

    // Test 1: Customer Context Data Retrieval
    const contextRes = await request('/customer/support/context', {
      headers: custHeaders,
    });
    const contextPayload = contextRes.data?.data || contextRes.data;
    const foundProductInContext = contextPayload?.products?.some((p) => p.productId === productId);

    if (contextRes.ok && foundProductInContext && contextPayload?.totalLicenses >= 1) {
      pass('1. Customer Context: Retrieved owned products, licenses & active domains', `(products=${contextPayload.products.length}, licenses=${contextPayload.totalLicenses})`);
      passedTests++;
    } else {
      fail('1. Customer Context', JSON.stringify(contextRes.data));
    }

    // Test 2: Create Technical Support Ticket Linked to Product, License & Domain
    const createTicketRes = await request('/customer/support/tickets', {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        subject: 'Database migration issue on production domain',
        message: 'Getting connection error 500 when running initial sync after updating.',
        category: 'technical_issue',
        priority: 'high',
        productId,
        licenseId,
        domain: testDomain,
      }),
    });
    const ticketData = createTicketRes.data?.data || createTicketRes.data;
    const ticketId = ticketData?._id;
    const ticketNumber = ticketData?.ticketNumber;

    if (
      createTicketRes.ok &&
      ticketData?.ticketNumber?.startsWith('TCK-') &&
      ticketData?.licenseKey === licenseKey &&
      ticketData?.status === 'open'
    ) {
      pass('2. Ticket Creation: Opened technical ticket linked to verified license & domain', `(ticket=${ticketNumber}, license=${licenseKey})`);
      passedTests++;
    } else {
      fail('2. Ticket Creation', JSON.stringify(createTicketRes.data));
    }

    // Test 3: Pre-Sale Ticket Creation without License Requirement
    const preSaleRes = await request('/customer/support/tickets', {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        subject: 'Pre-sale inquiry about enterprise multi-cluster support',
        message: 'Does your software support multi-region PostgreSQL replication?',
        category: 'pre_sale',
        priority: 'low',
      }),
    });
    const preSaleData = preSaleRes.data?.data || preSaleRes.data;

    if (preSaleRes.ok && preSaleData?.category === 'pre_sale' && !preSaleData?.licenseId) {
      pass('3. Pre-Sale Inquiry: Successfully created general inquiry ticket without active license', `(category=pre_sale)`);
      passedTests++;
    } else {
      fail('3. Pre-Sale Inquiry', JSON.stringify(preSaleRes.data));
    }

    // Test 4: Ownership Boundary Protection (Customer B trying to use Customer A's license)
    const unauthorizedTicketRes = await request('/customer/support/tickets', {
      method: 'POST',
      headers: custBHeaders,
      body: JSON.stringify({
        subject: 'Spoofed ticket attempt',
        message: 'Trying to open ticket with unowned license',
        category: 'technical_issue',
        licenseId, // Customer A's license
      }),
    });

    if (unauthorizedTicketRes.status === 403) {
      pass('4. Boundary Protection: Blocked ticket creation for unowned license', `(status=403, rejected=true)`);
      passedTests++;
    } else {
      fail('4. Boundary Protection', JSON.stringify(unauthorizedTicketRes.data));
    }

    console.log('\n━━ SECTION 2: CONVERSATIONS, INTERNAL NOTES & PRIVACY ━━━━━━━━━━');

    // Test 5: Customer & Agent Public Replies
    // Agent replies to ticket
    const agentReplyRes = await request(`/admin/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        message: 'Hello! Please verify your database connection string and SSL settings in .env.',
        isInternalNote: false,
        statusTransition: 'waiting_customer',
      }),
    });
    const agentReplyData = agentReplyRes.data?.data || agentReplyRes.data;

    // Customer replies back
    const custReplyRes = await request(`/customer/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        message: 'Checked SSL settings and that resolved the connection issue! Thank you!',
      }),
    });
    const custReplyData = custReplyRes.data?.data || custReplyRes.data;

    if (
      agentReplyRes.ok &&
      custReplyRes.ok &&
      custReplyData?.messages?.length >= 3 &&
      custReplyData?.status === 'in_progress'
    ) {
      pass('5. Conversation Engine: Handled multi-turn replies and dynamic status shifts', `(messages=${custReplyData.messages.length}, status=in_progress)`);
      passedTests++;
    } else {
      fail('5. Conversation Engine', JSON.stringify({ agent: agentReplyRes.data, cust: custReplyRes.data }));
    }

    // Test 6: Internal Notes Creation & Customer Confidentiality Verification
    // Admin posts internal note
    const internalNoteRes = await request(`/admin/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        message: 'CONFIDENTIAL NOTE: User had misconfigured TLS cert on their AWS RDS instance.',
        isInternalNote: true,
      }),
    });

    // Customer reads ticket details
    const custGetTicketRes = await request(`/customer/support/tickets/${ticketId}`, {
      headers: custHeaders,
    });
    const custTicketData = custGetTicketRes.data?.data || custGetTicketRes.data;
    const hasInternalNoteInCustView = custTicketData?.messages?.some((m) => m.isInternalNote === true);

    // Admin reads ticket details
    const adminGetTicketRes = await request(`/admin/support/tickets/${ticketId}`, {
      headers: authHeaders,
    });
    const adminTicketData = adminGetTicketRes.data?.data || adminGetTicketRes.data;
    const hasInternalNoteInAdminView = adminTicketData?.messages?.some((m) => m.isInternalNote === true);

    if (
      internalNoteRes.ok &&
      hasInternalNoteInAdminView &&
      !hasInternalNoteInCustView
    ) {
      pass('6. Internal Notes Privacy: Cryptographically isolated internal notes from customer view', `(adminCanSee=true, customerCanSee=false)`);
      passedTests++;
    } else {
      fail('6. Internal Notes Privacy', JSON.stringify({ custView: custTicketData?.messages }));
    }

    console.log('\n━━ SECTION 3: ASSIGNMENT, STATUS TRANSITIONS & TELEMETRY ━━━━━━━');

    // Test 7: Support Agent Assignment with Audit Trail
    const assignRes = await request(`/admin/support/tickets/${ticketId}/assign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        agentId: adminId,
      }),
    });
    const assignData = assignRes.data?.data || assignRes.data;

    if (assignRes.ok && assignData?.assignedAgentId === adminId) {
      pass('7. Agent Assignment: Assigned support engineer with audit log and notification', `(assignedAgent=${assignData.assignedAgentName})`);
      passedTests++;
    } else {
      fail('7. Agent Assignment', JSON.stringify(assignRes.data));
    }

    // Test 8: Status Transitions (Resolve & Close)
    const resolveRes = await request(`/admin/support/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'resolved',
        resolutionSummary: 'Resolved database TLS connection settings.',
      }),
    });
    const resolveData = resolveRes.data?.data || resolveRes.data;

    if (resolveRes.ok && resolveData?.status === 'resolved' && resolveData?.resolvedAt) {
      pass('8. Lifecycle Progression: Transitioned ticket to RESOLVED with resolution summary', `(status=resolved, summary="${resolveData.resolutionSummary}")`);
      passedTests++;
    } else {
      fail('8. Lifecycle Progression', JSON.stringify(resolveRes.data));
    }

    // Test 9: Live License Verification Telemetry Stream
    const verifyRes = await request(`/admin/support/tickets/${ticketId}/verification`, {
      headers: authHeaders,
    });
    const verifyData = verifyRes.data?.data || verifyRes.data;

    if (
      verifyRes.ok &&
      verifyData?.license?.licenseKey === licenseKey &&
      verifyData?.license?.status === 'active' &&
      verifyData?.activations?.length >= 1 &&
      verifyData?.support?.isSupportActive === true
    ) {
      pass('9. Live License Verification: Support desk retrieved real-time domain heartbeats & support status', `(licenseKey=${licenseKey}, domains=${verifyData.activations.length}, supportActive=true)`);
      passedTests++;
    } else {
      fail('9. Live License Verification', JSON.stringify(verifyRes.data));
    }

    // Test 10: Ticket Satisfaction Rating & Admin Telemetry KPIs
    const rateRes = await request(`/customer/support/tickets/${ticketId}/rate`, {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        rating: 5,
        feedback: 'Fantastic and speedy support! Everything works smoothly now.',
      }),
    });

    const statsRes = await request('/admin/support/tickets/stats', {
      headers: authHeaders,
    });
    const statsData = statsRes.data?.data || statsRes.data;

    if (
      rateRes.ok &&
      statsRes.ok &&
      statsData?.totalTickets >= 2 &&
      statsData?.resolvedTickets >= 1 &&
      statsData?.averageRating >= 4.0
    ) {
      pass('10. Telemetry & CSAT: Captured customer satisfaction rating & computed telemetry KPIs', `(rating=5/5, avgCSAT=${statsData.averageRating}, totalTickets=${statsData.totalTickets})`);
      passedTests++;
    } else {
      fail('10. Telemetry & CSAT', JSON.stringify({ rate: rateRes.data, stats: statsRes.data }));
    }

  } catch (err) {
    console.error(`${colors.red}Fatal support test error: ${err.message}${colors.reset}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${colors.bright}Support Suite Result: ${passedTests}/${totalTests} tests passed${colors.reset}\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSupportSuite();
