import { EventEmitter } from 'events';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  createAuthApiHandler,
  resetAuthRateLimitForTests,
  MAX_AUTH_ATTEMPTS_PER_WINDOW
} from '../src/server/authRoutes';
import {
  ServerAuthService,
  DEFAULT_SESSION_TTL_MS,
  SESSION_COOKIE_NAME
} from '../src/server/authService';
import {
  AUTH_MODE_STORAGE_KEY,
  SERVER_SESSION_MARKER,
  FetchLike,
  isProductionAuthEnvironment,
  isDevAuthModeSwitchEnabled,
  resolveEffectiveAuthMode,
  getStoredAuthMode,
  setStoredAuthMode,
  resolveSessionForAuthMode,
  loginWithServerApi,
  signupWithServerApi,
  verifyServerSessionApi,
  logoutServerSessionApi
} from '../src/utils/authClient';
import {
  parseCurrentUrl,
  resolveRouteAccess,
  UNAUTHORIZED_NAVIGATION_MESSAGE
} from '../src/context/AppContext';
import {
  DEFAULT_DEMO_ACCOUNTS,
  DemoSession,
  getCanonicalDemoAccountsByRole,
  CANONICAL_DEMO_IDENTITIES
} from '../src/data/demoAuthData';
import { getActiveUserIdentity } from '../src/utils/avatarUtils';
import {
  INITIAL_BILLS,
  INITIAL_CONNECTIONS,
  INITIAL_PAYMENTS,
  INITIAL_COMPLAINTS,
  INITIAL_APPLICATIONS,
  INITIAL_WORK_ORDERS
} from '../src/data/mockData';
import { UserRole } from '../src/types';

let passed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  passed++;
  console.log(`  ✓ ${message}`);
}

interface SimulatedHttpResult {
  statusCode: number;
  headers: Record<string, string>;
  body: Record<string, any>;
  rawBody: string;
}

async function simulateAuthHttpCall(
  handler: ReturnType<typeof createAuthApiHandler>,
  options: {
    method: 'GET' | 'POST';
    url: string;
    body?: Record<string, unknown>;
    cookie?: string;
    csrfHeader?: string | null;
    origin?: string;
    host?: string;
    forwardedProto?: string;
    clientIp?: string;
  }
): Promise<SimulatedHttpResult> {
  const req = new EventEmitter() as unknown as IncomingMessage;
  req.method = options.method;
  req.url = options.url;
  req.headers = {
    host: options.host || 'localhost:3000',
    ...(options.cookie ? { cookie: options.cookie } : {}),
    ...(options.csrfHeader !== null
      ? { 'x-vidyutflow-csrf': options.csrfHeader ?? '1' }
      : {}),
    ...(options.origin ? { origin: options.origin } : {}),
    ...(options.forwardedProto ? { 'x-forwarded-proto': options.forwardedProto } : {}),
    ...(options.clientIp ? { 'x-forwarded-for': options.clientIp } : {})
  };
  (req as any).socket = { remoteAddress: options.clientIp || '127.0.0.1' };

  const headers: Record<string, string> = {};
  let statusCode = 200;
  let rawBody = '';

  const finishPromise = new Promise<SimulatedHttpResult>(resolve => {
    const res = {
      get statusCode() {
        return statusCode;
      },
      set statusCode(val: number) {
        statusCode = val;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = String(value);
      },
      end(chunk?: string) {
        if (chunk) rawBody += chunk;
        let parsed: Record<string, any> = {};
        try {
          parsed = rawBody ? JSON.parse(rawBody) : {};
        } catch {}
        resolve({
          statusCode,
          headers,
          body: parsed,
          rawBody
        });
      }
    } as unknown as ServerResponse;

    handler(req, res);
  });

  if (options.method === 'POST') {
    setImmediate(() => {
      if (options.body !== undefined) {
        req.emit('data', JSON.stringify(options.body));
      }
      req.emit('end');
    });
  }

  return finishPromise;
}

function extractCookiePair(setCookieHeader?: string): string {
  if (!setCookieHeader) return '';
  return setCookieHeader.split(';')[0].trim();
}

/**
 * Creates a stateful browser-like `fetch` harness with an automatic `HttpOnly` cookie jar
 * connected directly to `createAuthApiHandler` for frontend-to-server integration tests.
 */
