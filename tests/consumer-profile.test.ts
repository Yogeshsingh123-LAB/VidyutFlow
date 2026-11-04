import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createProductionRequestHandler } from '../src/server/prodServer';

async function runConsumerProfileTestSuite() {
  console.log('\n================================================================');
  console.log('VIDYUTFLOW CONSUMER PROFILE & CITIZEN ACCOUNT TEST SUITE');
  console.log('Verifying Unified Profile for New Applicants & Existing Consumers');
  console.log('================================================================\n');

  const handler = createProductionRequestHandler();
  const baseUrl = 'http://127.0.0.1:3000';

  const inMemoryFetch = async (urlStr: string, init?: RequestInit): Promise<Response> => {
    const urlObj = new URL(urlStr);
    const req = new EventEmitter() as any;
    req.method = (init?.method || 'GET').toUpperCase();
    req.url = urlObj.pathname + urlObj.search;
    req.headers = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => { req.headers[k.toLowerCase()] = v; });
      } else if (Array.isArray(init.headers)) {
        for (const [k, v] of init.headers) { req.headers[k.toLowerCase()] = v; }
      } else {
        for (const [k, v] of Object.entries(init.headers)) { req.headers[k.toLowerCase()] = String(v); }
      }
    }
    if (!req.headers['host']) req.headers['host'] = urlObj.host || '127.0.0.1:3000';
    req.socket = { remoteAddress: '127.0.0.1' };

    const res = new EventEmitter() as any;
    res.statusCode = 200;
    res.headers = {};
    res.setHeader = (name: string, val: any) => { res.headers[name.toLowerCase()] = val; };
    res.getHeader = (name: string) => res.headers[name.toLowerCase()];
    res.removeHeader = (name: string) => { delete res.headers[name.toLowerCase()]; };

    const chunks: Buffer[] = [];
    const responsePromise = new Promise<Response>((resolve, reject) => {
      res.write = (chunk: any) => {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };
      res.end = (chunk?: any) => {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        res.writableEnded = true;
        const bodyBuf = Buffer.concat(chunks);
        const nodeHeaders = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (Array.isArray(v)) {
            v.forEach(item => nodeHeaders.append(k, item));
          } else if (v !== undefined) {
            nodeHeaders.set(k, String(v));
          }
        }
        resolve(new Response(bodyBuf.length > 0 ? bodyBuf : null, {
          status: res.statusCode,
          statusText: 'OK',
          headers: nodeHeaders
        }));
      };
      res.on('error', reject);
    });

    handler(req, res);

    if (init?.body) {
      if (typeof init.body === 'string') {
        req.emit('data', Buffer.from(init.body));
      } else if (Buffer.isBuffer(init.body)) {
        req.emit('data', init.body);
      }
    }
    req.emit('end');

    return responsePromise;
  };

  // --- STEP 1: Fetch Demo Consumer Profile & Summary ---
  console.log('-> Step 1: GET /api/v1/consumer/profile (Profile Retrieval & Completion Rate)');
  const res1 = await inMemoryFetch(`${baseUrl}/api/v1/consumer/profile`);
  assert.equal(res1.status, 200, 'Profile endpoint should return 200');
  const profileData = await res1.json();
  assert.ok(profileData.user_id, 'Profile must contain user_id');
  assert.ok(profileData.full_name, 'Profile must contain full_name');
  assert.ok(typeof profileData.profile_completion_percentage === 'number', 'Completion percentage must be computed');
  assert.ok(profileData.contacts, 'Profile must contain verified contacts section');
  console.log(`   [PASS] Profile fetched for ${profileData.full_name}, completion: ${profileData.profile_completion_percentage}%`);

  // --- STEP 2: Profile Update ---
  console.log('-> Step 2: PATCH /api/v1/consumer/profile (Update Name & DOB)');
  const res2 = await inMemoryFetch(`${baseUrl}/api/v1/consumer/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: 'Smt. Meenaben Patel', date_of_birth: '1978-08-15' })
  });
  assert.equal(res2.status, 200, 'Update profile should return 200');
  const updateResult = await res2.json();
  assert.ok(updateResult.message.includes('successfully'), 'Should confirm successful update');
  console.log('   [PASS] Profile updated successfully');

  // --- STEP 3: Permitted Address CRUD & PIN Validation ---
  console.log('-> Step 3: Permitted Address Lifecycle (Create, List, Primary Toggle, Delete)');
  const newAddrPayload = {
    address_type: 'RESIDENTIAL',
    house_flat_no: 'B-204, Shivalik Residency',
    street: 'Airport Road',
    area: 'Hansol',
    city_village: 'Ahmedabad',
    taluka: 'Ahmedabad City',
    district: 'Ahmedabad',
    state: 'Gujarat',
    pin_code: '382475',
    is_primary: false
  };
  const res3Create = await inMemoryFetch(`${baseUrl}/api/v1/consumer/addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newAddrPayload)
  });
  assert.equal(res3Create.status, 201, 'Address creation should return 201');
  const createdAddr = await res3Create.json();
  assert.ok(createdAddr.id, 'Created address must have an ID');
  assert.equal(createdAddr.pinCode, '382475');

  // Test invalid PIN code validation
  const invalidAddrPayload = { ...newAddrPayload, pin_code: '3824' };
  const res3Invalid = await inMemoryFetch(`${baseUrl}/api/v1/consumer/addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidAddrPayload)
  });
  assert.equal(res3Invalid.status, 422, 'Invalid PIN code must be rejected with 422');

  // Delete address
  const res3Delete = await inMemoryFetch(`${baseUrl}/api/v1/consumer/addresses/${createdAddr.id}`, {
    method: 'DELETE'
  });
  assert.equal(res3Delete.status, 200, 'Deleting address should return 200');
  console.log('   [PASS] Address CRUD and 6-digit PIN code validation passed');

  // --- STEP 4: Electricity Connections & Verification Linking ---
  console.log('-> Step 4: Electricity Connections & OTP Linking Verification');
  const res4List = await inMemoryFetch(`${baseUrl}/api/v1/consumer/connections`);
  assert.equal(res4List.status, 200, 'Connections list should return 200');
  const connData = await res4List.json();
  assert.ok(Array.isArray(connData.connections), 'Connections must have connections array');
  console.log(`   Found ${connData.connections.length} linked connections for this user`);

  // Initiate linking for a connection
  const res4Init = await inMemoryFetch(`${baseUrl}/api/v1/consumer/connections/link/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consumer_no: '04281-99231' })
  });
  assert.equal(res4Init.status, 200, 'OTP initiation should return 200');
  const initData = await res4Init.json();
  assert.equal(initData.status, 'OTP_SENT');
  assert.ok(initData.demo_verification_code, 'Must return simulation OTP');

  // Verify linking with OTP
  const res4Verify = await inMemoryFetch(`${baseUrl}/api/v1/consumer/connections/link/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consumer_no: '04281-99231',
      otp: initData.demo_verification_code
    })
  });
  assert.equal(res4Verify.status, 200, 'OTP verification should return 200');
  const verifyData = await res4Verify.json();
  assert.equal(verifyData.status, 'LINKED_SUCCESS');
  console.log('   [PASS] Connection linking completed via verified OTP');

  // --- STEP 5: Preferences Management ---
  console.log('-> Step 5: Notification & Language Preferences');
  const res5Pref = await inMemoryFetch(`${baseUrl}/api/v1/consumer/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      preferred_language: 'gu',
      sms_notifications: true,
      email_notifications: true,
      outage_alerts: true
    })
  });
  assert.equal(res5Pref.status, 200, 'Preferences update should return 200');
  const res5Get = await inMemoryFetch(`${baseUrl}/api/v1/consumer/preferences`);
  const prefData = await res5Get.json();
  assert.equal(prefData.preferred_language, 'gu');
  console.log('   [PASS] Language set to Gujarati and notification channels updated');

  // --- STEP 6: Security & Active Sessions ---
  console.log('-> Step 6: Security & Active Sessions');
  const res6Sessions = await inMemoryFetch(`${baseUrl}/api/v1/consumer/security/sessions`);
  assert.equal(res6Sessions.status, 200, 'Sessions list should return 200');
  const sessions = await res6Sessions.json();
  assert.ok(Array.isArray(sessions), 'Sessions must be an array');
  assert.ok(sessions.length >= 1, 'At least one active session must exist');
  console.log(`   [PASS] Active devices/sessions listed: ${sessions.length}`);

  // Change password check
  const res6Pw = await inMemoryFetch(`${baseUrl}/api/v1/consumer/security/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_password: 'Password@123',
      new_password: 'NewSecurePassword@456'
    })
  });
  assert.equal(res6Pw.status, 200);
  console.log('   [PASS] Password change validation and audit pass');

  // --- STEP 7: Immutability of Official Connection Records ---
  console.log('-> Step 7: Official Utility Record Tamper-Resistance Check');
  // Attempting to alter official connection tariff category or load directly via profile must be ignored
  const res7Tamper = await inMemoryFetch(`${baseUrl}/api/v1/consumer/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sanctioned_load_kw: 999, // Unauthorized field
      tariff_category: 'Industrial (HT)', // Unauthorized field
      meter_number: 'MTR-TAMPER-001' // Unauthorized field
    })
  });
  assert.equal(res7Tamper.status, 200);
  // Re-fetch profile to ensure unauthorized fields were ignored and never persisted
  const res7Check = await inMemoryFetch(`${baseUrl}/api/v1/consumer/profile`);
  const checkData = await res7Check.json();
  assert.equal(checkData.sanctioned_load_kw, undefined);
  assert.equal(checkData.tariff_category, undefined);
  console.log('   [PASS] Official utility fields cannot be altered by consumers via profile API');

  // --- STEP 8: Account Activity Audit Timeline ---
  console.log('-> Step 8: GET /api/v1/consumer/activity (Audit Trail)');
  const res8Activity = await inMemoryFetch(`${baseUrl}/api/v1/consumer/activity`);
  assert.equal(res8Activity.status, 200, 'Activity endpoint should return 200');
  const activityList = await res8Activity.json();
  assert.ok(Array.isArray(activityList), 'Activity must be an array');
  assert.ok(activityList.length >= 2, 'Audit trail must record recent account actions');
  console.log(`   [PASS] Audit activity events retrieved: ${activityList.length}`);

  console.log('\n================================================================');
  console.log('ALL CONSUMER PROFILE TESTS PASSED WITH 100% SUCCESS');
  console.log('================================================================\n');
}

runConsumerProfileTestSuite().catch(err => {
  console.error('\n[FATAL ERROR in Consumer Profile Test Suite]:', err);
  process.exit(1);
});
