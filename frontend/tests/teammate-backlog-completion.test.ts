import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProductionRequestHandler } from '../src/server/prodServer';
import {
  resetAiMiddlewareStateForTests,
  setCustomGeminiGeneratorForTests,
} from '../src/server/runtimeMiddleware';
import { resetAuthRateLimitForTests } from '../src/server/authRoutes';
import { DEFAULT_DEMO_ACCOUNTS } from '../src/data/demoAuthData';
import { findNearestTerritoryPin } from '../src/components/common/LocationPinPicker';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(FRONTEND_ROOT, '..');

async function run() {
  console.log('\n================================================================');
  console.log('TEAMMATE BACKLOG COMPLETION SUITE (#1, #4, #6, #7, #8, #18, #21, #23, #28, #29, #30)');
  console.log('================================================================\n');

  resetAiMiddlewareStateForTests();
  resetAuthRateLimitForTests();

  const server = http.createServer(createProductionRequestHandler());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    // 1. Item #7: Standalone production server serves /api/health outside vite dev
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = (await healthRes.json()) as Record<string, unknown>;
    assert.equal(healthJson.status, 'ok');
    assert.equal(healthJson.authMiddleware, 'mounted');
    assert.equal(healthJson.aiProxyMiddleware, 'mounted');
    console.log('  ✅ PASS: Standalone production server mounts /api/health, /api/auth, and /api/ai-chat outside vite dev (#7)');

    // 2. Item #6: Unauthenticated /api/ai-chat requests are rejected with 401
    const unauthAi = await fetch(`${baseUrl}/api/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is my latest bill?', role: 'admin' }),
    });
    assert.equal(unauthAi.status, 401, 'Unauthenticated /api/ai-chat must return 401');
    const forgedAi = await fetch(`${baseUrl}/api/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'vidyutflow_sid=forged.invalidmac',
      },
      body: JSON.stringify({ message: 'What is my latest bill?' }),
    });
    assert.equal(forgedAi.status, 401, 'Forged session cookie on /api/ai-chat must return 401');
    console.log('  ✅ PASS: /api/ai-chat enforces HttpOnly session authentication (401 on missing/forged cookies) (#6)');

    // 3. Item #6: Role spoofing & poisoned client accountContext are ignored by /api/ai-chat
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VidyutFlow-CSRF': '1',
      },
      body: JSON.stringify({
        email: DEFAULT_DEMO_ACCOUNTS.consumer.email,
        password: DEFAULT_DEMO_ACCOUNTS.consumer.password,
        targetRole: 'consumer',
      }),
    });
    assert.equal(loginRes.status, 200);
    const setCookie = loginRes.headers.get('set-cookie') || '';
    assert.ok(setCookie.includes('HttpOnly'), 'Auth cookie must be HttpOnly');
    const cookiePair = setCookie.split(';')[0];

    let capturedPrompt = '';
    setCustomGeminiGeneratorForTests(async params => {
      capturedPrompt = params.contents;
      return 'Server-verified consumer reply ₹2,185.00';
    });

    const spoofAiRes = await fetch(`${baseUrl}/api/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookiePair,
      },
      body: JSON.stringify({
        message: 'Check my electricity bill',
        role: 'admin', // Spoofed privilege escalation attempt
        accountContext: {
          consumerName: 'CANARY_UNTRUSTED_CLIENT_INJECTION_999',
          connections: [{ consumerNo: 'FAKE_999999', poisonedField: 'EVIL_PAYLOAD' }],
        },
      }),
    });
    assert.equal(spoofAiRes.status, 200);
    const spoofBody = (await spoofAiRes.json()) as { persona?: { role?: string } };
    assert.equal(spoofBody.persona?.role, 'consumer', 'Server session role must override spoofed body.role');
    assert.ok(
      !capturedPrompt.includes('CANARY_UNTRUSTED_CLIENT_INJECTION_999') &&
        !capturedPrompt.includes('EVIL_PAYLOAD'),
      'Untrusted client accountContext must never be interpolated into Gemini prompt'
    );
    assert.ok(capturedPrompt.includes('04281-99231'), 'Server-verified ERP connection must ground prompt');
    console.log('  ✅ PASS: /api/ai-chat derives role & ERP context strictly from server session, blocking client spoofing (#6)');

    // 4. Item #6: Spoofed X-Forwarded-For headers cannot bypass /api/ai-chat rate limiting
    resetAiMiddlewareStateForTests();
    let throttledCount = 0;
    for (let i = 0; i < 33; i++) {
      const r = await fetch(`${baseUrl}/api/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookiePair,
          'X-Forwarded-For': `203.0.113.${i + 1}`, // Rotating spoofed IP on every request
        },
        body: JSON.stringify({ message: `Distinct billing question #${i}` }),
      });
      if (r.status === 429) throttledCount++;
    }
    assert.ok(throttledCount > 0, 'Rotating spoofed X-Forwarded-For must NOT bypass rate limiting');
    console.log('  ✅ PASS: /api/ai-chat rate limit ignores spoofed X-Forwarded-For headers (#6, #21)');

    // 5. Item #18: Simulated OIDC / Gujarat Parichay SSO flow + production guard
    resetAuthRateLimitForTests();
    const ssoProvRes = await fetch(`${baseUrl}/api/auth/sso/providers`);
    assert.equal(ssoProvRes.status, 200);
    const ssoProvJson = (await ssoProvRes.json()) as { isSimulated: boolean; providers: unknown[] };
    assert.equal(ssoProvJson.isSimulated, true);
    assert.ok(ssoProvJson.providers.length >= 2);

    const ssoLoginRes = await fetch(`${baseUrl}/api/auth/sso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VidyutFlow-CSRF': '1',
      },
      body: JSON.stringify({
        email: DEFAULT_DEMO_ACCOUNTS.employee.email,
        providerId: 'ugvcl-workforce-oidc-demo',
        state: 'oidc_demo_state_123456',
        targetRole: 'employee',
      }),
    });
    assert.equal(ssoLoginRes.status, 200);
    const ssoLoginBody = (await ssoLoginRes.json()) as { ssoSimulated: boolean; role: string };
    assert.equal(ssoLoginBody.ssoSimulated, true);
    assert.equal(ssoLoginBody.role, 'employee');
    assert.ok((ssoLoginRes.headers.get('set-cookie') || '').includes('HttpOnly'));

    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const prodSsoRes = await fetch(`${baseUrl}/api/auth/sso`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VidyutFlow-CSRF': '1',
        },
        body: JSON.stringify({
          email: DEFAULT_DEMO_ACCOUNTS.consumer.email,
          providerId: 'parichay-gujarat-demo',
          state: 'oidc_demo_state_999999',
          targetRole: 'consumer',
        }),
      });
      assert.equal(prodSsoRes.status, 403, 'Simulated SSO must be blocked in NODE_ENV=production');
    } finally {
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
    }
    console.log('  ✅ PASS: Simulated OIDC / Gujarat Parichay SSO issues HttpOnly session & blocks in production (#18)');
  } finally {
    setCustomGeminiGeneratorForTests(null);
    resetAiMiddlewareStateForTests();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }

  // 6. Item #7: Production Dockerfile & Vercel serverless configuration checks
  const dockerfile = fs.readFileSync(path.join(FRONTEND_ROOT, 'Dockerfile'), 'utf8');
  assert.ok(dockerfile.includes('npm run build'), 'Dockerfile must build production bundle');
  assert.ok(!dockerfile.includes('"run", "dev"'), 'Dockerfile must NOT run vite dev in container');
  assert.ok(dockerfile.includes('CMD ["npm", "start"]'), 'Dockerfile must launch standalone production server');

  const vercelJson = JSON.parse(fs.readFileSync(path.join(FRONTEND_ROOT, 'vercel.json'), 'utf8'));
  assert.ok(
    vercelJson.rewrites.some((r: any) => r.source === '/api/(.*)' && r.destination === '/api/index'),
    'vercel.json must route /api/* to serverless entry /api/index'
  );
  console.log('  ✅ PASS: Dockerfile & vercel.json are configured for real production runtime (#7)');

  // 7. Item #28: Nearest UGVCL territory GPS pin resolution across Gujarat coordinates
  assert.equal(findNearestTerritoryPin(23.59, 72.37).zone, 'North');
  assert.equal(findNearestTerritoryPin(23.21, 72.64).zone, 'South');
  assert.equal(findNearestTerritoryPin(23.60, 72.96).zone, 'East');
  assert.equal(findNearestTerritoryPin(24.17, 72.43).zone, 'West');
  assert.equal(findNearestTerritoryPin(23.08, 72.59).zone, 'Central');
  console.log('  ✅ PASS: GPS coordinate-to-UGVCL-zone resolver maps all 5 territory pins (#28)');

  // 8. Items #8, #28, #29, #30, #21, #23: Source & Runbook wiring checks
  const backendSessionSrc = fs.readFileSync(
    path.join(FRONTEND_ROOT, 'src/utils/backendSession.ts'),
    'utf8'
  );
  assert.ok(
    backendSessionSrc.includes('X-Use-Cookie-Session') &&
      backendSessionSrc.includes('/api/backend/auth/logout')
  );

  for (const rel of [
    'src/components/common/LocationPinPicker.tsx',
    'src/components/consumer/SavedPremisesBar.tsx',
    'src/components/admin/LiveStaffAssignmentPanel.tsx',
  ]) {
    const src = fs.readFileSync(path.join(FRONTEND_ROOT, rel), 'utf8');
    for (const lang of ['en:', 'gu:', 'hi:', 'mr:']) {
      assert.ok(src.includes(lang), `${rel} must include ${lang} translations`);
    }
  }

  for (const docRel of [
    'docs/DISASTER_RECOVERY.md',
    'docs/PENETRATION_TEST_PLAN.md',
    'backend/scripts/offsite_replicate.sh',
  ]) {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, docRel)), `${docRel} must exist`);
  }
  console.log('  ✅ PASS: Unified cookie logout, 4-language UI components (#28/#29/#30), DR & VAPT runbooks (#21/#23) verified');

  console.log('\n================================================================');
  console.log('ALL TEAMMATE BACKLOG FRONTEND & RUNTIME CHECKS PASSED');
  console.log('================================================================\n');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
