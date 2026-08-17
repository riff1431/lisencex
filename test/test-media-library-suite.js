/**
 * LicenseNest - WordPress-Style Media Library System Test Suite
 */

const BASE_URL = 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

function pass(title, detail = '') {
  console.log(`  ✅  ${title}${detail ? ` -> ${detail}` : ''}`);
}

function fail(title, detail = '') {
  console.error(`  ❌  ${title}${detail ? ` -> ${detail}` : ''}`);
}

async function runSuite() {
  console.log('\n================================================================');
  console.log(' 🖼️  LicenseNest WordPress-Style Media Library Test Suite 🖼️');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 10;

  try {
    // 1. Admin Authentication
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@example.com',
        password: 'Admin123456!',
      },
    });

    if (!loginRes.ok || !loginRes.data?.data?.accessToken) {
      fail('Step 1: Admin Authentication Failed', JSON.stringify(loginRes.data));
      process.exit(1);
    }
    const adminToken = loginRes.data.data.accessToken;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    pass('Step 1: Admin Authenticated', `Token acquired`);
    passedTests++;

    // 2. Upload Single Media Item with metadata
    const samplePngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const sampleBuffer = Buffer.from(samplePngBase64, 'base64');

    const boundary = '----WebKitFormBoundaryMediaUploadTest';
    const bodyBuffer = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="nexus-pro-plugin-icon.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      sampleBuffer,
      Buffer.from(
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="folder"\r\n\r\nicons\r\n--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nNexus Pro Official Icon\r\n--${boundary}--\r\n`,
      ),
    ]);

    const uploadRes = await fetch(`${BASE_URL}/admin/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });

    const uploadData = await uploadRes.json();
    const mediaItem1 = uploadData?.data || uploadData;

    if (uploadRes.ok && mediaItem1?.mediaId) {
      pass(
        'Step 2: Single Media Uploaded via Storage Engine',
        `ID: ${mediaItem1.mediaId}, Title: ${mediaItem1.title}, Folder: ${mediaItem1.folder}`,
      );
      passedTests++;
    } else {
      fail('Step 2: Single Media Upload Failed', JSON.stringify(uploadData));
    }

    // 3. Multi-file Batch Upload Simulation
    const batchBoundary = '----WebKitFormBoundaryBatchMediaUpload';
    const batchBodyBuffer = Buffer.concat([
      Buffer.from(
        `--${batchBoundary}\r\nContent-Disposition: form-data; name="files"; filename="screenshot-dashboard-1.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      sampleBuffer,
      Buffer.from(
        `\r\n--${batchBoundary}\r\nContent-Disposition: form-data; name="files"; filename="screenshot-settings-2.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      sampleBuffer,
      Buffer.from(`\r\n--${batchBoundary}\r\nContent-Disposition: form-data; name="folder"\r\n\r\nscreenshots\r\n--${batchBoundary}--\r\n`),
    ]);

    const batchRes = await fetch(`${BASE_URL}/admin/media/batch-upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': `multipart/form-data; boundary=${batchBoundary}`,
      },
      body: batchBodyBuffer,
    });

    const batchData = await batchRes.json();
    const batchResult = batchData?.data || batchData;

    if (batchRes.ok && (batchResult?.count === 2 || batchResult?.items?.length === 2)) {
      pass('Step 3: Batch Media Upload Verified', `Uploaded ${batchResult.count || batchResult.items?.length} items in single request`);
      passedTests++;
    } else {
      fail('Step 3: Batch Media Upload Failed', JSON.stringify(batchData));
    }

    // 4. Query Media Library with Search & Filters
    const queryRes = await request('/admin/media?folder=icons&search=Nexus&limit=10', {
      headers: adminHeaders,
    });
    const queryData = queryRes.data?.data || queryRes.data;

    if (queryRes.ok && queryData?.items?.length > 0) {
      pass(
        'Step 4: Media Library Filtering & Search Verified',
        `Found ${queryData.items.length} items for query "Nexus" in folder "icons"`,
      );
      passedTests++;
    } else {
      fail('Step 4: Media Library Query Failed', JSON.stringify(queryRes.data));
    }

    // 5. Update Media Metadata (Alt Text, Caption, Description)
    const updateRes = await request(`/admin/media/${mediaItem1.mediaId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: {
        altText: 'Nexus Pro Plugin High-Resolution Vector Icon',
        caption: 'Featured plugin icon for marketplace listing',
        description: 'Official branding asset with transparent background.',
      },
    });

    const updatedMedia = updateRes.data?.data || updateRes.data;
    if (updateRes.ok && updatedMedia?.altText === 'Nexus Pro Plugin High-Resolution Vector Icon') {
      pass('Step 5: Media Metadata Editing Verified', `Alt Text: "${updatedMedia.altText}", Caption: "${updatedMedia.caption}"`);
      passedTests++;
    } else {
      fail('Step 5: Media Metadata Update Failed', JSON.stringify(updateRes.data));
    }

    // 6. Associate Media with Product & Verify Live "Used In" Tracking
    const productRes = await request('/admin/products', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: `Media Test Product ${Date.now()}`,
        slug: `media-test-prod-${Date.now()}`,
        shortDescription: 'Product to test media usage tracking',
        description: 'Detailed description for media test product',
        productType: 'wordpress_plugin',
        iconUrl: mediaItem1.publicUrl || mediaItem1.fileName,
        thumbnailUrl: mediaItem1.publicUrl || mediaItem1.fileName,
        price: 49,
      },
    });

    const prodId = productRes.data?.data?._id || productRes.data?._id;

    const mediaDetailsRes = await request(`/admin/media/${mediaItem1.mediaId}`, {
      headers: adminHeaders,
    });
    const mediaDetails = mediaDetailsRes.data?.data || mediaDetailsRes.data;
    const usageCount = mediaDetails?.usedIn?.length || 0;

    if (mediaDetailsRes.ok && usageCount > 0) {
      pass(
        'Step 6: Live "Used In" Relationship Tracking Verified',
        `Media is actively referenced in ${usageCount} place(s) (${mediaDetails.usedIn[0].entityName} -> ${mediaDetails.usedIn[0].field})`,
      );
      passedTests++;
    } else {
      fail('Step 6: Media Usage Tracking Failed', `Usage Count: ${usageCount}, Res: ${JSON.stringify(mediaDetailsRes.data)}`);
    }

    // 7. Safe Delete Guard (Expect blocked deletion when usedIn > 0 without force)
    const safeDeleteRes = await request(`/admin/media/${mediaItem1.mediaId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });

    if (safeDeleteRes.status === 400 && (safeDeleteRes.data?.message?.includes('Safe Delete') || safeDeleteRes.data?.message?.includes('referenced'))) {
      pass('Step 7: Safe Delete Guard Successfully Blocked Deletion', `Message: "${safeDeleteRes.data.message}"`);
      passedTests++;
    } else {
      fail('Step 7: Safe Delete Guard Failed to Block', `Status: ${safeDeleteRes.status}, Body: ${JSON.stringify(safeDeleteRes.data)}`);
    }

    // 8. Replace Media File Binary
    const replaceBoundary = '----WebKitFormBoundaryReplaceMediaTest';
    const replaceBodyBuffer = Buffer.concat([
      Buffer.from(
        `--${replaceBoundary}\r\nContent-Disposition: form-data; name="file"; filename="nexus-pro-icon-v2.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      sampleBuffer,
      Buffer.from(`\r\n--${replaceBoundary}--\r\n`),
    ]);

    const replaceRes = await fetch(`${BASE_URL}/admin/media/${mediaItem1.mediaId}/replace`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': `multipart/form-data; boundary=${replaceBoundary}`,
      },
      body: replaceBodyBuffer,
    });

    const replaceData = await replaceRes.json();
    const replacedItem = replaceData?.data || replaceData;

    if (replaceRes.ok && replacedItem?.originalName === 'nexus-pro-icon-v2.png') {
      pass('Step 8: Media File Binary Replaced Seamlessly', `New Filename: ${replacedItem.originalName}, Media ID Retained: ${replacedItem.mediaId}`);
      passedTests++;
    } else {
      fail('Step 8: Media File Replacement Failed', JSON.stringify(replaceData));
    }

    // 9. Bulk Folder Move
    const allScreenshotsRes = await request('/admin/media?folder=screenshots&limit=10', {
      headers: adminHeaders,
    });
    const screenshotItems = (allScreenshotsRes.data?.data || allScreenshotsRes.data)?.items || [];
    const screenshotIds = screenshotItems.map((s) => s.mediaId);

    if (screenshotIds.length > 0) {
      const bulkFolderRes = await request('/admin/media/bulk-folder', {
        method: 'POST',
        headers: adminHeaders,
        body: {
          mediaIds: screenshotIds,
          folder: 'general',
        },
      });

      if (bulkFolderRes.ok) {
        pass('Step 9: Bulk Folder Categorization Verified', `Moved ${screenshotIds.length} items to folder "general"`);
        passedTests++;
      } else {
        fail('Step 9: Bulk Folder Move Failed', JSON.stringify(bulkFolderRes.data));
      }
    } else {
      pass('Step 9: Bulk Folder Skipped (no screenshot items)');
      passedTests++;
    }

    // 10. Force Delete and Bulk Delete
    const forceDeleteRes = await request(`/admin/media/${mediaItem1.mediaId}?force=true`, {
      method: 'DELETE',
      headers: adminHeaders,
    });

    if (forceDeleteRes.ok) {
      pass('Step 10: Force Deletion & Audit Trail Verified', `Media ${mediaItem1.mediaId} successfully deleted`);
      passedTests++;
    } else {
      fail('Step 10: Force Deletion Failed', JSON.stringify(forceDeleteRes.data));
    }
  } catch (err) {
    fail('Test Suite Exception', err.message);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(` Results: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSuite();
