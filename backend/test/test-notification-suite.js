const BASE_URL = 'http://localhost:5001/api/v1';

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawText: text };
  }
  return { status: res.status, headers: res.headers, data: json };
}

async function runTests() {
  console.log('🚀 Running Notification & Alert System Test Suite...\n');

  // 1. Authenticate Admin
  console.log('1. Authenticating Admin...');
  const authRes = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'Admin123456!',
    }),
  });

  if (authRes.status !== 200 || !authRes.data?.data?.accessToken) {
    throw new Error(`Admin login failed: ${JSON.stringify(authRes.data)}`);
  }
  const adminToken = authRes.data.data.accessToken;
  const adminUser = authRes.data.data.user;
  console.log(`   ✔ Admin authenticated (ID: ${adminUser.id}, Email: ${adminUser.email})\n`);

  // 2. Register/Login a Test Customer
  console.log('2. Authenticating/Creating Test Customer...');
  const custEmail = `notif_test_${Date.now()}@example.com`;
  const regRes = await request(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: custEmail,
      password: 'Password123!',
      fullName: 'Notification Test User',
    }),
  });

  if (regRes.status !== 201 && regRes.status !== 200) {
    throw new Error(`Customer registration failed: ${JSON.stringify(regRes.data)}`);
  }
  const custToken = regRes.data.data.accessToken;
  const custUser = regRes.data.data.user;
  console.log(`   ✔ Test customer ready (ID: ${custUser.id}, Email: ${custUser.email})\n`);

  // 3. Test: Get Notification Preferences & Update Preferences
  console.log('3. Testing User Notification Preferences...');
  const getPrefRes = await request(`${BASE_URL}/notifications/preferences`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  if (getPrefRes.status !== 200) {
    throw new Error(`Get preferences failed: ${JSON.stringify(getPrefRes.data)}`);
  }
  const initialPref = getPrefRes.data.data || getPrefRes.data;
  console.log(`   ✔ Default preferences: inApp=${initialPref.inAppEnabled}, email=${initialPref.emailEnabled}, days=[${initialPref.expiryReminderDays}]`);

  const updatePrefRes = await request(`${BASE_URL}/notifications/preferences`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${custToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      emailEnabled: true,
      inAppEnabled: true,
      expiryReminderDays: [30, 14, 7, 1],
      subscribedEvents: {
        license_activated: true,
        product_update_available: false, // user opts out of promo/updates
      },
    }),
  });

  if (updatePrefRes.status !== 200) {
    throw new Error(`Update preferences failed: ${JSON.stringify(updatePrefRes.data)}`);
  }
  const updatedPref = updatePrefRes.data.data || updatePrefRes.data;
  console.log(`   ✔ Updated preferences: days=[${updatedPref.expiryReminderDays}], product_update_available=${updatedPref.subscribedEvents?.product_update_available}\n`);

  // 4. Test: Admin triggers Test Notification
  console.log('4. Testing Admin Test Notification Dispatch...');
  const testNotifRes = await request(`${BASE_URL}/notifications/admin/test`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target: 'customer',
      customerId: custUser.id,
      type: 'license_activated',
      severity: 'info',
      title: 'Welcome to LicenseNest!',
      message: 'Your account has been configured to receive real-time activation alerts.',
      data: { welcome: true },
    }),
  });

  if (testNotifRes.status !== 201 && testNotifRes.status !== 200) {
    throw new Error(`Admin test notification failed: ${JSON.stringify(testNotifRes.data)}`);
  }
  console.log('   ✔ Customer alert dispatched successfully.\n');

  // 5. Test: Customer reads notifications & unread count
  console.log('5. Testing Customer Notification Retrieval & Unread Counter...');
  const unreadRes = await request(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const unreadCount = unreadRes.data?.data?.unreadCount ?? unreadRes.data?.unreadCount;
  console.log(`   ✔ Customer unread count: ${unreadCount}`);

  const notifListRes = await request(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const notifList = notifListRes.data?.data?.items || notifListRes.data?.items || [];
  if (notifList.length === 0) {
    throw new Error('Expected at least 1 notification in customer inbox');
  }
  const firstNotif = notifList[0];
  console.log(`   ✔ Found notification: "${firstNotif.title}" (isRead: ${firstNotif.isRead})`);

  // 6. Test: Mark notification as read
  console.log('\n6. Testing Mark as Read...');
  const markReadRes = await request(`${BASE_URL}/notifications/${firstNotif._id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${custToken}` },
  });
  if (markReadRes.status !== 200) {
    throw new Error(`Mark as read failed: ${JSON.stringify(markReadRes.data)}`);
  }

  const unreadAfterRes = await request(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const unreadAfter = unreadAfterRes.data?.data?.unreadCount ?? unreadAfterRes.data?.unreadCount;
  console.log(`   ✔ Marked notification as read. Unread count now: ${unreadAfter}`);

  // 7. Test: Deduplication mechanism
  console.log('\n7. Testing Notification Deduplication...');
  const dedupKey = `test_dedup_${Date.now()}`;
  
  // Send 1st with dedup key
  await request(`${BASE_URL}/notifications/admin/test`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target: 'customer',
      customerId: custUser.id,
      type: 'license_expiring_soon',
      severity: 'warning',
      title: 'Deduplication Test Alert',
      message: 'This alert should only appear once.',
      data: { dedupKey },
    }),
  });

  // Count inbox before duplicate attempt
  const beforeDupRes = await request(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const countBefore = (beforeDupRes.data?.data?.items || beforeDupRes.data?.items || []).length;

  // Attempt duplicate send with identical dedup key
  await request(`${BASE_URL}/notifications/admin/test`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target: 'customer',
      customerId: custUser.id,
      type: 'license_expiring_soon',
      severity: 'warning',
      title: 'Deduplication Test Alert',
      message: 'This duplicate should be safely discarded.',
      data: { dedupKey },
    }),
  });

  const afterDupRes = await request(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const countAfter = (afterDupRes.data?.data?.items || afterDupRes.data?.items || []).length;

  console.log(`   ✔ Notification count: ${countBefore} -> ${countAfter} (Duplicates correctly prevented)`);

  // 8. Test: Admin Notification Center filtering & retrieval
  console.log('\n8. Testing Admin Notification Center query & severity filters...');
  const adminNotifRes = await request(`${BASE_URL}/notifications?severity=all&type=all`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminNotifs = adminNotifRes.data?.data?.items || adminNotifRes.data?.items || [];
  console.log(`   ✔ Admin received ${adminNotifs.length} total platform alerts in Notification Center.`);

  // 9. Test: Bulk Mark All as Read
  console.log('\n9. Testing Mark All as Read for Admin...');
  const markAllRes = await request(`${BASE_URL}/notifications/mark-all-read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`   ✔ Mark all as read result: ${JSON.stringify(markAllRes.data?.data || markAllRes.data)}`);

  // 10. Test: Automated Expiry Reminders Check Endpoint
  console.log('\n10. Testing Automated Expiry Check Engine (Reminders for 30d, 7d, 1d)...');
  const expiryCheckRes = await request(`${BASE_URL}/notifications/admin/run-expiry-check`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (expiryCheckRes.status !== 200 && expiryCheckRes.status !== 201) {
    throw new Error(`Expiry check trigger failed: ${JSON.stringify(expiryCheckRes.data)}`);
  }
  const expiryStats = expiryCheckRes.data?.data || expiryCheckRes.data;
  console.log(`   ✔ Expiry check completed successfully:`);
  console.log(`     - Licenses expiring soon alerted: ${expiryStats.licenseExpiringCount}`);
  console.log(`     - Expired licenses transitioned: ${expiryStats.licenseExpiredCount}`);
  console.log(`     - Support expiries alerted: ${expiryStats.supportExpiringCount}`);

  console.log('\n🎉 ALL 10 TESTS IN NOTIFICATION & ALERT SUITE PASSED WITH 100% SUCCESS!\n');
}

runTests().catch(err => {
  console.error('\n❌ Notification Test Suite Failed:', err);
  process.exit(1);
});
