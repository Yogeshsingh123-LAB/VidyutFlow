import { UserRole } from '../types';
import { DemoSession, resolveCanonicalDemoIdentity } from '../data/demoAuthData';

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

  const canonical =
    payload.user.isDemoAccount !== false
      ? resolveCanonicalDemoIdentity({
          id: payload.user.id,
          email: payload.user.email,
          name: payload.user.name,
          role: payload.user.role
        })
      : undefined;

  const resolvedId =
    canonical && payload.user.id !== 'demo_consumer'
      ? canonical.id
      : payload.user.id;

  return {
    user: {
      id: resolvedId,
      email: payload.user.email,
      name: canonical?.name || payload.user.name,
      role: payload.user.role,
      designation: canonical?.designation || payload.user.designation,
      subdivision: canonical?.subdivision || payload.user.division,
      mobileNumber: payload.user.mobileNumber || canonical?.phone,
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
  identifier: string,
  password: string,
  targetRole: UserRole,
  mfaCodeOrFetch?: string | FetchLike,
  fetchImpl: FetchLike = fetch
): Promise<{
  success: boolean;
  session?: DemoSession;
  error?: string;
  statusCode?: number;
  code?: string;
  mfaRequired?: boolean;
}> {
  let effectiveFetch = fetchImpl;
  let effectiveMfaCode: string | undefined = undefined;
  if (typeof mfaCodeOrFetch === 'function') {
    effectiveFetch = mfaCodeOrFetch;
  } else if (typeof mfaCodeOrFetch === 'string') {
    effectiveMfaCode = mfaCodeOrFetch;
  }

  try {
    const response = await effectiveFetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-VidyutFlow-CSRF': '1'
      },
      body: JSON.stringify({
        email: identifier.trim(),
        username: identifier.trim(),
        employeeId: identifier.trim(),
        password,
        targetRole,
        mfa_code: effectiveMfaCode?.trim() || undefined,
        mfaCode: effectiveMfaCode?.trim() || undefined
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
  referenceId?: string;
}> {
  const referenceId = `REG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  try {
    const response = await fetchImpl('/api/auth/signup', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-VidyutFlow-CSRF': '1',
        'X-Request-Id': referenceId
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password,
        mobileNumber: mobileNumber?.trim() || undefined
      })
    });

    const serverRequestId = response.headers.get('X-Request-Id') || referenceId;
    let data: (ServerAuthApiPayload & { detail?: unknown }) = { authenticated: false };
    try {
      data = (await response.json()) as (ServerAuthApiPayload & { detail?: unknown });
    } catch {
      // JSON parse failed
    }

    if (!response.ok || !data.authenticated) {
      let resolvedError = data.error;
      if (!resolvedError && typeof data.detail === 'string') {
        resolvedError = data.detail;
      }

      if (!resolvedError) {
        switch (response.status) {
          case 400:
            resolvedError = 'Invalid registration details. Please verify your information and try again.';
            break;
          case 401:
            resolvedError = 'Authentication failed. Please verify credentials.';
            break;
          case 403:
            resolvedError = 'Registration forbidden: Privileged roles cannot be self-registered.';
            break;
          case 404:
            resolvedError = 'Registration endpoint not found on server (/api/auth/signup).';
            break;
          case 409:
            resolvedError = 'An account with this email address already exists. Please proceed to login.';
            break;
          case 422:
            resolvedError = 'Validation failed. Please provide a valid full name, email, and compliant password.';
            break;
          case 429:
            resolvedError = 'Too many registration attempts. Please wait a minute before trying again.';
            break;
          case 500:
            resolvedError = `Internal server error during registration. Support Reference: ${serverRequestId}`;
            break;
          case 502:
            resolvedError = `Registration gateway error: Upstream authentication service unreachable. Support Reference: ${serverRequestId}`;
            break;
          case 503:
            resolvedError = 'Registration service is temporarily unavailable. Please try again later.';
            break;
          default:
            resolvedError = `Registration failed with HTTP ${response.status}. Support Reference: ${serverRequestId}`;
        }
      }

      return {
        success: false,
        error: resolvedError,
        statusCode: response.status,
        code: data.code || `HTTP_${response.status}`,
        referenceId: serverRequestId
      };
    }

    const session = toClientSessionFromServerPayload(data);
    if (!session) {
      return {
        success: false,
        error: 'Malformed signup response from server.',
        statusCode: 500,
        referenceId: serverRequestId
      };
    }

    return {
      success: true,
      session,
      referenceId: serverRequestId
    };
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.message.toLowerCase().includes('timeout'));
    return {
      success: false,
      statusCode: isTimeout ? 408 : 503,
      code: isTimeout ? 'REQUEST_TIMEOUT' : 'CONNECTION_REFUSED',
      referenceId,
      error: isTimeout
        ? 'Registration request timed out. Please check your network connection and try again.'
        : `Registration service is temporarily unavailable. Please try again later. (Support Ref: ${referenceId})`
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

/**
 * Simulated OIDC / Gujarat Parichay Single Sign-On against `/api/auth/sso` (Item #18).
 */
export async function loginWithSimulatedSsoApi(
  params: {
    email: string;
    providerId: string;
    state: string;
    targetRole?: UserRole;
  },
  fetchImpl: FetchLike = fetch
): Promise<{
  success: boolean;
  session?: DemoSession;
  disclosure?: string;
  error?: string;
  statusCode?: number;
}> {
  try {
    const response = await fetchImpl('/api/auth/sso', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-VidyutFlow-CSRF': '1'
      },
      body: JSON.stringify({
        email: params.email.trim().toLowerCase(),
        providerId: params.providerId,
        state: params.state,
        targetRole: params.targetRole
      })
    });
    const data = (await response.json().catch(() => ({}))) as ServerAuthApiPayload & {
      disclosure?: string;
    };
    if (!response.ok || !data.authenticated) {
      return {
        success: false,
        error: data.error || 'Simulated SSO sign-in failed.',
        statusCode: response.status
      };
    }
    const session = toClientSessionFromServerPayload(data);
    if (!session) {
      return { success: false, error: 'Malformed SSO response from server.', statusCode: 500 };
    }
    return {
      success: true,
      session,
      disclosure: data.disclosure
    };
  } catch {
    return {
      success: false,
      error: 'Unable to reach /api/auth/sso server endpoint.'
    };
  }
}

/**
 * Fetches an uncopyable, bot-resistant security CAPTCHA with tamper-proof HMAC nonce.
 */
export async function fetchCaptcha(
  fetchImpl: FetchLike = fetch
): Promise<{
  success: boolean;
  captchaToken?: string;
  captchaSvg?: string;
  expiresInSeconds?: number;
  error?: string;
}> {
  try {
    const response = await fetchImpl('/api/auth/captcha', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.captcha_token) {
      return {
        success: false,
        error: data.detail || data.error || 'Failed to generate security CAPTCHA.'
      };
    }
    return {
      success: true,
      captchaToken: data.captcha_token,
      captchaSvg: data.captcha_svg,
      expiresInSeconds: data.expires_in_seconds || 180
    };
  } catch {
    return {
      success: false,
      error: 'Unable to reach the CAPTCHA service. Please check your network connection.'
    };
  }
}

export interface SendConsumerOtpParams {
  mobileNumber: string;
  captchaToken?: string;
  captchaAnswer?: string;
  consumerNo?: string;
  discom?: string;
}

/**
 * Initiates single-use OTP delivery for Consumer verification.
 */
export async function sendConsumerLoginOtp(
  arg1: string | SendConsumerOtpParams,
  arg2?: string,
  arg3?: string,
  arg4?: FetchLike
): Promise<{
  success: boolean;
  status?: string;
  consumerNo?: string;
  maskedMobile?: string;
  expiresInSeconds?: number;
  cooldownSeconds?: number;
  devSimulationOtp?: string;
  message?: string;
  error?: string;
}> {
  let mobileNumber = '';
  let consumerNo: string | undefined;
  let captchaToken: string | undefined;
  let captchaAnswer: string | undefined;
  let discom = 'UGVCL';
  let fetchImpl: FetchLike = fetch;

  if (typeof arg1 === 'object') {
    mobileNumber = arg1.mobileNumber;
    consumerNo = arg1.consumerNo;
    captchaToken = arg1.captchaToken;
    captchaAnswer = arg1.captchaAnswer;
    discom = arg1.discom || 'UGVCL';
    if (typeof arg2 === 'function') fetchImpl = arg2 as any;
  } else {
    // Positional signature: (consumerNo, mobileNumber, discom, fetchImpl)
    if (arg2 !== undefined && typeof arg2 === 'string') {
      consumerNo = arg1;
      mobileNumber = arg2;
      if (arg3 && typeof arg3 === 'string') discom = arg3;
      if (typeof arg4 === 'function') fetchImpl = arg4;
    } else {
      mobileNumber = arg1;
    }
  }

  try {
    const payload: any = {
      mobile_number: mobileNumber.trim(),
      discom
    };
    if (consumerNo) payload.consumer_no = consumerNo.trim();
    if (captchaToken) payload.captcha_token = captchaToken.trim();
    if (captchaAnswer) payload.captcha_answer = captchaAnswer.trim();

    const response = await fetchImpl('/api/auth/consumer/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-VidyutFlow-CSRF': '1' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.detail || data.error || 'Failed to send OTP. Please check your registered mobile and security captcha.'
      };
    }
    return {
      success: true,
      status: data.status,
      consumerNo: data.consumer_no,
      maskedMobile: data.masked_mobile,
      expiresInSeconds: data.expires_in_seconds,
      cooldownSeconds: data.cooldown_seconds,
      devSimulationOtp: data.dev_simulation_otp,
      message: data.message
    };
  } catch {
    return {
      success: false,
      error: 'Unable to connect to authentication server. Please verify your connection.'
    };
  }
}

/**
 * Verifies Consumer OTP and establishes authenticated session.
 */
export async function verifyConsumerLoginOtp(
  mobileOrConsumerNo: string,
  otp: string,
  fetchImpl: FetchLike = fetch
): Promise<{
  success: boolean;
  session?: DemoSession;
  error?: string;
  code?: string;
}> {
  try {
    const trimmed = mobileOrConsumerNo.trim();
    const isMobile = /^\d{10}$/.test(trimmed.replace(/\D/g, ''));
    const payload: any = {
      otp: otp.trim()
    };
    if (isMobile) {
      payload.mobile_number = trimmed;
    } else {
      payload.consumer_no = trimmed;
    }

    const response = await fetchImpl('/api/auth/consumer/otp/verify', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-VidyutFlow-CSRF': '1' },
      body: JSON.stringify(payload)
    });
    const data = (await response.json().catch(() => ({}))) as ServerAuthApiPayload;
    if (!response.ok || !data.authenticated) {
      return {
        success: false,
        error: (data as any).detail || data.error || 'Invalid or expired verification code.',
        code: data.code
      };
    }
    const session = toClientSessionFromServerPayload(data);
    if (!session) {
      return { success: false, error: 'Malformed authentication response.' };
    }
    return { success: true, session };
  } catch {
    return {
      success: false,
      error: 'Unable to reach the verification server. Please try again.'
    };
  }
}
