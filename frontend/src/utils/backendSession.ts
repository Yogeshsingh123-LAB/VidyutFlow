/**
 * Temporary FastAPI session bridge (prototype dual-auth mitigation).
 *
 * Security invariants:
 * 1. Exact credentials only: never falls back to shared or role-mapped demo accounts.
 * 2. Identity & role verification: FastAPI `/auth/me` must match the normalized portal
 *    email and expected RBAC role before any token becomes active.
 * 3. In-memory lifetime only: tokens are never written to `localStorage` or
 *    `sessionStorage` (which clones into child tabs); legacy `localStorage` keys are
 *    purged on load. Reloading the tab intentionally requires signing in again for live APIs.
 * 4. Portal-session binding: before authenticated FastAPI calls (and on tab focus /
 *    visibility restore / cross-tab BroadcastChannel events), the portal identity is
 *    re-checked and mismatches or logouts fail closed immediately.
 *
 * Note: Node portal auth and FastAPI auth remain separate stores in this prototype;
 * this bridge prevents silent cross-account fallback, not dual-store architecture itself.
 */

const ROLE_MAP: Record<string, string> = {
  consumer: 'consumer',
  employee: 'officer',
  field: 'engineer',
  management: 'admin',
  admin: 'admin',
};

const FALLBACK_TTL_MS = 60 * 60 * 1000;
const MAX_TTL_MS = 24 * 60 * 60 * 1000;
const LEGACY_STORAGE_KEYS = ['vidyutos_token', 'vidyutos_token_exp', 'vidyutos_email'] as const;

export interface BackendSyncOptions {
  /**
   * True when `GET /api/auth/me` confirmed the HttpOnly portal cookie at login/signup time.
   * Defaults to true so standalone callers fail closed if `/api/auth/me` later returns 401.
   */
  portalCookieVerified?: boolean;
}

type ActiveSession = {
  token: string;
  email: string;
  portalRole: string;
  expiresAt: number;
  portalCookieVerified: boolean;
};

let active: ActiveSession | null = null;
let pending: { email: string; portalRole: string } | null = null;
let generation = 0;
const listeners = new Set<() => void>();

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const emit = (): void => {
  for (const listener of listeners) listener();
};

function decodeBase64Url(segment: string): string | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    if (typeof atob === 'function') {
      return atob(padded);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract expiry from a JWT `exp` claim when present, rejecting malformed or already-expired
 * JWTs. Non-JWT opaque tokens (used in unit tests) fall back to 1 hour.
 */
export function resolveTokenExpiryMs(token: string, nowMs: number = Date.now()): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return nowMs + FALLBACK_TTL_MS;
  }
  const rawPayload = decodeBase64Url(parts[1]);
  if (!rawPayload) return null;
  try {
    const payload = JSON.parse(rawPayload) as { exp?: unknown };
    if (payload.exp === undefined) {
      return nowMs + FALLBACK_TTL_MS;
    }
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      return null;
    }
    const expMs = payload.exp * 1000;
    if (expMs <= nowMs) {
      return null;
    }
    return Math.min(expMs, nowMs + MAX_TTL_MS);
  } catch {
    return null;
  }
}

let authChannel: BroadcastChannel | null = null;

function setupBrowserGuards(): void {
  if (typeof window === 'undefined') return;

  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Web Storage may be disabled
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      authChannel = new BroadcastChannel('vidyutflow_auth_boundary');
      authChannel.onmessage = (event: MessageEvent) => {
        const payload = event?.data as { type?: string; email?: string | null; portalRole?: string | null } | null;
        if (payload && payload.type === 'portal-identity') {
          reconcileBackendIdentity(payload.email ?? null, payload.portalRole ?? null);
        }
      };
    }
  } catch {
    authChannel = null;
  }

  const revalidateOnReturn = () => {
    if (active) {
      void getVerifiedBackendToken();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        revalidateOnReturn();
      }
    });
  }
  window.addEventListener('focus', revalidateOnReturn);
}

setupBrowserGuards();

export const getBackendSessionGeneration = (): number => generation;

export const subscribeBackendSession = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getBackendToken = (): string | null => {
  if (!active) return null;
  if (Date.now() >= active.expiresAt) {
    clearBackendSession();
    return null;
  }
  return active.token;
};

