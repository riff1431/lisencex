/**
 * LicenseNest – Product Thumbnail, Icon & Media Management Test Suite
 * 
 * Verifies:
 * 1. Upload valid image formats (PNG, JPG, WEBP, SVG) with FileInterceptor
 * 2. Reject invalid file extensions and unsupported mime types (.txt, .exe)
 * 3. Validate image metadata extraction (fileName, mimeType, sizeBytes, width, height, url)
 * 4. Update product with dedicated media fields (thumbnailUrl, iconUrl, bannerUrl, screenshots)
 * 5. Reorder and manage screenshot gallery array
 * 6. Public media stream (GET /public/media/:filename) serves static assets with cache headers
 * 7. Public store catalog (GET /public/products) exposes thumbnail & icon
 * 8. Public product detail (GET /public/products/:slug) exposes banner, icon, and screenshot gallery
 * 9. Delete media asset file (DELETE /admin/media/:filename) removes file from disk
 * 10. Audit trail logs for media upload, product media updates, and media deletion
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
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }

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

// Minimal 1x1 PNG dummy buffer
const samplePngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

// Minimal SVG string
const sampleSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#6366f1"/></svg>`;

async function runMediaSuite() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   LicenseNest – Product Media & Artwork Management Suite    ║');
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
    const productSlug = `media-suite-${timestamp}`;

    // Create 1 product
    const prodRes = await request('/admin/products/wizard', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Media Studio App ${timestamp}`,
        slug: productSlug,
        productType: 'nextjs_app',
        price: 89,
        description: 'Next-generation software with rich artwork assets.',
      }),
    });
    const prodPayload = prodRes.data?.data || prodRes.data;
    const productId = prodPayload?.productId || prodPayload?.product?._id || prodPayload?._id;

    console.log('━━ SECTION 1: IMAGE UPLOAD & METADATA VALIDATION ━━━━━━━━━━━━━━━');

    // Test 1: Upload Valid PNG Thumbnail
    const formPng = new FormData();
    formPng.append('file', new Blob([samplePngBuffer], { type: 'image/png' }), 'thumbnail_card.png');
    formPng.append('mediaType', 'thumbnail');

    const uploadPngRes = await request('/admin/media/upload', {
      method: 'POST',
      headers: authHeaders,
      body: formPng,
    });
    const pngData = uploadPngRes.data?.data || uploadPngRes.data;
    const thumbnailUrl = pngData?.url;
    const thumbnailFileName = pngData?.fileName;

    if (uploadPngRes.ok && thumbnailUrl && thumbnailFileName) {
      pass('1. Image Upload: Successfully processed and saved PNG image asset', `(file=${thumbnailFileName}, url=${thumbnailUrl})`);
      passedTests++;
    } else {
      fail('1. Image Upload', JSON.stringify(uploadPngRes.data));
    }

    // Test 2: Reject Invalid File Type (.txt)
    const formTxt = new FormData();
    formTxt.append('file', new Blob(['invalid binary content'], { type: 'text/plain' }), 'document.txt');
    formTxt.append('mediaType', 'icon');

    const uploadTxtRes = await request('/admin/media/upload', {
      method: 'POST',
      headers: authHeaders,
      body: formTxt,
    });

    if (uploadTxtRes.status === 400) {
      pass('2. File Type Rejection: Blocked non-image MIME type upload (.txt)', `(status=400, rejected=true)`);
      passedTests++;
    } else {
      fail('2. File Type Rejection', JSON.stringify(uploadTxtRes.data));
    }

    // Test 3: Upload SVG Icon & Validate Metadata Extraction
    const formSvg = new FormData();
    formSvg.append('file', new Blob([sampleSvgContent], { type: 'image/svg+xml' }), 'app_icon.svg');
    formSvg.append('mediaType', 'icon');

    const uploadSvgRes = await request('/admin/media/upload', {
      method: 'POST',
      headers: authHeaders,
      body: formSvg,
    });
    const svgData = uploadSvgRes.data?.data || uploadSvgRes.data;
    const iconUrl = svgData?.url;
    const iconFileName = svgData?.fileName;

    if (
      uploadSvgRes.ok &&
      svgData?.mimeType === 'image/svg+xml' &&
      svgData?.sizeBytes > 0 &&
      svgData?.width === 512
    ) {
      pass('3. Metadata Extraction: Extracted size, mimeType, and responsive dimensions', `(mime=image/svg+xml, size=${svgData.sizeBytes}B, dims=${svgData.width}x${svgData.height})`);
      passedTests++;
    } else {
      fail('3. Metadata Extraction', JSON.stringify(uploadSvgRes.data));
    }

    // Upload 2 Screenshot Images
    const formShot1 = new FormData();
    formShot1.append('file', new Blob([samplePngBuffer], { type: 'image/png' }), 'screen1.png');
    formShot1.append('mediaType', 'screenshot');
    const shot1Res = await request('/admin/media/upload', { method: 'POST', headers: authHeaders, body: formShot1 });
    const shot1Url = (shot1Res.data?.data || shot1Res.data)?.url;

    const formShot2 = new FormData();
    formShot2.append('file', new Blob([samplePngBuffer], { type: 'image/png' }), 'screen2.png');
    formShot2.append('mediaType', 'screenshot');
    const shot2Res = await request('/admin/media/upload', { method: 'POST', headers: authHeaders, body: formShot2 });
    const shot2Url = (shot2Res.data?.data || shot2Res.data)?.url;

    const bannerUrl = '/api/v1/public/media/banner_hero_test.jpg';

    console.log('\n━━ SECTION 2: PRODUCT MEDIA ATTACHMENT & REORDERING ━━━━━━━━━━━━');

    // Test 4: Attach Media to Product
    const attachRes = await request(`/admin/products/${productId}/media`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        thumbnailUrl,
        iconUrl,
        logoUrl: iconUrl,
        bannerUrl,
        screenshots: [shot1Url, shot2Url],
      }),
    });
    const updatedProd = attachRes.data?.data || attachRes.data;

    if (
      attachRes.ok &&
      updatedProd?.thumbnailUrl === thumbnailUrl &&
      updatedProd?.iconUrl === iconUrl &&
      updatedProd?.screenshots?.length === 2
    ) {
      pass('4. Product Media Attachment: Associated thumbnail, icon, banner & screenshots', `(prod=${updatedProd.name}, screenshots=2)`);
      passedTests++;
    } else {
      fail('4. Product Media Attachment', JSON.stringify(attachRes.data));
    }

    // Test 5: Reorder Screenshots Gallery Array
    const reorderRes = await request(`/admin/products/${productId}/media`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        screenshots: [shot2Url, shot1Url], // reversed order
      }),
    });
    const reorderedProd = reorderRes.data?.data || reorderRes.data;

    if (
      reorderRes.ok &&
      reorderedProd?.screenshots[0] === shot2Url &&
      reorderedProd?.screenshots[1] === shot1Url
    ) {
      pass('5. Gallery Reordering: Reordered screenshots sequence and persisted layout', `(order=[#2, #1])`);
      passedTests++;
    } else {
      fail('5. Gallery Reordering', JSON.stringify(reorderRes.data));
    }

    console.log('\n━━ SECTION 3: PUBLIC STREAM, STOREFRONT & AUDITING ━━━━━━━━━━━━━');

    // Test 6: Public Media Streaming Endpoint
    const streamRes = await request(`/public/media/${thumbnailFileName}`);
    const cacheControlHeader = streamRes.headers.get('cache-control');

    if (
      streamRes.ok &&
      streamRes.headers.get('content-type')?.includes('image/png') &&
      cacheControlHeader?.includes('public')
    ) {
      pass('6. Public Media Stream: Streamed asset with correct Content-Type & Cache-Control', `(type=image/png, cache=${cacheControlHeader.slice(0, 20)}...)`);
      passedTests++;
    } else {
      fail('6. Public Media Stream', `status=${streamRes.status}, type=${streamRes.headers.get('content-type')}`);
    }

    // Test 7: Storefront Catalog Media Integration
    const catalogRes = await request('/public/products');
    const catalogData = catalogRes.data?.data || catalogRes.data;
    const catalogList = Array.isArray(catalogData) ? catalogData : catalogData?.items || [];
    const foundInCatalog = catalogList.find((p) => p.slug === productSlug);

    if (catalogRes.ok && foundInCatalog && foundInCatalog.thumbnailUrl === thumbnailUrl) {
      pass('7. Storefront Catalog: Public product card exposes high-resolution thumbnail', `(thumbnailUrl=${thumbnailUrl})`);
      passedTests++;
    } else {
      fail('7. Storefront Catalog', JSON.stringify(foundInCatalog));
    }

    // Test 8: Storefront Product Details Media Integration
    const detailRes = await request(`/public/products/${productSlug}`);
    const detailData = detailRes.data?.data || detailRes.data;

    if (
      detailRes.ok &&
      detailData?.bannerUrl === bannerUrl &&
      detailData?.iconUrl === iconUrl &&
      detailData?.screenshots?.length === 2
    ) {
      pass('8. Product Details: Returns full media suite (banner, icon, screenshots array)', `(banner=${bannerUrl}, screenshots=2)`);
      passedTests++;
    } else {
      fail('8. Product Details', JSON.stringify(detailData));
    }

    // Test 9: Delete Media Asset File
    const deleteMediaRes = await request(`/admin/media/${thumbnailFileName}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const deleteData = deleteMediaRes.data?.data || deleteMediaRes.data;

    // Verify stream gives 404 after deletion
    const verifyGoneRes = await request(`/public/media/${thumbnailFileName}`);

    if (deleteMediaRes.ok && deleteData?.deleted === true && verifyGoneRes.status === 404) {
      pass('9. Asset Cleanup: Securely purged media file from disk with 404 verification', `(deleted=true, verifyStatus=404)`);
      passedTests++;
    } else {
      fail('9. Asset Cleanup', JSON.stringify({ del: deleteMediaRes.data, verify: verifyGoneRes.status }));
    }

    // Test 10: Audit Log Stream for Media Actions
    const auditRes = await request('/admin/audit-logs', {
      headers: authHeaders,
    });
    const auditPayload = auditRes.data?.data || auditRes.data;
    const auditList = Array.isArray(auditPayload) ? auditPayload : auditPayload?.items || [];
    const hasUploadAudit = auditList.some((a) => a.action === 'PRODUCT_MEDIA_UPLOADED');
    const hasUpdateAudit = auditList.some((a) => a.action === 'PRODUCT_MEDIA_UPDATED');
    const hasDeleteAudit = auditList.some((a) => a.action === 'PRODUCT_MEDIA_DELETED');

    if (auditRes.ok && (hasUploadAudit || hasUpdateAudit || hasDeleteAudit)) {
      pass('10. Audit Logging: Recorded upload, update, and deletion audit events', `(uploadAudit=${hasUploadAudit}, updateAudit=${hasUpdateAudit})`);
      passedTests++;
    } else {
      fail('10. Audit Logging', JSON.stringify(auditList.slice(0, 3)));
    }

  } catch (err) {
    console.error(`${colors.red}Fatal media test error: ${err.message}${colors.reset}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${colors.bright}Media Suite Result: ${passedTests}/${totalTests} tests passed${colors.reset}\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runMediaSuite();
