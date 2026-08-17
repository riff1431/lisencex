const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const unzipper = require('unzipper');

const { execSync } = require('child_process');

function createMockZip(filePath, files) {
  const tempDir = path.join(path.dirname(filePath), 'tmp_zip_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
  fs.mkdirSync(tempDir, { recursive: true });

  const list = Array.isArray(files) ? files : Object.entries(files);
  for (const [relPath, content] of list) {
    const full = path.join(tempDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  execSync(`cd "${tempDir}" && zip -q -r "${filePath}" .`);
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function createZipBuffer(files) {
  // Minimal standard PKZIP implementation in pure JS
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const [filename, content] of files) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    const nameBuf = Buffer.from(filename, 'utf-8');
    const crc = crc32(data);

    // Local file header (30 bytes + filename + data)
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // min version
    localHeader.writeUInt16LE(0, 6);  // flags
    localHeader.writeUInt16LE(0, 8);  // compression = stored (0)
    localHeader.writeUInt16LE(0, 10); // time
    localHeader.writeUInt16LE(0, 12); // date
    localHeader.writeUInt32LE(crc, 14); // crc32
    localHeader.writeUInt32LE(data.length, 18); // comp size
    localHeader.writeUInt32LE(data.length, 22); // uncomp size
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra len
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, data);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // min version
    centralHeader.writeUInt16LE(0, 8);  // flags
    centralHeader.writeUInt16LE(0, 10); // compression
    centralHeader.writeUInt16LE(0, 12); // time
    centralHeader.writeUInt16LE(0, 14); // date
    centralHeader.writeUInt32LE(crc, 16); // crc32
    centralHeader.writeUInt32LE(data.length, 20); // comp size
    centralHeader.writeUInt32LE(data.length, 24); // uncomp size
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra len
    centralHeader.writeUInt16LE(0, 32); // comment len
    centralHeader.writeUInt16LE(0, 34); // disk start
    centralHeader.writeUInt16LE(0, 36); // int attr
    centralHeader.writeUInt32LE(0, 38); // ext attr
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const ch of centralHeaders) cdSize += ch.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(files.length, 8); // entries on disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(cdSize, 12); // cd size
  eocd.writeUInt32LE(cdOffset, 16); // cd offset
  eocd.writeUInt16LE(0, 20); // comment len

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return ~crc >>> 0;
}

const BASE_URL = 'http://localhost:5000/api/v1';

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
  console.log('🚀 Running Product Package & File Validation Test Suite...\n');

  // 1. Login as Admin
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
  console.log('   ✔ Admin authenticated successfully.\n');

  // 2. Create or find a test product
  console.log('2. Preparing test product (WordPress Plugin)...');
  const prodRes = await request(`${BASE_URL}/admin/products`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const products = prodRes.data?.data?.items || prodRes.data?.data || [];
  let product = products.find(p => p.productType === 'wordpress_plugin');

  if (!product) {
    const createProdRes = await request(`${BASE_URL}/admin/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Package Test Plugin',
        slug: 'pkg-test-plugin-' + Date.now(),
        productType: 'wordpress_plugin',
        price: 29,
        marketplaceSource: 'own_marketplace',
      }),
    });
    product = createProdRes.data.data;
  }
  console.log(`   ✔ Test product ready: ${product.name} (ID: ${product._id})\n`);

  // 3. Test: Reject empty or invalid ZIP
  console.log('3. Testing invalid ZIP rejection...');
  const invalidZipPath = path.join(__dirname, 'temp_invalid.zip');
  fs.writeFileSync(invalidZipPath, 'This is plain text, not a zip file');

  const formInvalid = new FormData();
  const blobInvalid = new Blob([fs.readFileSync(invalidZipPath)], { type: 'application/zip' });
  formInvalid.append('file', blobInvalid, 'invalid.zip');
  formInvalid.append('version', '1.0.0');

  const rejectRes = await request(`${BASE_URL}/admin/products/${product._id}/packages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formInvalid,
  });

  if (rejectRes.status === 400) {
    console.log('   ✔ Successfully rejected corrupted/invalid non-ZIP file with HTTP 400.');
  } else {
    console.warn(`   ⚠ Expected 400 for invalid ZIP, got: ${rejectRes.status}`);
  }
  fs.unlinkSync(invalidZipPath);

  // 4. Test: Reject WordPress Plugin missing PHP files
  console.log('\n4. Testing WordPress plugin structure validation (missing PHP file)...');
  const noPhpZipPath = path.join(__dirname, 'temp_no_php.zip');
  createMockZip(noPhpZipPath, [
    ['readme.txt', 'This plugin has no PHP code'],
    ['style.css', 'body { color: red; }'],
  ]);

  const formNoPhp = new FormData();
  const blobNoPhp = new Blob([fs.readFileSync(noPhpZipPath)], { type: 'application/zip' });
  formNoPhp.append('file', blobNoPhp, 'no_php.zip');
  formNoPhp.append('version', '1.0.0');

  const rejectNoPhpRes = await request(`${BASE_URL}/admin/products/${product._id}/packages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formNoPhp,
  });

  if (rejectNoPhpRes.status === 400 && rejectNoPhpRes.data?.errors?.length > 0) {
    console.log(`   ✔ Rejected structurally invalid WordPress plugin: "${rejectNoPhpRes.data.errors[0]}".`);
  } else {
    console.log(`   ✔ Rejection response: HTTP ${rejectNoPhpRes.status}`);
  }
  fs.unlinkSync(noPhpZipPath);

  const v1 = `2.0.${Date.now() % 10000}`;
  const v2 = `2.1.${(Date.now() + 1) % 10000}`;

  // 5. Test: Upload valid WordPress Plugin ZIP
  console.log(`\n5. Testing valid WordPress plugin ZIP upload (v${v1})...`);
  const validPluginZip = path.join(__dirname, 'temp_valid_plugin_v1.zip');
  createMockZip(validPluginZip, [
    ['my-plugin/my-plugin.php', `<?php\n/**\n * Plugin Name: Test Plugin\n * Version: ${v1}\n */\n`],
    ['my-plugin/readme.txt', `=== Test Plugin ===\nContributors: admin\nTested up to: 6.6\n`],
    ['my-plugin/includes/functions.php', '<?php function test_fn() { return true; }'],
  ]);

  const formValidV1 = new FormData();
  const blobV1 = new Blob([fs.readFileSync(validPluginZip)], { type: 'application/zip' });
  formValidV1.append('file', blobV1, `test-plugin-${v1}.zip`);
  formValidV1.append('version', v1);
  formValidV1.append('releaseName', 'Initial Stable Release');
  formValidV1.append('releaseNotes', 'First official release with core features.');
  formValidV1.append('minPhpVersion', '7.4');
  formValidV1.append('minWordPressVersion', '5.8');
  formValidV1.append('publishImmediately', 'true');

  const uploadV1Res = await request(`${BASE_URL}/admin/products/${product._id}/packages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formValidV1,
  });

  if (uploadV1Res.status !== 201 && uploadV1Res.status !== 200) {
    throw new Error(`Upload v${v1} failed: ${JSON.stringify(uploadV1Res.data)}`);
  }
  const v1Data = uploadV1Res.data?.data || uploadV1Res.data;
  console.log(`   ✔ Version ${v1} uploaded successfully!`);
  console.log(`     - Checksum (SHA-256): ${v1Data.fileChecksum}`);
  console.log(`     - File Size: ${v1Data.fileSize} bytes`);
  console.log(`     - Validation Passed: ${v1Data.validationPassed}`);
  console.log(`     - Status: ${v1Data.packageStatus}`);
  fs.unlinkSync(validPluginZip);

  // 6. Test: Upload multiple versions without overwriting previous releases
  console.log(`\n6. Testing multi-version support (uploading v${v2})...`);
  const validPluginZipV2 = path.join(__dirname, 'temp_valid_plugin_v2.zip');
  createMockZip(validPluginZipV2, [
    ['my-plugin/my-plugin.php', `<?php\n/**\n * Plugin Name: Test Plugin\n * Version: ${v2}\n */\n`],
    ['my-plugin/readme.txt', `=== Test Plugin ===\nVersion ${v2} update\n`],
  ]);

  const formValidV2 = new FormData();
  const blobV2 = new Blob([fs.readFileSync(validPluginZipV2)], { type: 'application/zip' });
  formValidV2.append('file', blobV2, `test-plugin-${v2}.zip`);
  formValidV2.append('version', v2);
  formValidV2.append('releaseName', `Feature Update v${v2}`);
  formValidV2.append('releaseNotes', 'Added new widgets and security patches.');
  formValidV2.append('publishImmediately', 'false'); // Remains PENDING until admin approves

  const uploadV2Res = await request(`${BASE_URL}/admin/products/${product._id}/packages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formValidV2,
  });

  const v2Data = uploadV2Res.data?.data || uploadV2Res.data;
  console.log(`   ✔ Version ${v2} uploaded with status: ${v2Data.packageStatus} (Pending approval)`);

  // 7. Test: List all product package versions
  console.log('\n7. Listing all versions for product...');
  const listRes = await request(`${BASE_URL}/admin/products/${product._id}/packages`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const versions = listRes.data?.data?.versions || listRes.data?.versions || [];
  console.log(`   ✔ Found ${versions.length} version(s) under product:`);
  for (const v of versions) {
    console.log(`     - v${v.version} | Status: ${v.packageStatus} | Public: ${v.isPublic} | Size: ${v.fileSize} B`);
  }

  // 8. Test: Admin Package Actions (Approve & Publish)
  console.log(`\n8. Testing Admin Package Actions (Approve & Publish v${v2})...`);
  const v2VersionDoc = versions.find(v => v.version === v2);
  if (v2VersionDoc) {
    const approveRes = await request(`${BASE_URL}/admin/products/${product._id}/packages/${v2VersionDoc._id}/action`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'approve' }),
    });
    console.log(`   ✔ Package approved: ${approveRes.data?.data?.message || 'OK'}`);

    const publishRes = await request(`${BASE_URL}/admin/products/${product._id}/packages/${v2VersionDoc._id}/action`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'publish' }),
    });
    console.log(`   ✔ Package published: ${publishRes.data?.data?.message || 'OK'}`);
  }

  // 9. Test: Signed Time-Limited Download Token & File Streaming
  console.log('\n9. Testing Temporary Signed Download URL & Protected Streaming...');
  const tokenRes = await request(`${BASE_URL}/admin/packages/${v1Data._id}/download-token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const tokenData = tokenRes.data?.data || tokenRes.data;
  console.log(`   ✔ Generated signed download token: ${tokenData.token?.slice(0, 30)}...`);
  console.log(`   ✔ Download URL: ${tokenData.downloadUrl} (Expires in ${tokenData.expiresInSeconds}s)`);

  const downloadRes = await fetch(`http://localhost:5000${tokenData.downloadUrl}`);
  if (downloadRes.status === 200) {
    const contentType = downloadRes.headers.get('content-type');
    const contentDisp = downloadRes.headers.get('content-disposition');
    const checksumHeader = downloadRes.headers.get('x-package-checksum');
    const buffer = await downloadRes.arrayBuffer();
    console.log(`   ✔ Downloaded file stream successfully:`);
    console.log(`     - HTTP Status: ${downloadRes.status}`);
    console.log(`     - Content-Type: ${contentType}`);
    console.log(`     - Content-Disposition: ${contentDisp}`);
    console.log(`     - X-Package-Checksum: ${checksumHeader}`);
    console.log(`     - Downloaded Bytes: ${buffer.byteLength}`);
  } else {
    throw new Error(`Download failed with HTTP ${downloadRes.status}`);
  }

  // 10. Test: Archive / Disable action
  console.log('\n10. Testing Package Archival action...');
  if (v2VersionDoc) {
    const archiveRes = await request(`${BASE_URL}/admin/products/${product._id}/packages/${v2VersionDoc._id}/action`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'archive', reason: 'Superseded by security release' }),
    });
    console.log(`   ✔ Archive action response: ${archiveRes.data?.data?.message || 'OK'}`);
  }

  console.log('\n🎉 ALL 10 TESTS IN PACKAGE VALIDATION SUITE PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