export const hasBackendSession = (): boolean => getBackendToken() !== null;

export function clearBackendSession(): void {
  const hadState = active !== null || pending !== null;
  generation += 1;
  active = null;
  pending = null;
  if (hadState) {
    emit();
  }
}

/** Clear stale or in-flight credentials when the portal identity no longer matches. */
export function reconcileBackendIdentity(email: string | null, portalRole: string | null): void {
  const current = active || pending;
  if (!current) return;
  if (!email || normalizeEmail(email) !== current.email || portalRole !== current.portalRole) {
    clearBackendSession();
  }
}

/** Reconcile local state and notify sibling same-origin tabs of portal identity changes. */
export function notifyPortalIdentityChanged(email: string | null, portalRole: string | null): void {
  reconcileBackendIdentity(email, portalRole);
  try {
    authChannel?.postMessage({ type: 'portal-identity', email, portalRole });
  } catch {
    // Ignore closed/unsupported BroadcastChannel
  }
}

/**
 * Re-verify that the current portal session still belongs to the same user/role before
 * attaching a FastAPI Bearer token. Fails closed on logout, expiry, or account switch.
 */
export async function getVerifiedBackendToken(): Promise<string | null> {
  const token = getBackendToken();
  const expected = active;
  const attempt = generation;
  if (!token || !expected) return null;

  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
    if (attempt !== generation) return null;

    if (res.ok) {
      const session = (await res.json()) as {
        authenticated?: boolean;
        user?: { email?: unknown };
        role?: unknown;
      };
      if (attempt !== generation) return null;
      if (
        !session.authenticated ||
        typeof session.user?.email !== 'string' ||
        normalizeEmail(session.user.email) !== expected.email ||
        session.role !== expected.portalRole
      ) {
        clearBackendSession();
        return null;
      }
      return getBackendToken();
    }

    if (!expected.portalCookieVerified && res.status === 401) {
      let code: string | undefined;
      try {
        const body = (await res.json()) as { code?: unknown };
        if (typeof body.code === 'string') code = body.code;
      } catch {
        // Ignore non-JSON 401 body
      }
      if (attempt !== generation) return null;
      if (code && code !== 'SESSION_EXPIRED') {
        return getBackendToken();
      }
    }

    if (attempt === generation) clearBackendSession();
    return null;
  } catch {
    if (attempt === generation) clearBackendSession();
    return null;
  }
}

async function authenticateExactBackendUser(
  attempt: number,
  expectedEmail: string,
  password: string,
  portalRole: string,
  expectedRole: string,
  portalCookieVerified: boolean
): Promise<boolean> {
  const body = new URLSearchParams({ username: expectedEmail, password });
  const response = await fetch('/api/backend/auth/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Use-Cookie-Session': '1',
    },
    body,
  });
  if (!response.ok || attempt !== generation) return false;

  const auth = (await response.json()) as { access_token?: unknown };
  if (typeof auth.access_token !== 'string' || !auth.access_token || attempt !== generation) {
    return false;
  }

  const expiresAt = resolveTokenExpiryMs(auth.access_token);
  if (expiresAt === null) return false;

  const me = await fetch('/api/backend/auth/me', {
    credentials: 'same-origin',
    headers: { Authorization: `Bearer ${auth.access_token}` },
  });
  if (!me.ok || attempt !== generation) return false;

  const identity = (await me.json()) as { email?: unknown; role?: unknown };
  if (
    attempt !== generation ||
    typeof identity.email !== 'string' ||
    normalizeEmail(identity.email) !== expectedEmail ||
    identity.role !== expectedRole
  ) {
    return false;
  }

  active = {
    token: auth.access_token,
    email: expectedEmail,
    portalRole,
    expiresAt,
    portalCookieVerified,
  };
  pending = null;
  emit();
  return true;
}

export async function syncBackendSession(
  email: string,
  password: string,
  portalRole: string,
  options: BackendSyncOptions = {}
): Promise<boolean> {
  clearBackendSession();
  const expectedEmail = normalizeEmail(email);
  const expectedRole = ROLE_MAP[portalRole];
  if (!expectedEmail || !password || !expectedRole) return false;

  const attempt = ++generation;
  pending = { email: expectedEmail, portalRole };
  try {
    return await authenticateExactBackendUser(
      attempt,
      expectedEmail,
      password,
      portalRole,
      expectedRole,
      options.portalCookieVerified ?? true
    );
  } catch {
    return false;
  } finally {
    if (attempt === generation) pending = null;
  }
}