function createBrowserCookieFetchHarness(handler: ReturnType<typeof createAuthApiHandler>) {
  let httpOnlyCookiePair = '';

  const fetchImpl: FetchLike = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = ((init?.method || 'GET').toUpperCase() as 'GET' | 'POST');
    const headersObj: Record<string, string> = {};

    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => {
          headersObj[k.toLowerCase()] = v;
        });
      } else if (Array.isArray(init.headers)) {
        for (const [k, v] of init.headers) {
          headersObj[k.toLowerCase()] = v;
        }
      } else {
        for (const [k, v] of Object.entries(init.headers)) {
          if (v !== undefined) headersObj[k.toLowerCase()] = String(v);
        }
      }
    }

    let parsedBody: Record<string, unknown> | undefined;
    if (typeof init?.body === 'string' && init.body.trim()) {
      parsedBody = JSON.parse(init.body);
    }

    const csrfVal = headersObj['x-vidyutflow-csrf'] ?? null;

    const result = await simulateAuthHttpCall(handler, {
      method,
      url,
      body: parsedBody,
      cookie: httpOnlyCookiePair || undefined,
      csrfHeader: csrfVal,
      forwardedProto: 'https'
    });

    const setCookie = result.headers['set-cookie'];
    if (setCookie) {
      if (setCookie.includes('Max-Age=0')) {
        httpOnlyCookiePair = '';
      } else {
        httpOnlyCookiePair = extractCookiePair(setCookie);
      }
    }

    return {
      ok: result.statusCode >= 200 && result.statusCode < 300,
      status: result.statusCode,
      json: async () => result.body
    } as Response;
  }) as FetchLike;

  return {
    fetchImpl,
    getHttpOnlyCookiePair: () => httpOnlyCookiePair
  };
}

/**
 * In-memory Storage mock to verify browser localStorage behavior without side effects.
 */
function createMockBrowserStorage(initialEntries: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialEntries));
  return {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    snapshot(): Record<string, string> {
      return Object.fromEntries(store.entries());
    }
  };
}

