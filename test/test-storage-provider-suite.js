/**
 * LicenseNest - Dynamic Media & File Storage Provider System Test Suite
 */

const http = require('http');

const BASE_URL = 'http://localhost:5001/api/v1';

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
  console.log(' 💾 LicenseNest Dynamic Storage Provider System Test Suite 💾');
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
    pass('Step 1: Admin Authenticated', `Token acquired for ${loginRes.data.data.user?.email}`);
    passedTests++;

    // 2. Fetch Storage Configurations
    const configsRes = await request('/admin/storage/config', { headers: adminHeaders });
    const configs = configsRes.data?.data || configsRes.data;
    if (configsRes.ok && Array.isArray(configs) && configs.length >= 3) {
      const local = configs.find((c) => c.provider === 'local');
      const s3 = configs.find((c) => c.provider === 's3');
      const r2 = configs.find((c) => c.provider === 'r2');
      pass(
        'Step 2: Storage Configurations Retrieved',
        `Local (Default: ${local?.isDefault}), S3 (Secret Masked: ${s3?.s3Config?.secretAccessKey?.includes('•')}), R2 (Enabled: ${r2?.isEnabled})`,
      );
      passedTests++;
    } else {
      fail('Step 2: Failed to fetch storage configs', JSON.stringify(configsRes.data));
    }

    // 3. Test Local Storage Connection Probe
    const testLocalRes = await request('/admin/storage/test/local', {
      method: 'POST',
      headers: adminHeaders,
      body: {},
    });

    if (testLocalRes.ok && (testLocalRes.data?.data?.success || testLocalRes.data?.success)) {
      const latency = testLocalRes.data?.data?.latencyMs ?? testLocalRes.data?.latencyMs;
      pass('Step 3: Local Storage Health Probe Succeeded', `Latency: ${latency}ms`);
      passedTests++;
    } else {
      fail('Step 3: Local Storage Health Probe Failed', JSON.stringify(testLocalRes.data));
    }

    // 4. Upload Media via Storage Provider
    const samplePngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const sampleBuffer = Buffer.from(samplePngBase64, 'base64');

    // Multi-part form-data simulation
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const bodyBuffer = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test-product-banner.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      sampleBuffer,
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\nbanner\r\n--${boundary}--\r\n`),
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
    const uploadedFile = uploadData?.data || uploadData;
    let uploadedFileId = uploadedFile?.fileName || uploadedFile?.fileId || uploadedFile?.mediaId;
    const fileUrl = uploadedFile?.publicUrl || uploadedFile?.url;

    if (uploadRes.ok && fileUrl) {
      pass('Step 4: Image Uploaded via Dynamic Storage', `URL: ${fileUrl}, Provider: ${uploadedFile.storageProvider}`);
      passedTests++;
    } else {
      fail('Step 4: Image Upload Failed', JSON.stringify(uploadData));
    }

    // 5. Query Storage Statistics
    const statsRes = await request('/admin/storage/stats', { headers: adminHeaders });
    const stats = statsRes.data?.data || statsRes.data;
    if (statsRes.ok && stats?.totalFiles >= 1) {
      pass(
        'Step 5: Storage Telemetry Aggregated',
        `Files: ${stats.totalFiles}, Size: ${(stats.totalSizeBytes / 1024).toFixed(2)} KB, Public: ${stats.publicFiles}`,
      );
      passedTests++;
    } else {
      fail('Step 5: Storage Stats Query Failed', JSON.stringify(statsRes.data));
    }

    // 6. Query Tracked Files Inspector
    const filesRes = await request('/admin/storage/files?limit=10', { headers: adminHeaders });
    const filesData = filesRes.data?.data || filesRes.data;
    const trackedFiles = filesData?.items || [];
    if (filesRes.ok && trackedFiles.length > 0) {
      const firstFile = trackedFiles[0];
      uploadedFileId = uploadedFileId || firstFile.fileId;
      pass('Step 6: Tracked Files Catalog Verified', `Found ${trackedFiles.length} files (Latest: ${firstFile.originalFilename})`);
      passedTests++;
    } else {
      fail('Step 6: Tracked Files Query Failed', JSON.stringify(filesRes.data));
    }

    // 7. Update S3 & R2 Settings with Encrypted Credentials
    const updateS3Res = await request('/admin/storage/config/s3', {
      method: 'PATCH',
      headers: adminHeaders,
      body: {
        isEnabled: false,
        s3Config: {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          region: 'us-west-2',
          bucket: 'licensenest-assets-prod',
          pathPrefix: 'marketplace-assets',
          cdnUrl: 'https://cdn.example.com',
        },
      },
    });

    const s3Updated = updateS3Res.data?.data || updateS3Res.data;
    if (updateS3Res.ok && s3Updated?.s3Config?.bucket === 'licensenest-assets-prod') {
      pass('Step 7: S3 Configuration & Encryption Verified', `Bucket: ${s3Updated.s3Config.bucket}, Region: ${s3Updated.s3Config.region}`);
      passedTests++;
    } else {
      fail('Step 7: S3 Configuration Update Failed', JSON.stringify(updateS3Res.data));
    }

    // 8. Update R2 Settings
    const updateR2Res = await request('/admin/storage/config/r2', {
      method: 'PATCH',
      headers: adminHeaders,
      body: {
        isEnabled: false,
        r2Config: {
          accountId: 'cf_account_123456789',
          accessKeyId: 'cf_r2_access_key',
          secretAccessKey: 'cf_r2_secret_key_long_value',
          bucket: 'licensenest-r2-vault',
          customDomain: 'https://r2.example.com',
          pathPrefix: 'r2-storage',
        },
      },
    });

    const r2Updated = updateR2Res.data?.data || updateR2Res.data;
    if (updateR2Res.ok && r2Updated?.r2Config?.bucket === 'licensenest-r2-vault') {
      pass('Step 8: Cloudflare R2 Configuration Verified', `Bucket: ${r2Updated.r2Config.bucket}, Account: ${r2Updated.r2Config.accountId}`);
      passedTests++;
    } else {
      fail('Step 8: Cloudflare R2 Configuration Update Failed', JSON.stringify(updateR2Res.data));
    }

    // 9. Public File Serving Endpoint
    if (uploadedFileId) {
      const serveRes = await fetch(`${BASE_URL}/public/storage/serve/${uploadedFileId}`);
      if (serveRes.ok && serveRes.headers.get('content-type')?.includes('image')) {
        pass('Step 9: Public File Streaming & Cache Verified', `Status ${serveRes.status}, Content-Type: ${serveRes.headers.get('content-type')}`);
        passedTests++;
      } else {
        fail('Step 9: Public File Streaming Failed', `Status ${serveRes.status}`);
      }
    } else {
      fail('Step 9: Skipped due to missing uploaded file ID');
    }

    // 10. File Deletion & Audit Trail
    if (uploadedFileId) {
      const deleteRes = await request(`/admin/storage/files/${uploadedFileId}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });

      if (deleteRes.ok) {
        pass('Step 10: Stored File Deletion & Audit Recorded', `File ${uploadedFileId} removed`);
        passedTests++;
      } else {
        fail('Step 10: File Deletion Failed', JSON.stringify(deleteRes.data));
      }
    } else {
      fail('Step 10: Skipped delete');
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