/**
 * Provision a brand-new consumer account in FastAPI on server-mode signup (`201 Created` only),
 * then authenticate that exact consumer. Never attaches to a pre-existing FastAPI account if
 * `/auth/register` returns 400/conflict (e.g. across ephemeral Node restarts).
 */
export async function registerBackendConsumerSession(
  name: string,
  email: string,
  password: string,
  options: BackendSyncOptions = {}
): Promise<boolean> {
  clearBackendSession();
  const trimmedName = name.trim();
  const expectedEmail = normalizeEmail(email);
  if (!trimmedName || !expectedEmail || !password) return false;
  if (new TextEncoder().encode(password).length > 72) return false;

  const attempt = ++generation;
  pending = { email: expectedEmail, portalRole: 'consumer' };
  try {
    const registerRes = await fetch('/api/backend/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: expectedEmail,
        name: trimmedName,
        password,
        role: 'consumer',
      }),
    });
    if (registerRes.status !== 201 || attempt !== generation) {
      return false;
    }
    return await authenticateExactBackendUser(
      attempt,
      expectedEmail,
      password,
      'consumer',
      'consumer',
      options.portalCookieVerified ?? true
    );
  } catch {
    return false;
  } finally {
    if (attempt === generation) pending = null;
  }
}

/**
 * Unified Simulated OIDC / Gujarat Parichay SSO bridge to FastAPI (Items #8 & #18).
 */
export async function syncBackendSsoSession(
  providerId: string,
  email: string,
  portalRole: string,
  stateToken: string,
  options: BackendSyncOptions = {}
): Promise<boolean> {
  clearBackendSession();
  const expectedEmail = normalizeEmail(email);
  const expectedRole = ROLE_MAP[portalRole];
  if (!expectedEmail || !providerId || !expectedRole || stateToken.length < 8) return false;

  // Map canonical `@vidyutflow.demo` emails to seeded `@vidyut.local` equivalents if needed
  const ssoCandidateEmails = [expectedEmail];
  if (expectedEmail.endsWith('@vidyutflow.demo')) {
    const fallbackByRole: Record<string, string> = {
      consumer: 'consumer@vidyut.local',
      officer: 'officer@vidyut.local',
      engineer: 'engineer@vidyut.local',
      admin: 'admin@vidyut.local',
    };
    if (fallbackByRole[expectedRole]) {
      ssoCandidateEmails.push(fallbackByRole[expectedRole]);
    }
  }

  const attempt = ++generation;
  pending = { email: expectedEmail, portalRole };
  try {
    for (const candidateEmail of ssoCandidateEmails) {
      const res = await fetch('/api/backend/auth/sso/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          email: candidateEmail,
          state: stateToken,
        }),
      });
      if (!res.ok) continue;
      if (attempt !== generation) return false;
      const auth = (await res.json()) as { access_token?: unknown };
      if (typeof auth.access_token !== 'string' || !auth.access_token) continue;
      const expiresAt = resolveTokenExpiryMs(auth.access_token);
      if (expiresAt === null) continue;
      const me = await fetch('/api/backend/auth/me', {
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${auth.access_token}` },
      });
      if (!me.ok || attempt !== generation) return false;
      const identity = (await me.json()) as { role?: unknown };
      if (identity.role !== expectedRole) return false;
      active = {
        token: auth.access_token,
        email: expectedEmail,
        portalRole,
        expiresAt,
        portalCookieVerified: options.portalCookieVerified ?? true,
      };
      pending = null;
      emit();
      return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    if (attempt === generation) pending = null;
  }
}

/**
 * Revoke the FastAPI HttpOnly session cookie alongside the Node portal cookie on logout.
 */
export async function logoutBackendCookieSession(): Promise<void> {
  clearBackendSession();
  try {
    await fetch('/api/backend/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
  } catch {
    // Ignore when FastAPI is offline in static preview mode
  }
}
