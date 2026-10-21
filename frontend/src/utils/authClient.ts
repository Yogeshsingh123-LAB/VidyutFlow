import { UserRole } from '../types';
import { DemoSession } from '../data/demoAuthData';

/**
 * VidyutFlow Frontend Authentication Mode & Server API Client (Step 5B.2)
 *
 * Supports two explicitly separated authentication modes in development:
 * 1. `'server'` — Authenticates against `/api/auth/login`, `/api/auth/signup`,
 *    `/api/auth/logout`, and `/api/auth/me` using `HttpOnly` cookies and server-side
 *    `crypto.scrypt` verification. Never exposes session tokens to browser JavaScript,
 *    never trusts `localStorage` session objects, and never falls back to client auth on error.
 * 2. `'demo'`   — Development-only local browser sandbox authentication flow
 *    for offline/static preview fallback without modifying or resetting any stored records.
 *
 * PRODUCTION SECURITY ENFORCEMENT:
 * In production (`NODE_ENV === 'production'` or `import.meta.env.PROD === true`),
 * the development-only mode switch is disabled and `'server'` mode is strictly enforced
 * regardless of any `localStorage` manipulation.
 */

export type AuthMode = 'server' | 'demo';

export const AUTH_MODE_STORAGE_KEY = 'vidyutflow_auth_mode';
export const SERVER_SESSION_MARKER = 'HTTPONLY_SERVER_COOKIE';

// Default authentication mode after Step 5B.2 integration verification
export const DEFAULT_AUTH_MODE: AuthMode = 'server';

export interface AuthEnvironmentOptions {
  nodeEnv?: string;
  viteProd?: boolean;
}

/**
 * Determines whether the application is running in a production environment where
 * the development-only authentication mode switch must be locked to `'server'`.
 */
export function isProductionAuthEnvironment(options?: AuthEnvironmentOptions): boolean {
  if (options?.nodeEnv !== undefined) {
    return options.nodeEnv === 'production';
  }
  if (options?.viteProd !== undefined) {
    return options.viteProd === true;
  }
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    return true;
  }
  try {
    const metaEnv = (import.meta as unknown as { env?: { PROD?: boolean; MODE?: string } })?.env;
    if (metaEnv && (metaEnv.PROD === true || metaEnv.MODE === 'production')) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Returns `true` only in non-production development/preview environments.
 * In production, returns `false` so the mode switch cannot be used to bypass server auth.
 */
export function isDevAuthModeSwitchEnabled(options?: AuthEnvironmentOptions): boolean {
  return !isProductionAuthEnvironment(options);
}

/**
 * Resolves the effective authentication mode.
 * In production, strictly enforces `'server'` even if `'demo'` was requested or stored in localStorage.
 */
export function resolveEffectiveAuthMode(
  requestedMode?: AuthMode | string | null,
  options?: AuthEnvironmentOptions
): AuthMode {
  if (isProductionAuthEnvironment(options)) {
    return 'server';
  }
  if (requestedMode === 'demo' || requestedMode === 'server') {
    return requestedMode;
  }
  return DEFAULT_AUTH_MODE;
}

export function getStoredAuthMode(
  storage?: Pick<Storage, 'getItem'> | null,
  options?: AuthEnvironmentOptions
): AuthMode {
  if (isProductionAuthEnvironment(options)) {
    return 'server';
  }
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;
  if (!targetStorage) return DEFAULT_AUTH_MODE;
  try {
    const raw = targetStorage.getItem(AUTH_MODE_STORAGE_KEY);
    return resolveEffectiveAuthMode(raw, options);
  } catch {}
  return DEFAULT_AUTH_MODE;
}

export function setStoredAuthMode(
  mode: AuthMode,
  storage?: Pick<Storage, 'setItem'> | null,
  options?: AuthEnvironmentOptions
): AuthMode {
  if (isProductionAuthEnvironment(options)) {
    return 'server';
  }
  const effectiveMode = resolveEffectiveAuthMode(mode, options);
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;
  if (targetStorage) {
    try {
      targetStorage.setItem(AUTH_MODE_STORAGE_KEY, effectiveMode);
    } catch {}
  }
  return effectiveMode;
}

/**
 * Resolves the active session for route guards and portal access.
 * - In `'server'` mode (or unconditionally in production), `storedLocalSession` from
 *   `localStorage` is completely ignored (preventing forged localStorage session attacks),
 *   and only a server-verified session (`sessionToken === SERVER_SESSION_MARKER`) is accepted.
 * - In development `'demo'` mode, returns `storedLocalSession`.
 */
export function resolveSessionForAuthMode(params: {
  requestedMode?: AuthMode | string | null;
  serverVerifiedSession: DemoSession | null;
  storedLocalSession?: DemoSession | null;
  envOptions?: AuthEnvironmentOptions;
}): DemoSession | null {
  const effectiveMode = resolveEffectiveAuthMode(params.requestedMode, params.envOptions);
  if (effectiveMode === 'server') {
    if (
      params.serverVerifiedSession &&
      params.serverVerifiedSession.sessionToken === SERVER_SESSION_MARKER
    ) {
      return params.serverVerifiedSession;
    }
    return null;
  }
  return params.storedLocalSession ?? null;
}

export interface ServerAuthApiPayload {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    designation?: string;
    department?: string;
    division?: string;
    mobileNumber?: string;
    isDemoAccount?: boolean;
  };
  role?: UserRole;
  loginTime?: string;
  expiresAt?: number;
  error?: string;
  code?: string;
}

