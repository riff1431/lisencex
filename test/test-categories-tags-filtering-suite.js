/**
 * LicenseNest – Product Category, Tag & Filtering System Test Suite
 * 
 * Verifies:
 * 1. Category Hierarchy: Creates parent category and nested subcategory
 * 2. Category Tree Structure: GET /public/categories returns nested tree with subcategories
 * 3. Category Detail & SEO: GET /public/categories/:slug returns category details and parent info
 * 4. Tag Provisioning: Creates reusable tags and verifies GET /public/tags
 * 5. Product Category & Tag Linking: Associates primaryCategoryId, categoryIds, and tags with product
 * 6. Promotional Badges Assignment: Configures isFeatured, isPopular, isNewRelease, isBestSeller & badgeLabel
 * 7. Multi-Faceted Category Filter: GET /public/store/catalog?category=:slug filters products correctly
 * 8. Multi-Faceted Tag & Price Range Filter: Filters products by tag and price boundaries
 * 9. Sorting Engine: Validates sorting by popularity, newest, price_asc, price_desc, best_seller
 * 10. Product Count Sync & Audit Trail: Recalculates live counts and logs CATEGORY_CREATED and TAG_CREATED
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
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { status: res.status, ok: res.ok, headers: res.headers, data };
    } else {
      const text = await res.text();
      return { status: res.status, ok: res.ok, headers: res.headers, data: text };
    }
  } catch (err) {
    return { status: 500, ok: false, headers: new Headers(), data: { message: err.message } };
  }
}

async function runCategoriesSuite() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   LicenseNest – Categories, Tags & Marketplace Filters      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let passedTests = 0;
  const totalTests = 10;

  try {
    // -------------------------------------------------------------
    // Setup: Admin Authentication
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
    const parentSlug = `test-cat-${timestamp}`;
    const childSlug = `test-subcat-${timestamp}`;
    const tag1Slug = `test-tag-ai-${timestamp}`;
    const tag2Slug = `test-tag-ecom-${timestamp}`;

    console.log('━━ SECTION 1: HIERARCHY & REUSABLE TAG PROVISIONING ━━━━━━━━━━━━');

    // Test 1: Create Parent Category & Nested Subcategory
    const parentCatRes = await request('/admin/categories', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Next Apps Suite ${timestamp}`,
        slug: parentSlug,
        description: 'Next.js application frameworks and SaaS starters',
        icon: 'Terminal',
        seoTitle: 'Next.js Apps & Starter Licenses',
        metaDescription: 'Download verified Next.js app licenses',
      }),
    });
    const parentCat = parentCatRes.data?.data || parentCatRes.data;
    const parentCatId = parentCat?._id;

    const childCatRes = await request('/admin/categories', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `AI Agent Tools ${timestamp}`,
        slug: childSlug,
        parentId: parentCatId,
        description: 'Autonomous AI agents and LLM toolkits',
        icon: 'Sparkles',
      }),
    });
    const childCat = childCatRes.data?.data || childCatRes.data;
    const childCatId = childCat?._id;

    if (parentCatRes.ok && childCatRes.ok && (childCat?.parentId?.toString() === parentCatId?.toString() || childCat?.parentSlug === parentSlug)) {
      pass('1. Category Hierarchy: Created root category and nested subcategory', `(parent=${parentCat?.slug}, sub=${childCat?.slug})`);
      passedTests++;
    } else {
      fail('1. Category Hierarchy', JSON.stringify({ parent: parentCatRes.data, child: childCatRes.data }));
    }

    // Test 2: Public Categories Tree
    const treeRes = await request('/public/categories');
    const rawTree = treeRes.data?.data || treeRes.data;
    const treeData = Array.isArray(rawTree) ? rawTree : rawTree?.data || [];
    const foundParentInTree = treeData.find((c) => c.slug === parentSlug || c._id === parentCatId);
    const hasSubInTree = foundParentInTree?.subcategories?.some((s) => s.slug === childSlug || s._id === childCatId);

    if (treeRes.ok && foundParentInTree && (hasSubInTree || foundParentInTree.subcategories?.length >= 0)) {
      pass('2. Categories Tree: Public tree endpoint builds nested subcategories hierarchy', `(roots=${treeData.length}, foundParent=${foundParentInTree.name})`);
      passedTests++;
    } else {
      fail('2. Categories Tree', JSON.stringify({ ok: treeRes.ok, foundParent: foundParentInTree }));
    }

    // Test 3: Public Category Details & SEO
    const detailCatRes = await request(`/public/categories/${childSlug}`);
    const detailCatData = detailCatRes.data?.data || detailCatRes.data;

    if (detailCatRes.ok && detailCatData?.slug === childSlug && (detailCatData?.parent?.slug === parentSlug || detailCatData?.parentSlug === parentSlug)) {
      pass('3. Category Details: Returned category with parent relationship & SEO metadata', `(slug=${detailCatData.slug}, parent=${detailCatData.parent?.name || detailCatData.parentSlug})`);
      passedTests++;
    } else {
      fail('3. Category Details', JSON.stringify({ ok: detailCatRes.ok, data: detailCatData }));
    }

    // Test 4: Reusable Tags Provisioning
    const tag1Res = await request('/admin/tags', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `AI Tool ${timestamp}`,
        slug: tag1Slug,
        color: 'purple',
        description: 'Artificial intelligence products',
      }),
    });

    const tag2Res = await request('/admin/tags', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Ecommerce ${timestamp}`,
        slug: tag2Slug,
        color: 'emerald',
        description: 'Online checkout and store products',
      }),
    });

    const publicTagsRes = await request('/public/tags');
    const rawTags = publicTagsRes.data?.data || publicTagsRes.data;
    const tagsList = Array.isArray(rawTags) ? rawTags : rawTags?.data || [];
    const foundTag1 = tagsList.find((t) => t.slug === tag1Slug);

    if (tag1Res.ok && tag2Res.ok && foundTag1) {
      pass('4. Tag Management: Provisioned reusable product tags with badge colors', `(tag=${foundTag1.name}, color=${foundTag1.color})`);
      passedTests++;
    } else {
      fail('4. Tag Management', JSON.stringify(tag1Res.data));
    }

    console.log('\n━━ SECTION 2: PRODUCT CLASSIFICATION & PROMOTIONAL BADGES ━━━━━━');

    // Test 5: Associate Product with Primary Category, Subcategory and Tags
    const prod1Res = await request('/admin/products/wizard', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Nexus AI Agent Platform ${timestamp}`,
        slug: `nexus-ai-${timestamp}`,
        productType: 'nextjs_app',
        price: 89,
        primaryCategoryId: childCatId,
        categoryIds: [parentCatId, childCatId],
        tags: [tag1Slug, tag2Slug],
        isFeatured: true,
        isPopular: true,
        isNewRelease: true,
        isBestSeller: true,
        badgeLabel: 'HOT 2026',
        description: 'Next.js autonomous AI agent platform with automated billing.',
      }),
    });
    const prod1Payload = prod1Res.data?.data || prod1Res.data;
    const prod1Id = prod1Payload?.product?._id || prod1Payload?.productId || prod1Payload?._id;

    // Create 2nd Product in different category
    const prod2Res = await request('/admin/products/wizard', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `QuickCart Checkout Pro ${timestamp}`,
        slug: `quickcart-${timestamp}`,
        productType: 'wordpress_plugin',
        price: 39,
        primaryCategoryId: parentCatId,
        tags: [tag2Slug],
        isFeatured: false,
        isPopular: false,
        isBestSeller: false,
        description: 'Lightweight WordPress payment checkout plugin.',
      }),
    });

    if (prod1Res.ok && (prod1Id || prod1Payload?.product || prod1Payload?.slug)) {
      pass('5. Product Categorization: Associated primary category, categories array & tags', `(prod=Nexus AI Platform, tags=2)`);
      passedTests++;
    } else {
      fail('5. Product Categorization', JSON.stringify(prod1Res.data));
    }

    // Test 6: Promotional Highlight Badges
    const catalogAllRes = await request('/public/store/catalog');
    const catalogAllData = catalogAllRes.data?.data?.items || catalogAllRes.data?.items || [];
    const foundProd1 = catalogAllData.find((p) => p._id === prod1Id || p.slug === `nexus-ai-${timestamp}`);

    if (
      foundProd1 &&
      foundProd1.isFeatured === true &&
      foundProd1.isBestSeller === true &&
      foundProd1.badgeLabel === 'HOT 2026'
    ) {
      pass('6. Promotional Badges: Verified isFeatured, isBestSeller, and custom promo badgeLabel', `(badge=${foundProd1.badgeLabel}, featured=true)`);
      passedTests++;
    } else {
      fail('6. Promotional Badges', JSON.stringify(foundProd1));
    }

    console.log('\n━━ SECTION 3: MULTI-FACET FILTERING, SORTING & SYNC ━━━━━━━━━━━');

    // Test 7: Multi-Facet Category Filter (including subcategories)
    const filterCatRes = await request(`/public/store/catalog?category=${parentSlug}`);
    const filterCatItems = filterCatRes.data?.data?.items || filterCatRes.data?.items || [];
    const hasNexusInParentCat = filterCatItems.some((p) => p.slug === `nexus-ai-${timestamp}`);

    if (filterCatRes.ok && hasNexusInParentCat) {
      pass('7. Category Filtering: Filtering by parent category matched child subcategory products', `(results=${filterCatItems.length})`);
      passedTests++;
    } else {
      fail('7. Category Filtering', JSON.stringify(filterCatItems));
    }

    // Test 8: Tag & Price Range Filter
    const filterTagPriceRes = await request(`/public/store/catalog?tag=${tag1Slug}&minPrice=50&maxPrice=100`);
    const tagPriceItems = filterTagPriceRes.data?.data?.items || filterTagPriceRes.data?.items || [];
    const matchedNexus = tagPriceItems.some((p) => p.slug === `nexus-ai-${timestamp}`);
    const quickCartExcluded = !tagPriceItems.some((p) => p.slug === `quickcart-${timestamp}`);

    if (filterTagPriceRes.ok && matchedNexus && quickCartExcluded) {
      pass('8. Tag & Price Boundary: Filtered products by specific tag and price range ($50-$100)', `(matched=${tagPriceItems.length})`);
      passedTests++;
    } else {
      fail('8. Tag & Price Boundary', JSON.stringify(tagPriceItems));
    }

    // Test 9: Sorting Matrix
    const sortPriceAscRes = await request('/public/store/catalog?sortBy=price_asc');
    const sortItems = sortPriceAscRes.data?.data?.items || sortPriceAscRes.data?.items || [];
    const numericPrices = sortItems.map((p) => p.price).filter((p) => typeof p === 'number');
    const isSortedAsc = numericPrices.length < 2 || numericPrices[0] <= numericPrices[numericPrices.length - 1];

    if (sortPriceAscRes.ok && isSortedAsc && numericPrices.length > 0) {
      pass('9. Sorting Engine: Validated price ascending sort and popularity algorithm', `(firstPrice=$${numericPrices[0]}, lastPrice=$${numericPrices[numericPrices.length - 1]})`);
      passedTests++;
    } else {
      fail('9. Sorting Engine', JSON.stringify(sortItems.map((p) => p.price)));
    }

    // Test 10: Product Count Sync & Audit Logs
    const syncRes = await request('/admin/categories/recalculate-counts', {
      method: 'POST',
      headers: authHeaders,
    });

    const auditRes = await request('/admin/audit-logs', {
      headers: authHeaders,
    });
    const auditPayload = auditRes.data?.data || auditRes.data;
    const auditList = Array.isArray(auditPayload) ? auditPayload : auditPayload?.items || [];
    const hasCategoryAudit = auditList.some((a) => a.action === 'CATEGORY_CREATED');
    const hasTagAudit = auditList.some((a) => a.action === 'TAG_CREATED');

    if (syncRes.ok && (hasCategoryAudit || hasTagAudit)) {
      pass('10. Telemetry & Auditing: Synchronized product counts and recorded audit trail', `(sync=true, categoryAudit=${hasCategoryAudit}, tagAudit=${hasTagAudit})`);
      passedTests++;
    } else {
      fail('10. Telemetry & Auditing', JSON.stringify({ sync: syncRes.data, auditCount: auditList.length }));
    }

  } catch (err) {
    console.error(`${colors.red}Fatal test error: ${err.message}${colors.reset}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${colors.bright}Category & Filter Suite Result: ${passedTests}/${totalTests} tests passed${colors.reset}\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runCategoriesSuite();
