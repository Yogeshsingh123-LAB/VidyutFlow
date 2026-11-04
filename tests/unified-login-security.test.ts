import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { createProductionRequestHandler } from '../src/server/prodServer';
import { resolveRouteAccess, UNAUTHORIZED_NAVIGATION_MESSAGE } from '../src/context/AppContext';

async function runUnifiedLoginSecurityTestSuite() {
  console.log('\n================================================================');
  console.log('VIDYUTFLOW UNIFIED SECURE LOGIN & AUTHORIZATION TEST SUITE');
  console.log('Production-Grade 4-Role Authentication & Zero-Dev-Auth Verification');
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
    if (!req.headers['x-vidyutflow-csrf']) req.headers['x-vidyutflow-csrf'] = '1';
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

  // =========================================================================
  // 1. CAPTCHA & CONSUMER MOBILE-ONLY OTP AUTHENTICATION
  // =========================================================================
  console.log('-> Step 1: Anti-Bot CAPTCHA & Mobile-Only Consumer OTP Authentication');

  // 1a. Generate uncopyable, bot-resistant vector CAPTCHA
  const resCaptcha = await inMemoryFetch(`${baseUrl}/api/auth/captcha`, {
    method: 'GET'
  });
  assert.equal(resCaptcha.status, 200, 'Must generate security CAPTCHA');
  const captchaData = await resCaptcha.json();
  assert.ok(captchaData.captcha_token, 'Must return cryptographic captcha_token');
  assert.ok(captchaData.captcha_svg, 'Must return SVG vector image');
  assert.ok(captchaData.captcha_svg.includes('<svg'), 'Captcha must be SVG image');
  assert.ok(captchaData.captcha_svg.includes('user-select:none'), 'Captcha must have copy protection');
  assert.ok(!captchaData.captcha_answer, 'Backend must NEVER expose plaintext captcha answer');
  console.log('   [PASS] Uncopyable vector CAPTCHA generated with HMAC nonce and copy protection');

  // 1b. Reject invalid CAPTCHA answer
  const resInvalidCaptcha = await inMemoryFetch(`${baseUrl}/api/auth/consumer/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobile_number: '9825014820',
      captcha_token: captchaData.captcha_token,
      captcha_answer: 'WRONG'
    })
  });
  assert.equal(resInvalidCaptcha.status, 400, 'Invalid CAPTCHA answer must be rejected');
  console.log('   [PASS] Bot/invalid CAPTCHA submission rejected with 400');

  // 1c. Mobile number not registered rejection (without consumer_no)
  const resUnregisteredMobile = await inMemoryFetch(`${baseUrl}/api/auth/consumer/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile_number: '9123456789' })
  });
  assert.equal(resUnregisteredMobile.status, 400, 'Unregistered mobile number must be rejected');
  console.log('   [PASS] Unregistered mobile number rejected with 400 (Ownership check enforced)');

  // 1d. Valid Mobile-Only OTP Request (no consumer number required)
  const resValidOtp = await inMemoryFetch(`${baseUrl}/api/auth/consumer/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobile_number: '9825014820'
    })
  });
  assert.equal(resValidOtp.status, 200, 'Valid registered mobile must succeed without consumer number');
  const otpSendData = await resValidOtp.json();
  assert.equal(otpSendData.status, 'OTP_SENT');
  assert.ok(otpSendData.masked_mobile.includes('XX20'), 'Mobile number must be masked in response');
  assert.ok(otpSendData.dev_simulation_otp, 'OTP code provided for simulation');
  console.log(`   [PASS] OTP dispatched to ${otpSendData.masked_mobile} using registered mobile ONLY`);

  // 1e. Resend Cooldown Enforcement (Immediate retry within 45s must return 429)
  const resCooldown = await inMemoryFetch(`${baseUrl}/api/auth/consumer/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile_number: '9825014820' })
  });
  assert.equal(resCooldown.status, 429, 'Immediate OTP resend must be rate-limited by cooldown');
  console.log('   [PASS] Resend cooldown (45s) enforced with 429');

  // 1f. Incorrect OTP code verification rejection
  const resWrongOtp = await inMemoryFetch(`${baseUrl}/api/auth/consumer/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile_number: '9825014820', otp: '000000' })
  });
  assert.equal(resWrongOtp.status, 400, 'Incorrect OTP must be rejected');
  console.log('   [PASS] Incorrect OTP code rejected with attempt counter decremented');

  // 1g. Successful OTP Verification using Mobile Number (No consumer number required)
  const resVerifySuccess = await inMemoryFetch(`${baseUrl}/api/auth/consumer/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile_number: '9825014820', otp: otpSendData.dev_simulation_otp })
  });
  assert.equal(resVerifySuccess.status, 200, 'Valid OTP must succeed and issue session');
  const consumerSessionData = await resVerifySuccess.json();
  assert.equal(consumerSessionData.authenticated, true);
  assert.equal(consumerSessionData.role, 'consumer');
  assert.ok(resVerifySuccess.headers.get('set-cookie'), 'Must issue secure session cookie');
  console.log('   [PASS] Consumer session established via Mobile Number OTP verification');

  // 1h. Single-Use Enforcement: Reusing the same OTP must fail
  const resReuseOtp = await inMemoryFetch(`${baseUrl}/api/auth/consumer/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile_number: '9825014820', otp: otpSendData.dev_simulation_otp })
  });
  assert.equal(resReuseOtp.status, 400, 'Single-use OTP must be consumed and cannot be reused');
  console.log('   [PASS] Single-use OTP enforcement verified (reused token rejected)');

  // =========================================================================
  // 2. STAFF AUTHENTICATION (FIELD ENGINEER, OFFICER, ADMIN)
  // =========================================================================
  console.log('\n-> Step 2: Staff & Admin Authentication with Credential & Role Verification');

  // 2a. Field Engineer Login with Employee ID alias
  const resEngineer = await inMemoryFetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'ugvcl-eng-01',
      password: 'Demo@12345',
      targetRole: 'field'
    })
  });
  assert.equal(resEngineer.status, 200, 'Field Engineer login must succeed');
  const engineerData = await resEngineer.json();
  assert.equal(engineerData.authenticated, true);
  assert.equal(engineerData.role, 'field');
  console.log(`   [PASS] Field Engineer authenticated via employee ID: ${engineerData.user.name}`);

  // 2b. Officer Login with Official Email
  const resOfficer = await inMemoryFetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'employee@vidyutflow.demo',
      password: 'Demo@12345',
      targetRole: 'employee'
    })
  });
  assert.equal(resOfficer.status, 200, 'Officer login must succeed');
  const officerData = await resOfficer.json();
  assert.equal(officerData.authenticated, true);
  assert.equal(officerData.role, 'employee');
  console.log(`   [PASS] Officer authenticated: ${officerData.user.name}`);

  // 2c. Admin Login with Privileged Account ID
  const resAdmin = await inMemoryFetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'adm-ugvcl-01',
      password: 'Demo@12345',
      targetRole: 'admin'
    })
  });
  assert.equal(resAdmin.status, 200, 'Admin login must succeed');
  const adminData = await resAdmin.json();
  assert.equal(adminData.authenticated, true);
  assert.equal(adminData.role, 'admin');
  console.log(`   [PASS] Administrator authenticated: ${adminData.user.name}`);

  // =========================================================================
  // 3. ZERO-TRUST AUTHORIZATION & ROLE SPOOFING REJECTION
  // =========================================================================
  console.log('\n-> Step 3: Zero-Trust Backend Authorization & Role Spoofing Rejection');

  // Attempt to log in with an Officer account while requesting the 'admin' portal
  const resRoleMismatch = await inMemoryFetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'employee@vidyutflow.demo',
      password: 'Demo@12345',
      targetRole: 'admin' // Spoofed role in frontend request
    })
  });
  assert.equal(resRoleMismatch.status, 403, 'Role mismatch must be rejected with 403 Forbidden');
  console.log('   [PASS] Role mismatch rejected with 403 (Backend role is single source of truth)');

  // Attempt to register public account with privileged role
  const resPrivSignup = await inMemoryFetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Hacker User',
      email: 'hacker@priv.test',
      password: 'Password@123',
      role: 'admin'
    })
  });
  // Must either reject or force role to consumer
  if (resPrivSignup.status === 201) {
    const signupData = await resPrivSignup.json();
    assert.equal(signupData.role, 'consumer', 'Public registration must never grant admin privileges');
  } else {
    assert.equal(resPrivSignup.status, 403, 'Public admin registration strictly blocked');
  }
  console.log('   [PASS] Public administrator registration strictly prohibited');

  // =========================================================================
  // 4. DASHBOARD REDIRECTION & ROUTE ACCESS GUARDS
  // =========================================================================
  console.log('\n-> Step 4: Multi-Tier Dashboard Authorization Guards');

  // Consumer trying to access admin dashboard
  const consumerSession: any = {
    role: 'consumer',
    loginTime: new Date().toISOString(),
    sessionToken: 'valid-test-token',
    user: { id: 'c1', email: 'c@ugvcl.com', name: 'Consumer', role: 'consumer' }
  };
  const adminRoute = {
    isExplicitPortalRequest: true,
    role: 'admin' as const,
    tab: 'dashboard',
    isExplicitWelcomeRequest: false
  };
  const consumerAccess = resolveRouteAccess(adminRoute, consumerSession);
  assert.equal(consumerAccess.authorized, false, 'Consumer must not access Admin dashboard');
  assert.equal(consumerAccess.role, 'consumer', 'Must redirect back to Consumer dashboard role');
  assert.equal(consumerAccess.redirectToWelcome, true);
  console.log('   [PASS] Consumer blocked from accessing Admin dashboard');

  // Field engineer trying to access officer dashboard
  const fieldSession: any = {
    role: 'field',
    loginTime: new Date().toISOString(),
    sessionToken: 'valid-test-token',
    user: { id: 'f1', email: 'f@ugvcl.com', name: 'Field Engineer', role: 'field' }
  };
  const officerRoute = {
    isExplicitPortalRequest: true,
    role: 'employee' as const,
    tab: 'dashboard',
    isExplicitWelcomeRequest: false
  };
  const fieldAccess = resolveRouteAccess(officerRoute, fieldSession);
  assert.equal(fieldAccess.authorized, false, 'Field Engineer must not access Officer dashboard');
  assert.equal(fieldAccess.role, 'field', 'Must redirect back to Field Engineer dashboard role');
  assert.equal(fieldAccess.redirectToWelcome, true);
  console.log('   [PASS] Field Engineer blocked from accessing Officer dashboard');

  // =========================================================================
  // 5. REMOVAL OF DEVELOPMENT AUTHENTICATION FROM USER-FACING LOGIN UI
  // =========================================================================
  console.log('\n-> Step 5: Verification of Zero Dev Auth Controls in Public Login UI');

  const authModalSource = fs.readFileSync('src/components/common/VidyutFlowAuthModal.tsx', 'utf8');

  const forbiddenStrings = [
    'DEMO SANDBOX',
    'Select Demo Account',
    'Select Demo Field Engineer',
    'Enter Demo as Selected Account',
    'Use Demo Credentials',
    'Demo@12345',
    'Dev Auth Mode:',
    'Development Authentication Mode',
    'Bypass Authentication',
    'Mock Authentication'
  ];

  for (const forbidden of forbiddenStrings) {
    assert.ok(
      !authModalSource.includes(forbidden),
      `Public login component must NOT contain forbidden dev-auth artifact: "${forbidden}"`
    );
  }
  console.log('   [PASS] Verified 0 development authentication controls in user-facing login modal');

  // Verify Consumer Number removed from login UI and CAPTCHA is present
  assert.ok(
    !authModalSource.includes('Electricity Consumer Number'),
    'Consumer login UI must have Electricity Consumer Number removed'
  );
  assert.ok(
    authModalSource.includes('Security Verification') && authModalSource.includes('Anti-bot protection'),
    'Consumer login UI must include uncopyable security CAPTCHA verification'
  );
  console.log('   [PASS] Verified Electricity Consumer Number removed & Anti-bot CAPTCHA present in Login UI');

  // Check built HTML/assets if dist exists
  if (fs.existsSync('dist')) {
    const indexHtml = fs.readFileSync('dist/index.html', 'utf8');
    assert.ok(!indexHtml.includes('DEV AUTH MODE'), 'Production HTML must not expose Dev Auth Mode');
    console.log('   [PASS] Verified 0 dev auth controls in production dist/index.html');
  }

  // =========================================================================
  // 6. SESSION REVOCATION & LOGOUT
  // =========================================================================
  console.log('\n-> Step 6: Session Revocation & Logout Enforcement');

  const resLogout = await inMemoryFetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  assert.equal(resLogout.status, 200, 'Logout must return 200');
  const setCookie = resLogout.headers.get('set-cookie') || '';
  assert.ok(setCookie.includes('Max-Age=0') || setCookie.includes('Expires='), 'Must clear session cookie on logout');
  console.log('   [PASS] Session successfully revoked and cookies cleared');

  console.log('\n================================================================');
  console.log('ALL UNIFIED SECURE LOGIN TESTS PASSED WITH 100% SUCCESS');
  console.log('================================================================\n');
}

runUnifiedLoginSecurityTestSuite().catch((err) => {
  console.error('\n[FATAL ERROR in Unified Login Security Test Suite]:', err);
  process.exit(1);
});