async function runTests() {
  console.log('==================================================================');
  console.log('VidyutFlow Step 5B.2: Server Auth API & Frontend Integration Suite');
  console.log('==================================================================\n');

  let simulatedNowMs = 1_700_000_000_000;
  const authService = new ServerAuthService({
    sessionSecret: 'test_http_api_secret_minimum_32_characters_long_2026'
  });
  const handler = createAuthApiHandler({
    authService,
    nowMsProvider: () => simulatedNowMs
  });

  // -------------------------------------------------------------------------
  // 1. All 5 Demo Accounts Login, GET /api/auth/me, and POST /api/auth/logout
  // -------------------------------------------------------------------------
  console.log('1. Testing All 5 Demo Accounts via POST /api/auth/login -> GET /api/auth/me -> POST /api/auth/logout...');
  const roles: UserRole[] = ['consumer', 'employee', 'field', 'management', 'admin'];

  for (const role of roles) {
    resetAuthRateLimitForTests();
    const acc = DEFAULT_DEMO_ACCOUNTS[role];

    const loginRes = await simulateAuthHttpCall(handler, {
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: acc.email,
        password: acc.password,
        targetRole: role
      },
      forwardedProto: 'https'
    });

    assert(loginRes.statusCode === 200, `[${role}] POST /api/auth/login returns 200 OK`);
    assert(loginRes.body.authenticated === true, `[${role}] Response authenticated === true`);
    assert(loginRes.body.role === role, `[${role}] Response role === "${role}"`);
    assert(loginRes.body.user?.email === acc.email, `[${role}] Response user.email matches ${acc.email}`);
    assert(loginRes.body.user?.name === acc.name, `[${role}] Response user.name matches ${acc.name}`);

    // Ensure no session tokens or password hashes are exposed to browser JS in the JSON body
    assert(
      !loginRes.rawBody.includes('sessionToken') &&
        !loginRes.rawBody.includes('signedToken') &&
        !loginRes.rawBody.includes('sessionId') &&
        !loginRes.rawBody.includes('password') &&
        !loginRes.rawBody.includes('vidyutflow_sid'),
      `[${role}] JSON body never exposes session tokens or password secrets to browser JS`
    );

    const setCookie = loginRes.headers['set-cookie'] || '';
    assert(setCookie.includes(`${SESSION_COOKIE_NAME}=`), `[${role}] Set-Cookie issues ${SESSION_COOKIE_NAME}`);
    assert(setCookie.includes('HttpOnly'), `[${role}] Set-Cookie includes HttpOnly`);
    assert(setCookie.includes('SameSite=Lax'), `[${role}] Set-Cookie includes SameSite=Lax`);
    assert(setCookie.includes('Secure'), `[${role}] HTTPS request Set-Cookie includes Secure`);

    const cookiePair = extractCookiePair(setCookie);

    // Verify GET /api/auth/me with cookie
    const meRes = await simulateAuthHttpCall(handler, {
      method: 'GET',
      url: '/api/auth/me',
      cookie: cookiePair
    });
    assert(meRes.statusCode === 200, `[${role}] GET /api/auth/me returns 200 OK with valid HttpOnly cookie`);
    assert(meRes.body.authenticated === true, `[${role}] GET /api/auth/me confirms authenticated === true`);
    assert(meRes.body.role === role, `[${role}] GET /api/auth/me returns server-assigned role "${role}"`);
    assert(!meRes.rawBody.includes('signedToken'), `[${role}] GET /api/auth/me never exposes token in JSON`);

    // Verify POST /api/auth/logout revokes session
    const logoutRes = await simulateAuthHttpCall(handler, {
      method: 'POST',
      url: '/api/auth/logout',
      cookie: cookiePair
    });
    assert(logoutRes.statusCode === 200, `[${role}] POST /api/auth/logout returns 200 OK`);
    assert(logoutRes.body.loggedOut === true && logoutRes.body.revoked === true, `[${role}] Session revoked on server`);
    assert(
      (logoutRes.headers['set-cookie'] || '').includes('Max-Age=0'),
      `[${role}] Logout clears HttpOnly cookie with Max-Age=0`
    );

    // Reusing the same cookie on GET /api/auth/me after logout must return 401
    const meAfterLogout = await simulateAuthHttpCall(handler, {
      method: 'GET',
      url: '/api/auth/me',
      cookie: cookiePair
    });
    assert(
      meAfterLogout.statusCode === 401 && meAfterLogout.body.authenticated === false,
      `[${role}] GET /api/auth/me rejects revoked session cookie with 401 after logout`
    );
  }

  // -------------------------------------------------------------------------
  // 2. Invalid Password, Unknown User, and Role Mismatch via HTTP API
  // -------------------------------------------------------------------------
  console.log('\n2. Testing Invalid Credentials & Role Mismatch Rejection...');
  resetAuthRateLimitForTests();
  {
    const badPassRes = await simulateAuthHttpCall(handler, {
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: 'consumer@vidyutflow.demo',
        password: 'WrongPassword999',
        targetRole: 'consumer'
      }
    });
    assert(badPassRes.statusCode === 401, 'Invalid password returns HTTP 401');
    assert(badPassRes.body.code === 'INVALID_CREDENTIALS', 'Invalid password code is INVALID_CREDENTIALS');
    assert(!badPassRes.headers['set-cookie'], 'Failed login does not issue a session cookie');

    const roleMismatchRes = await simulateAuthHttpCall(handler, {
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: 'consumer@vidyutflow.demo',
        password: 'Demo@12345',
        targetRole: 'admin'
      }
    });
    assert(roleMismatchRes.statusCode === 403, 'Role mismatch returns HTTP 403');
    assert(roleMismatchRes.body.code === 'ROLE_MISMATCH', 'Role mismatch code is ROLE_MISMATCH');
  }

  // -------------------------------------------------------------------------
  // 3. Consumer Registration via POST /api/auth/signup & Privilege Escalation Block
  // -------------------------------------------------------------------------
  console.log('\n3. Testing POST /api/auth/signup & Privilege Escalation Protection...');
  resetAuthRateLimitForTests();
  {
    const signupRes = await simulateAuthHttpCall(handler, {
      method: 'POST',
      url: '/api/auth/signup',
      body: {
        name: 'Nileshbhai K. Joshi',
        email: 'nilesh.joshi@example.com',
        password: 'Citizen@2026',
        mobileNumber: '+91 98250 77889'
      }
    });
    assert(signupRes.statusCode === 200, 'POST /api/auth/signup returns 200 OK');
    assert(signupRes.body.authenticated === true, 'Signup returns authenticated === true');
    assert(signupRes.body.role === 'consumer', 'Signup assigns role === "consumer"');
    assert(signupRes.body.user?.name === 'Nileshbhai K. Joshi', 'Signup preserves full name');
    const signupCookie = extractCookiePair(signupRes.headers['set-cookie']);
    assert(signupCookie.startsWith(`${SESSION_COOKIE_NAME}=`), 'Signup issues HttpOnly session cookie');

    const meSignup = await simulateAuthHttpCall(handler, {
      method: 'GET',
      url: '/api/auth/me',
      cookie: signupCookie
    });
    assert(
      meSignup.statusCode === 200 && meSignup.body.user?.email === 'nilesh.joshi@example.com',
      'GET /api/auth/me verifies newly registered consumer session'
    );

    const escalationRes = await simulateAuthHttpCall(handler, {
      method: 'POST',
      url: '/api/auth/signup',
      body: {
        name: 'Rogue Admin',
        email: 'rogue@example.com',
        password: 'Citizen@2026',
        requestedRole: 'admin'
      }
    });
    assert(
      escalationRes.statusCode === 403 && escalationRes.body.code === 'ROLE_ESCALATION_FORBIDDEN',
      'POST /api/auth/signup blocks requestedRole="admin" with 403 ROLE_ESCALATION_FORBIDDEN'
    );
  }

  // -------------------------------------------------------------------------
  // 4. Session Expiration Verification on GET /api/auth/me
  // -------------------------------------------------------------------------
  console.log('\n4. Testing Session Expiration Enforcement on GET /api/auth/me...');
  resetAuthRateLimitForTests();
  {
    const loginRes = await simulateAuthHttpCall(handler, {
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: 'management@vidyutflow.demo',
        password: 'Demo@12345',
        targetRole: 'management'
      }
    });
    const mgmtCookie = extractCookiePair(loginRes.headers['set-cookie']);

    // Advance simulated clock past 8-hour TTL
    simulatedNowMs += DEFAULT_SESSION_TTL_MS + 1000;

    const expiredMeRes = await simulateAuthHttpCall(handler, {
      method: 'GET',
      url: '/api/auth/me',
      cookie: mgmtCookie
    });
    assert(expiredMeRes.statusCode === 401, 'Expired session returns 401 on GET /api/auth/me');
    assert(expiredMeRes.body.code === 'SESSION_EXPIRED', 'Expired session returns code SESSION_EXPIRED');
    assert(
      (expiredMeRes.headers['set-cookie'] || '').includes('Max-Age=0'),
      'Expired session clears stale cookie via Max-Age=0'
    );
  }

  // -------------------------------------------------------------------------
  // 5. CSRF Protection Verification on State-Changing POST Requests
  // -------------------------------------------------------------------------
  console.log('\n5. Testing CSRF Protection on POST /api/auth/login, /signup, and /logout...');
  resetAuthRateLimitForTests();
  {
    const noCsrfHeaderRes = await simulateAuthHttpCall(handler, {
      method: 'POST',
      url: '/api/auth/login',
      csrfHeader: null,
      body: {
        email: 'admin@vidyutflow.demo',
        password: 'Demo@12345',
        targetRole: 'admin'
      }
    });
    assert(noCsrfHeaderRes.statusCode === 403, 'POST without X-VidyutFlow-CSRF header is rejected with 403');
    assert(
      noCsrfHeaderRes.body.code === 'CSRF_HEADER_MISSING',
      'Missing CSRF header returns code CSRF_HEADER_MISSING'
    );

    const crossOriginRes = await simulateAuthHttpCall(handler, {
      method: 'POST',
      url: '/api/auth/login',
      csrfHeader: '1',
      origin: 'https://evil-attacker.example.com',
      host: 'vidyutflow.ugvcl.demo',
      body: {
        email: 'admin@vidyutflow.demo',
        password: 'Demo@12345',
        targetRole: 'admin'
      }
    });
    assert(crossOriginRes.statusCode === 403, 'Cross-origin POST is rejected with 403');
    assert(
      crossOriginRes.body.code === 'CSRF_ORIGIN_MISMATCH',
      'Cross-origin POST returns code CSRF_ORIGIN_MISMATCH'
    );
  }

  // -------------------------------------------------------------------------
  // 6. Rate Limiting on Login Attempts
  // -------------------------------------------------------------------------
  console.log('\n6. Testing Rate Limiting on POST /api/auth/login...');
  resetAuthRateLimitForTests();
  {
    for (let i = 0; i < MAX_AUTH_ATTEMPTS_PER_WINDOW; i++) {
      const attempt = await simulateAuthHttpCall(handler, {
        method: 'POST',
        url: '/api/auth/login',
        clientIp: '203.0.113.55',
        body: {
          email: 'consumer@vidyutflow.demo',
          password: 'WrongPassword'
        }
      });
      assert(attempt.statusCode === 401, `Attempt ${i + 1}/${MAX_AUTH_ATTEMPTS_PER_WINDOW} processed (401)`);
    }

    const rateLimitedRes = await simulateAuthHttpCall(handler, {
      method: 'POST',
      url: '/api/auth/login',
      clientIp: '203.0.113.55',
      body: {
        email: 'consumer@vidyutflow.demo',
        password: 'Demo@12345'
      }
    });
    assert(rateLimitedRes.statusCode === 429, '11th attempt within 60s window is blocked with 429 Too Many Requests');
    assert(rateLimitedRes.body.code === 'RATE_LIMIT_EXCEEDED', 'Rate-limited response returns RATE_LIMIT_EXCEEDED');
    assert(rateLimitedRes.headers['retry-after'] === '60', 'Rate-limited response includes Retry-After: 60 header');
  }
  resetAuthRateLimitForTests();

  // -------------------------------------------------------------------------
  // 7. Frontend Auth Client Integration: Login, Session Verification,
  //    Protected-Route Access, and Logout Across All 5 Role Portals
  // -------------------------------------------------------------------------
  console.log('\n7. Testing Frontend Auth Client Integration Across All 5 Role Portals...');
  for (const role of roles) {
    resetAuthRateLimitForTests();
    const acc = DEFAULT_DEMO_ACCOUNTS[role];
    const browserHarness = createBrowserCookieFetchHarness(handler);

    // 7a. Login via frontend loginWithServerApi
    const loginResult = await loginWithServerApi(
      acc.email,
      acc.password,
      role,
      browserHarness.fetchImpl
    );
    assert(loginResult.success === true, `[Frontend ${role}] loginWithServerApi succeeds`);
    assert(
      loginResult.session?.role === role,
      `[Frontend ${role}] Session role assigned by server is "${role}"`
    );
    assert(
      loginResult.session?.sessionToken === SERVER_SESSION_MARKER,
      `[Frontend ${role}] Client session uses constant HTTPONLY_SERVER_COOKIE marker (real token stays in HttpOnly cookie)`
    );
    assert(
      browserHarness.getHttpOnlyCookiePair().startsWith(`${SESSION_COOKIE_NAME}=`),
      `[Frontend ${role}] Browser cookie jar received HttpOnly ${SESSION_COOKIE_NAME} cookie`
    );

    // 7b. Verify session via frontend verifyServerSessionApi (GET /api/auth/me)
    const meResult = await verifyServerSessionApi(browserHarness.fetchImpl);
    assert(meResult.authenticated === true, `[Frontend ${role}] verifyServerSessionApi confirms active session`);
    assert(meResult.session?.role === role, `[Frontend ${role}] verifyServerSessionApi returns role "${role}"`);

    // 7c. Verify protected-route access for matching portal and denial for other portals
    const activeSession = resolveSessionForAuthMode({
      requestedMode: 'server',
      serverVerifiedSession: meResult.session
    });
    const ownPortalRoute = parseCurrentUrl(`#/${role}`);
    const ownPortalDecision = resolveRouteAccess(ownPortalRoute, activeSession);
    assert(
      ownPortalDecision.authorized === true && ownPortalDecision.entered === true,
      `[Frontend ${role}] Authorized to enter own protected portal (#/${role})`
    );

    const otherRole: UserRole = role === 'admin' ? 'consumer' : 'admin';
    const crossPortalRoute = parseCurrentUrl(`#/${otherRole}`);
    const crossPortalDecision = resolveRouteAccess(crossPortalRoute, activeSession);
    assert(
      crossPortalDecision.authorized === false && crossPortalDecision.redirectToWelcome === true,
      `[Frontend ${role}] Blocked from entering #/${otherRole} portal (RBAC enforced)`
    );

    // 7d. Logout via frontend logoutServerSessionApi (POST /api/auth/logout)
    const logoutResult = await logoutServerSessionApi(browserHarness.fetchImpl);
    assert(logoutResult.loggedOut === true, `[Frontend ${role}] logoutServerSessionApi completes`);
    assert(
      browserHarness.getHttpOnlyCookiePair() === '',
      `[Frontend ${role}] HttpOnly session cookie cleared on logout`
    );

    // 7e. Post-logout session check & protected route denial
    const meAfterLogout = await verifyServerSessionApi(browserHarness.fetchImpl);
    assert(
      meAfterLogout.authenticated === false && meAfterLogout.session === null,
      `[Frontend ${role}] verifyServerSessionApi returns unauthenticated after logout`
    );
    const postLogoutDecision = resolveRouteAccess(
      ownPortalRoute,
      resolveSessionForAuthMode({
        requestedMode: 'server',
        serverVerifiedSession: meAfterLogout.session
      })
    );
    assert(
      postLogoutDecision.authorized === false &&
        postLogoutDecision.redirectToWelcome === true &&
        postLogoutDecision.denialReason === UNAUTHORIZED_NAVIGATION_MESSAGE,
      `[Frontend ${role}] Protected portal #/${role} denies access after logout`
    );
  }

  // -------------------------------------------------------------------------
  // 8. Forged localStorage Session Rejection in Server Auth Mode
  // -------------------------------------------------------------------------
  console.log('\n8. Testing Forged localStorage Session Rejection in Server Auth Mode...');
  {
    const forgedAdminLocalStorageSession: DemoSession = {
      user: {
        id: 'demo_admin',
        email: 'admin@vidyutflow.demo',
        name: 'Forged Browser Storage Admin',
        role: 'admin',
        designation: 'Forged Role'
      },
      role: 'admin',
      loginTime: new Date().toISOString(),
      sessionToken: 'vidyutflow_demo_forged_token_999999'
    };

    // Case A: Attacker injects a forged admin session into localStorage while in 'server' mode
    const resolvedServerModeSession = resolveSessionForAuthMode({
      requestedMode: 'server',
      serverVerifiedSession: null,
      storedLocalSession: forgedAdminLocalStorageSession
    });
    assert(
      resolvedServerModeSession === null,
      'Forged localStorage admin session is completely ignored in Server Auth mode'
    );

    // Case B: Attacker passes a forged localStorage session as if it were serverVerifiedSession (wrong token marker)
    const resolvedTamperedMarkerSession = resolveSessionForAuthMode({
      requestedMode: 'server',
      serverVerifiedSession: forgedAdminLocalStorageSession,
      storedLocalSession: forgedAdminLocalStorageSession
    });
    assert(
      resolvedTamperedMarkerSession === null,
      'Session without SERVER_SESSION_MARKER is rejected in Server Auth mode'
    );

    const adminRouteDecision = resolveRouteAccess(
      parseCurrentUrl('#/admin/overview'),
      resolvedServerModeSession
    );
    assert(
      adminRouteDecision.authorized === false && adminRouteDecision.redirectToWelcome === true,
      'Direct navigation to #/admin/overview with forged localStorage session is denied and redirected to Welcome'
    );
  }

  // -------------------------------------------------------------------------
  // 9. Verify Server Authentication Failures Never Silently Fall Back to Client Demo Auth
  // -------------------------------------------------------------------------
  console.log('\n9. Testing Zero Silent Fallback on Server Auth Failures...');
  resetAuthRateLimitForTests();
  {
    const browserHarness = createBrowserCookieFetchHarness(handler);

    // 9a. Wrong password with valid demo email
    const badLogin = await loginWithServerApi(
      'consumer@vidyutflow.demo',
      'IncorrectPassword!123',
      'consumer',
      browserHarness.fetchImpl
    );
    assert(badLogin.success === false && !badLogin.session, 'Server 401 failure returns success=false and no session');

    // 9b. Role mismatch with valid demo email and valid password (Demo@12345)
    const mismatchLogin = await loginWithServerApi(
      'consumer@vidyutflow.demo',
      'Demo@12345',
      'admin',
      browserHarness.fetchImpl
    );
    assert(
      mismatchLogin.success === false && !mismatchLogin.session && mismatchLogin.statusCode === 403,
      'Server 403 role mismatch returns success=false and never falls back to client demo login'
    );

    // 9c. Network/Server unreachable failure even when supplying valid demo credentials (Demo@12345)
    const unreachableFetch: FetchLike = (async () => {
      throw new Error('ECONNREFUSED: Server unreachable');
    }) as FetchLike;

    const networkFailLogin = await loginWithServerApi(
      'admin@vidyutflow.demo',
      'Demo@12345',
      'admin',
      unreachableFetch
    );
    assert(
      networkFailLogin.success === false && !networkFailLogin.session,
      'Network failure on /api/auth/login with valid Demo@12345 credentials never silently falls back to client demo mode'
    );

    const networkFailSignup = await signupWithServerApi(
      'Test Citizen',
      'citizen@example.com',
      'Citizen@2026',
      '+91 98980 11223',
      unreachableFetch
    );
    assert(
      networkFailSignup.success === false && !networkFailSignup.session,
      'Network failure on /api/auth/signup never silently falls back to client demo registration'
    );
  }

  // -------------------------------------------------------------------------
  // 10. Verify Development-Only Auth Mode Switch Cannot Bypass Server Auth in Production
  // -------------------------------------------------------------------------
  console.log('\n10. Testing Production Mode-Switch Lock (Cannot Bypass Server Auth in Production)...');
  {
    // Verify environment detection
    assert(
      isProductionAuthEnvironment({ nodeEnv: 'production' }) === true,
      'isProductionAuthEnvironment returns true when NODE_ENV="production"'
    );
    assert(
      isProductionAuthEnvironment({ viteProd: true }) === true,
      'isProductionAuthEnvironment returns true when import.meta.env.PROD=true'
    );
    assert(
      isDevAuthModeSwitchEnabled({ nodeEnv: 'production' }) === false,
      'isDevAuthModeSwitchEnabled returns false in production (UI toggle hidden & disabled)'
    );
    assert(
      isDevAuthModeSwitchEnabled({ nodeEnv: 'development', viteProd: false }) === true,
      'isDevAuthModeSwitchEnabled returns true in development/preview'
    );

    // Simulate an attacker setting vidyutflow_auth_mode="demo" and a forged admin session in localStorage in production
    const prodStorage = createMockBrowserStorage({
      [AUTH_MODE_STORAGE_KEY]: 'demo'
    });
    const forgedLocalAdmin: DemoSession = {
      user: {
        id: 'demo_admin',
        email: 'admin@vidyutflow.demo',
        name: 'Anand Patel',
        role: 'admin'
      },
      role: 'admin',
      loginTime: new Date().toISOString(),
      sessionToken: 'vidyutflow_demo_local_token'
    };

    assert(
      getStoredAuthMode(prodStorage, { nodeEnv: 'production' }) === 'server',
      'getStoredAuthMode ignores localStorage "demo" value and returns "server" in production'
    );
    assert(
      setStoredAuthMode('demo', prodStorage, { nodeEnv: 'production' }) === 'server',
      'setStoredAuthMode("demo") is blocked and returns "server" in production'
    );
    assert(
      resolveEffectiveAuthMode('demo', { nodeEnv: 'production' }) === 'server',
      'resolveEffectiveAuthMode("demo") strictly enforces "server" in production'
    );

    const prodResolvedSession = resolveSessionForAuthMode({
      requestedMode: 'demo',
      serverVerifiedSession: null,
      storedLocalSession: forgedLocalAdmin,
      envOptions: { nodeEnv: 'production' }
    });
    assert(
      prodResolvedSession === null,
      'resolveSessionForAuthMode rejects localStorage session in production even when requestedMode="demo"'
    );
  }

  // -------------------------------------------------------------------------
  // 11. Verify Authentication Changes Never Delete or Overwrite Browser Demo Records
  // -------------------------------------------------------------------------
  console.log('\n11. Testing Preservation of Browser localStorage Demo Records & Canonical Datasets...');
  {
    const initialBrowserStorageState: Record<string, string> = {
      vidyutone_bills: JSON.stringify(INITIAL_BILLS),
      vidyutone_connections: JSON.stringify(INITIAL_CONNECTIONS),
      vidyutone_payments: JSON.stringify(INITIAL_PAYMENTS),
      vidyutone_complaints: JSON.stringify(INITIAL_COMPLAINTS),
      vidyutone_applications: JSON.stringify(INITIAL_APPLICATIONS),
      vidyutone_workorders: JSON.stringify(INITIAL_WORK_ORDERS),
      vidyutflow_custom_users: JSON.stringify([{ id: 'usr_existing', email: 'saved@example.com' }]),
      vidyutflow_demo_session: JSON.stringify({ role: 'consumer', sessionToken: 'existing_sandbox_token' })
    };

    const devStorage = createMockBrowserStorage(initialBrowserStorageState);
    const browserHarness = createBrowserCookieFetchHarness(handler);

    // Toggle mode in dev -> login via server -> verify -> logout -> toggle mode back
    setStoredAuthMode('server', devStorage, { nodeEnv: 'development', viteProd: false });
    await loginWithServerApi(
      DEFAULT_DEMO_ACCOUNTS.consumer.email,
      DEFAULT_DEMO_ACCOUNTS.consumer.password,
      'consumer',
      browserHarness.fetchImpl
    );
    await verifyServerSessionApi(browserHarness.fetchImpl);
    await logoutServerSessionApi(browserHarness.fetchImpl);
    setStoredAuthMode('demo', devStorage, { nodeEnv: 'development', viteProd: false });

    const finalSnapshot = devStorage.snapshot();
    for (const [key, originalValue] of Object.entries(initialBrowserStorageState)) {
      assert(
        finalSnapshot[key] === originalValue,
        `Browser localStorage key "${key}" preserved byte-for-byte across server auth lifecycle`
      );
    }

    assert(INITIAL_BILLS.length === 4, 'Canonical INITIAL_BILLS count unchanged (4)');
    assert(INITIAL_CONNECTIONS.length === 2, 'Canonical INITIAL_CONNECTIONS count unchanged (2)');
    assert(INITIAL_PAYMENTS.length === 3, 'Canonical INITIAL_PAYMENTS count unchanged (3)');
    assert(INITIAL_COMPLAINTS.length === 4, 'Canonical INITIAL_COMPLAINTS count unchanged (4)');
    assert(INITIAL_APPLICATIONS.length === 4, 'Canonical INITIAL_APPLICATIONS count unchanged (4)');
    assert(INITIAL_WORK_ORDERS.length === 4, 'Canonical INITIAL_WORK_ORDERS count unchanged (4)');
  }

  // -------------------------------------------------------------------------
  // 12. Multi-Engineer Canonical DEMO Accounts Authentication via /api/auth/login
  // -------------------------------------------------------------------------
  console.log('\n12. Testing All 4 Canonical Field Engineer Accounts via POST /api/auth/login & loginWithServerApi...');
  {
    const fieldAccounts = getCanonicalDemoAccountsByRole('field');
    assert(
      fieldAccounts.length === 4,
      'Field Engineer role exposes all 4 canonical accounts (FLD-UG-201, FLD-UG-204, FLD-UG-209, FLD-UG-212)'
    );

    const expectedEngineers = [
      { id: 'FLD-UG-201', name: 'Vikramaditya Solanki', email: 'vikramaditya.solanki@vidyutflow.demo' },
      { id: 'FLD-UG-204', name: 'Dharmesh P. Chaudhari', email: 'dharmesh.chaudhari@vidyutflow.demo' },
      { id: 'FLD-UG-209', name: 'Hitesh N. Vaghela', email: 'hitesh.vaghela@vidyutflow.demo' },
      { id: 'FLD-UG-212', name: 'Vikram Zala', email: 'field@vidyutflow.demo' }
    ];

    for (const expected of expectedEngineers) {
      resetAuthRateLimitForTests();
      const browserHarness = createBrowserCookieFetchHarness(handler);
      const loginResult = await loginWithServerApi(
        expected.email,
        'Demo@12345',
        'field',
        browserHarness.fetchImpl
      );

      assert(
        loginResult.success === true && Boolean(loginResult.session),
        `[Engineer ${expected.id}] loginWithServerApi succeeds for ${expected.email}`
      );
      assert(
        loginResult.session?.user.id === expected.id,
        `[Engineer ${expected.id}] Client session resolves canonical user ID "${expected.id}" (got "${loginResult.session?.user.id}")`
      );
      assert(
        loginResult.session?.user.name === expected.name,
        `[Engineer ${expected.id}] Client session resolves canonical name "${expected.name}"`
      );

      const meResult = await verifyServerSessionApi(browserHarness.fetchImpl);
      assert(
        meResult.authenticated === true && meResult.session?.user.id === expected.id,
        `[Engineer ${expected.id}] GET /api/auth/me preserves canonical user ID "${expected.id}"`
      );

      const activeIdentity = getActiveUserIdentity(meResult.session, 'field');
      assert(
        activeIdentity.id === expected.id && activeIdentity.name === expected.name,
        `[Engineer ${expected.id}] getActiveUserIdentity resolves ${expected.name} (${expected.id}) for header/profile`
      );
    }

    // Also verify all 13 canonical demo identities can authenticate via server auth
    for (const identity of CANONICAL_DEMO_IDENTITIES) {
      resetAuthRateLimitForTests();
      const res = await simulateAuthHttpCall(handler, {
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: identity.email,
          password: identity.password,
          targetRole: identity.role
        }
      });
      assert(
        res.statusCode === 200 && res.body.authenticated === true,
        `[Canonical Directory] ${identity.id} (${identity.email}) authenticates via POST /api/auth/login`
      );
    }
  }

  console.log('\n==================================================================');
  console.log(`ALL ${passed} SERVER AUTH API & FRONTEND INTEGRATION TESTS PASSED!`);
  console.log('==================================================================');
}

runTests().catch(err => {
  console.error('Unhandled error in server-auth-api.test.ts:', err);
  process.exit(1);
});
