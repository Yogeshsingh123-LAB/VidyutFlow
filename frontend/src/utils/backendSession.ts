/**
 * Silent backend (FastAPI) session bridge for the live API panels.
 *
 * The portal session (server cookie auth or demo sandbox) remains the primary login.
 * This module additionally acquires the backend JWT that `fastApiClient` reads from
 * `vidyutos_token`, so live panels can call `/api/requests`, `/api/notifications`, etc.
 *
 * Credentials: the portal login form's own email/password is tried first. The backend
 * seeds the same portal demo accounts (`*@vidyutflow.demo` / `Demo@12345`), so one
 * credential set covers portal + API. A role-mapped fallback covers older databases.
 *
 * Everything here is fire-and-forget: if the API is down, live panels simply stay
 * hidden/idle and the portal keeps showing its demo workspace.
 */

const TOKEN_KEY = 'vidyutos_token';
const TOKEN_EXP_KEY = 'vidyutos_token_exp';
const EMAIL_KEY = 'vidyutos_email';

/** Role-mapped backend fallbacks (synthetic demo seed in backend/app/main.py). */
export const ROLE_FALLBACK_ACCOUNTS: Record<string, { email: string; password: string }> = {
  consumer: { email: 'consumer@vidyutflow.demo', password: 'Demo@12345' },
  employee: { email: 'employee@vidyutflow.demo', password: 'Demo@12345' },
  field: { email: 'field@vidyutflow.demo', password: 'Demo@12345' },
  management: { email: 'management@vidyutflow.demo', password: 'Demo@12345' },
  admin: { email: 'admin@vidyutflow.demo', password: 'Demo@12345' }
};

interface BackendTokenPayload {
  access_token: string;
  token_type: string;
  role: string;
  name: string;
  user_id: string;
  zone: string;
}

export const getBackendToken = (): string | null => {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const hasBackendSession = (): boolean => {
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const exp = Number(window.localStorage.getItem(TOKEN_EXP_KEY) || 0);
    return Boolean(token) && Date.now() < exp;
  } catch {
    return false;
  }
};

async function requestBackendToken(
  email: string,
  password: string
): Promise<BackendTokenPayload | null> {
  // Route via /api/backend/* — the dev server's own /api/auth middleware would
  // otherwise shadow the FastAPI OAuth2 login endpoint.
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch('/api/backend/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) return null;
  const payload = (await res.json()) as BackendTokenPayload;
  return payload?.access_token ? payload : null;
}

/**
 * Acquire and store the backend JWT for live panels. Never throws; returns whether
 * a live backend session is now available.
 */
export async function syncBackendSession(
  email: string,
  password: string,
  portalRole: string
): Promise<boolean> {
  try {
    let auth = await requestBackendToken(email, password);
    if (!auth) {
      const fallback = ROLE_FALLBACK_ACCOUNTS[portalRole];
      if (fallback) auth = await requestBackendToken(fallback.email, fallback.password);
    }
    if (!auth) return false;
    window.localStorage.setItem(TOKEN_KEY, auth.access_token);
    // Backend tokens default to 24h; use a shorter safety window so panels re-sync on next login.
    window.localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + 60 * 60 * 1000));
    window.localStorage.setItem(EMAIL_KEY, email);
    return true;
  } catch {
    return false;
  }
}

export function clearBackendSession(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(TOKEN_EXP_KEY);
    window.localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
