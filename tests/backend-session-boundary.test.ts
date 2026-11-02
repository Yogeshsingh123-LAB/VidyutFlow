import assert from 'node:assert/strict';
import {
  clearBackendSession,
  getBackendToken,
  getVerifiedBackendToken,
  hasBackendSession,
  notifyPortalIdentityChanged,
  reconcileBackendIdentity,
  registerBackendConsumerSession,
  resolveTokenExpiryMs,
  subscribeBackendSession,
  syncBackendSession,
} from '../src/utils/backendSession';
import { fastApi, getAuthToken } from '../src/utils/fastApiClient';
import { fetchDemoLoadPolicy } from '../src/utils/liveData';

const originalFetch = globalThis.fetch;
const originalDateNow = Date.now;

const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function makeJwtWithExp(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'u1', role: 'consumer', exp: expSeconds })).toString('base64url');
  return `${header}.${payload}.sig`;
}

try {
  // 1. Failed login never retries with a shared demo account and clears any prior session
  globalThis.fetch = async url =>
    String(url).endsWith('/login')
      ? jsonRes({ access_token: 'alice-token' })
      : jsonRes({ email: 'alice@example.com', role: 'consumer' });
  assert.equal(await syncBackendSession('alice@example.com', 'pass123', 'consumer'), true);
  assert.equal(getBackendToken(), 'alice-token');

  let calls: string[] = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    return jsonRes({ detail: 'Invalid email or password' }, 401);
  };
  assert.equal(await syncBackendSession('bob@example.com', 'wrong', 'consumer'), false);
  assert.deepEqual(calls, ['/api/backend/auth/login'], 'must not retry with a fallback demo identity');
  assert.equal(getBackendToken(), null, 'prior session must be cleared before/after failed login');
  assert.equal(hasBackendSession(), false);

  // 2. Email normalization and /auth/me email + role verification
  let postedBody = '';
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/login')) {
      postedBody = String(init?.body ?? '');
      return jsonRes({ access_token: 'norm-token' });
    }
    return jsonRes({ email: 'alice@example.com', role: 'consumer' });
  };
  assert.equal(await syncBackendSession('  Alice@Example.COM ', 'pass123', 'consumer'), true);
  assert.match(postedBody, /username=alice%40example\.com/);
  assert.equal(getAuthToken(), 'norm-token');

  // Mismatched backend email fails closed
  globalThis.fetch = async url =>
    String(url).endsWith('/login')
      ? jsonRes({ access_token: 'bad-token' })
      : jsonRes({ email: 'other@example.com', role: 'consumer' });
  assert.equal(await syncBackendSession('alice@example.com', 'pass123', 'consumer'), false);
  assert.equal(getBackendToken(), null);

  // Mismatched backend role fails closed
  globalThis.fetch = async url =>
    String(url).endsWith('/login')
      ? jsonRes({ access_token: 'bad-role-token' })
      : jsonRes({ email: 'alice@example.com', role: 'admin' });
  assert.equal(await syncBackendSession('alice@example.com', 'pass123', 'consumer'), false);
  assert.equal(getBackendToken(), null);

  // 3. Portal cookie change or logout fails closed before sending FastAPI request
  globalThis.fetch = async url =>
    String(url).endsWith('/login')
      ? jsonRes({ access_token: 'alice-token' })
      : jsonRes({ email: 'alice@example.com', role: 'consumer' });
  assert.equal(await syncBackendSession('alice@example.com', 'pass123', 'consumer'), true);

  calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    return jsonRes({ authenticated: true, user: { email: 'bob@example.com' }, role: 'consumer' });
  };
  await assert.rejects(fastApi('/requests'));
  assert.deepEqual(calls, ['/api/auth/me'], 'must block FastAPI request when portal cookie belongs to another user');
  assert.equal(getBackendToken(), null);

  globalThis.fetch = async url =>
    String(url).endsWith('/login')
      ? jsonRes({ access_token: 'alice-token' })
      : jsonRes({ email: 'alice@example.com', role: 'consumer' });
  assert.equal(await syncBackendSession('alice@example.com', 'pass123', 'consumer'), true);

  calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    return jsonRes({ authenticated: false }, 401);
  };
  assert.equal(await getVerifiedBackendToken(), null, 'portal logout in another tab invalidates backend token');
  assert.deepEqual(calls, ['/api/auth/me']);
  assert.equal(getBackendToken(), null);

  // 4. Protected fastApi call without an active session rejects locally without hitting network
  calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    return jsonRes([]);
  };
  await assert.rejects(fastApi('/requests'), (err: any) => err?.status === 401);
  assert.deepEqual(calls, [], 'unauthenticated protected call must not contact FastAPI');

  // 5. Public endpoint (auth: false) never sends Authorization and works regardless of session state
  let seenAuthHeader: string | undefined;
  globalThis.fetch = async (_url, init) => {
    const h = (init?.headers || {}) as Record<string, string>;
    seenAuthHeader = h['Authorization'];
    return jsonRes({ review_threshold_kw: 100, is_demo: true });
  };
  const policy = await fetchDemoLoadPolicy();
  assert.equal(policy.review_threshold_kw, 100);
  assert.equal(seenAuthHeader, undefined);

  // 6. FastAPI 401 response immediately clears active backend session
  globalThis.fetch = async url =>
    String(url).endsWith('/login')
      ? jsonRes({ access_token: 'revoked-token' })
      : jsonRes({ email: 'alice@example.com', role: 'consumer' });
  assert.equal(await syncBackendSession('alice@example.com', 'pass123', 'consumer'), true);
  globalThis.fetch = async url =>
    String(url) === '/api/auth/me'
      ? jsonRes({ authenticated: true, user: { email: 'alice@example.com' }, role: 'consumer' })
      : jsonRes({ detail: 'Token revoked' }, 401);
  await assert.rejects(fastApi('/requests'), (err: any) => err?.status === 401);
  assert.equal(getBackendToken(), null);

  // 7. JWT exp claim enforcement (already-expired rejected; short-lived expires on schedule)
  const baseNow = 1_700_000_000_000;
  Date.now = () => baseNow;
  const expiredJwt = makeJwtWithExp(Math.floor(baseNow / 1000) - 5);
  assert.equal(resolveTokenExpiryMs(expiredJwt, baseNow), null);
  globalThis.fetch = async url =>
    String(url).endsWith('/login')
      ? jsonRes({ access_token: expiredJwt })
      : jsonRes({ email: 'alice@example.com', role: 'consumer' });
  assert.equal(await syncBackendSession('alice@example.com', 'pass123', 'consumer'), false);
  assert.equal(getBackendToken(), null);

  const shortJwt = makeJwtWithExp(Math.floor(baseNow / 1000) + 30);
  globalThis.fetch = async url =>
    String(url).endsWith('/login')
      ? jsonRes({ access_token: shortJwt })
      : jsonRes({ email: 'alice@example.com', role: 'consumer' });
  assert.equal(await syncBackendSession('alice@example.com', 'pass123', 'consumer'), true);
  assert.equal(getBackendToken(), shortJwt);
  Date.now = () => baseNow + 31_000;
  assert.equal(getBackendToken(), null, 'expired JWT must be purged and never returned');
  Date.now = originalDateNow;

  // 8. Async races: logout cancels in-flight login, and overlapping login cannot overwrite newer user
  let releaseAlice!: (res: Response) => void;
  globalThis.fetch = () => new Promise(resolve => { releaseAlice = resolve; });
  const inFlightLogout = syncBackendSession('alice@example.com', 'pass123', 'consumer');
  clearBackendSession();
  releaseAlice(jsonRes({ access_token: 'stale-alice' }));
  assert.equal(await inFlightLogout, false);
  assert.equal(getBackendToken(), null);

  let finishSlowAlice!: (res: Response) => void;
  globalThis.fetch = url => {
    if (String(url).endsWith('/login') && !finishSlowAlice) {
      return new Promise(resolve => { finishSlowAlice = resolve; });
    }
    if (String(url).endsWith('/login')) {
      return Promise.resolve(jsonRes({ access_token: 'bob-token' }));
    }
    return Promise.resolve(jsonRes({ email: 'bob@example.com', role: 'officer' }));
  };
  const slowAlice = syncBackendSession('alice@example.com', 'pass123', 'consumer');
  const fastBob = await syncBackendSession('bob@example.com', 'pass123', 'employee');
  assert.equal(fastBob, true);
  assert.equal(getBackendToken(), 'bob-token');
  finishSlowAlice(jsonRes({ access_token: 'late-alice-token' }));
  assert.equal(await slowAlice, false);
  assert.equal(getBackendToken(), 'bob-token', 'stale login from previous user must not clobber newer session');

  // 9. Server-mode consumer registration: 201 provisions isolated session; 400 conflict fails closed
  calls = [];
  globalThis.fetch = async url => {
    const u = String(url);
    calls.push(u);
    if (u.endsWith('/register')) return jsonRes({ id: 'u-new', email: 'new@example.com', role: 'consumer' }, 201);
    if (u.endsWith('/login')) return jsonRes({ access_token: 'new-consumer-token' });
    return jsonRes({ email: 'new@example.com', role: 'consumer' });
  };
  assert.equal(await registerBackendConsumerSession('New User', 'new@example.com', 'Secret@123'), true);
  assert.equal(getBackendToken(), 'new-consumer-token');
  assert.deepEqual(calls, [
    '/api/backend/auth/register',
    '/api/backend/auth/login',
    '/api/backend/auth/me',
  ]);

  calls = [];
  globalThis.fetch = async url => {
    const u = String(url);
    calls.push(u);
    return jsonRes({ detail: 'Email already registered' }, 400);
  };
  assert.equal(await registerBackendConsumerSession('Dup User', 'dup@example.com', 'Secret@123'), false);
  assert.deepEqual(calls, ['/api/backend/auth/register'], 'must not log into pre-existing backend account on signup conflict');
  assert.equal(getBackendToken(), null);

  // 10. Identity reconciliation and listener notifications
  let events = 0;
  const unsub = subscribeBackendSession(() => { events += 1; });
  globalThis.fetch = async url =>
    String(url).endsWith('/login')
      ? jsonRes({ access_token: 'alice-token' })
      : jsonRes({ email: 'alice@example.com', role: 'consumer' });
  await syncBackendSession('alice@example.com', 'pass123', 'consumer');
  const eventsAfterLogin = events;
  reconcileBackendIdentity('ALICE@example.com', 'consumer');
  assert.equal(getBackendToken(), 'alice-token', 'matching normalized identity keeps session');
  assert.equal(events, eventsAfterLogin);
  notifyPortalIdentityChanged('bob@example.com', 'consumer');
  assert.equal(getBackendToken(), null, 'portal account switch clears backend session');
  assert.ok(events > eventsAfterLogin);
  unsub();
} finally {
  Date.now = originalDateNow;
  clearBackendSession();
  globalThis.fetch = originalFetch;
}

console.log('All backend session boundary checks passed.');