/**
 * Converts a verified server identity payload into an in-memory client `DemoSession`
 * state object. Note that `sessionToken` is set to the constant marker `'HTTPONLY_SERVER_COOKIE'`
 * because the real session token resides exclusively in the browser's `HttpOnly` cookie.
 */
export function toClientSessionFromServerPayload(
  payload: ServerAuthApiPayload
): DemoSession | null {
  if (!payload || !payload.authenticated || !payload.user || !payload.role) {
    return null;
  }
  return {
    user: {
      id: payload.user.id,
      email: payload.user.email,
      name: payload.user.name,
      role: payload.user.role,
      designation: payload.user.designation,
      mobileNumber: payload.user.mobileNumber,
      isCustomSignup: payload.user.isDemoAccount === false
    },
    role: payload.role,
    loginTime: payload.loginTime || new Date().toISOString(),
    sessionToken: SERVER_SESSION_MARKER
  };
}

export type FetchLike = typeof fetch;

/**
 * Authenticates via `POST /api/auth/login`.
 * Never falls back to client-side authentication if the server rejects or fails.
 */
export async function loginWithServerApi(
  email: string,
  password: string,
  targetRole: UserRole,
  fetchImpl: FetchLike = fetch
): Promise<{
  success: boolean;
  session?: DemoSession;
  error?: string;
  statusCode?: number;
  code?: string;
}> {
  try {
    const response = await fetchImpl('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-VidyutFlow-CSRF': '1'
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
        targetRole
      })
    });

    const data = (await response.json().catch(() => ({}))) as ServerAuthApiPayload;

    if (!response.ok || !data.authenticated) {
      return {
        success: false,
        error: data.error || 'Server authentication failed. Please verify your credentials.',
        statusCode: response.status,
        code: data.code
      };
    }

    const session = toClientSessionFromServerPayload(data);
    if (!session) {
      return {
        success: false,
        error: 'Malformed authentication response from server.',
        statusCode: 500
      };
    }

    return {
      success: true,
      session
    };
  } catch {
    return {
      success: false,
      error:
        'Unable to reach the authentication server (/api/auth/login). Server authentication mode does not automatically fall back to client demo mode.'
    };
  }
}

/**
 * Registers a new Consumer account via `POST /api/auth/signup`.
 */
export async function signupWithServerApi(
  name: string,
  email: string,
  password: string,
  mobileNumber?: string,
  fetchImpl: FetchLike = fetch
): Promise<{
  success: boolean;
  session?: DemoSession;
  error?: string;
  statusCode?: number;
  code?: string;
}> {
  try {
    const response = await fetchImpl('/api/auth/signup', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-VidyutFlow-CSRF': '1'
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password,
        mobileNumber: mobileNumber?.trim() || undefined
      })
    });

    const data = (await response.json().catch(() => ({}))) as ServerAuthApiPayload;

    if (!response.ok || !data.authenticated) {
      return {
        success: false,
        error: data.error || 'Consumer registration failed on server.',
        statusCode: response.status,
        code: data.code
      };
    }

    const session = toClientSessionFromServerPayload(data);
    if (!session) {
      return {
        success: false,
        error: 'Malformed signup response from server.',
        statusCode: 500
      };
    }

    return {
      success: true,
      session
    };
  } catch {
    return {
      success: false,
      error:
        'Unable to reach the registration server (/api/auth/signup). Server authentication mode does not automatically fall back to client demo mode.'
    };
  }
}

/**
 * Verifies the active `HttpOnly` session cookie via `GET /api/auth/me`.
 */
export async function verifyServerSessionApi(
  fetchImpl: FetchLike = fetch
): Promise<{
  authenticated: boolean;
  session: DemoSession | null;
  error?: string;
  code?: string;
}> {
  try {
    const response = await fetchImpl('/api/auth/me', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json'
      }
    });

    const data = (await response.json().catch(() => ({}))) as ServerAuthApiPayload;

    if (!response.ok || !data.authenticated) {
      return {
        authenticated: false,
        session: null,
        error: data.error,
        code: data.code
      };
    }

    const session = toClientSessionFromServerPayload(data);
    return {
      authenticated: Boolean(session),
      session
    };
  } catch {
    return {
      authenticated: false,
      session: null,
      error: 'Unable to verify session with /api/auth/me.'
    };
  }
}

/**
 * Revokes the active server session and clears the `HttpOnly` cookie via `POST /api/auth/logout`.
 */
export async function logoutServerSessionApi(
  fetchImpl: FetchLike = fetch
): Promise<{ loggedOut: boolean }> {
  try {
    await fetchImpl('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-VidyutFlow-CSRF': '1'
      }
    });
    return { loggedOut: true };
  } catch {
    return { loggedOut: false };
  }
}
