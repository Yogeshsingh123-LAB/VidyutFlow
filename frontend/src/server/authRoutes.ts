import type { IncomingMessage, ServerResponse } from 'http';
import {
  ServerAuthService,
  AuthSecurityError,
  parseSessionCookieHeader,
  serializeSessionCookie,
  serializeClearSessionCookie
} from './authService';
import { UserRole } from '../types';

/**
 * VidyutFlow Minimal Server Authentication HTTP API (Step 5B.2)
 *
 * Endpoints:
 * - POST /api/auth/login   (Authenticates user, issues HttpOnly session cookie)
 * - POST /api/auth/signup  (Registers Consumer account, issues HttpOnly session cookie)
 * - POST /api/auth/logout  (Revokes active server session, clears HttpOnly cookie)
 * - GET  /api/auth/me      (Verifies active HttpOnly session cookie, returns identity & role)
 *
 * Security controls:
 * - Passwords verified via Node.js `crypto.scrypt` + `crypto.timingSafeEqual`.
 * - Session tokens transmitted exclusively via `HttpOnly; SameSite=Lax` cookies
 *   (and `Secure` when served over HTTPS or in production) — never exposed in JSON responses.
 * - CSRF protection enforced on all state-changing POST endpoints via custom header
 *   (`X-VidyutFlow-CSRF: 1` or `X-Requested-With: VidyutFlow-ERP`) + Origin/Host check.
 * - Sliding-window rate limiting on login/signup attempts per IP (`429 Too Many Requests`).
 */

export const CSRF_HEADER_NAME = 'x-vidyutflow-csrf';
export const LOGIN_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds
export const MAX_AUTH_ATTEMPTS_PER_WINDOW = 10; // Max 10 login/signup attempts per minute per IP

const authRateLimitMap = new Map<string, number[]>();

export function resetAuthRateLimitForTests(): void {
  authRateLimitMap.clear();
}

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'local-client';
}

function isHttpsRequest(req: IncomingMessage): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  const proto = req.headers['x-forwarded-proto'];
  if (typeof proto === 'string' && proto.split(',')[0].trim().toLowerCase() === 'https') {
    return true;
  }
  return false;
}

function verifyCsrfProtection(req: IncomingMessage): { valid: boolean; code?: string; message?: string } {
  const csrfHeader = req.headers[CSRF_HEADER_NAME];
  const requestedWith = req.headers['x-requested-with'];

  const hasValidHeader =
    csrfHeader === '1' ||
    csrfHeader === 'true' ||
    requestedWith === 'VidyutFlow-ERP' ||
    requestedWith === 'XMLHttpRequest';

  if (!hasValidHeader) {
    return {
      valid: false,
      code: 'CSRF_HEADER_MISSING',
      message: 'CSRF validation failed: Missing required X-VidyutFlow-CSRF security header.'
    };
  }

  // If Origin header is present, verify it matches Host / X-Forwarded-Host
  const originHeader = req.headers.origin;
  if (typeof originHeader === 'string' && originHeader.trim()) {
    try {
      const originUrl = new URL(originHeader);
      const allowedHostRaw =
        (req.headers['x-forwarded-host'] as string) ||
        req.headers.host ||
        '';
      const allowedHostname = allowedHostRaw.split(',')[0].trim().split(':')[0].toLowerCase();
      const originHostname = originUrl.hostname.toLowerCase();

      const isLocal =
        (originHostname === 'localhost' || originHostname === '127.0.0.1') &&
        (!allowedHostname || allowedHostname === 'localhost' || allowedHostname === '127.0.0.1');

      if (!isLocal && allowedHostname && originHostname !== allowedHostname) {
        return {
          valid: false,
          code: 'CSRF_ORIGIN_MISMATCH',
          message: 'CSRF validation failed: Cross-origin state-changing request rejected.'
        };
      }
    } catch {
      return {
        valid: false,
        code: 'CSRF_ORIGIN_INVALID',
        message: 'CSRF validation failed: Malformed Origin header.'
      };
    }
  }

  return { valid: true };
}

function checkAndRecordAuthRateLimit(clientIp: string, nowMs: number): boolean {
  const recent = (authRateLimitMap.get(clientIp) || []).filter(
    t => nowMs - t < LOGIN_RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= MAX_AUTH_ATTEMPTS_PER_WINDOW) {
    authRateLimitMap.set(clientIp, recent);
    return false;
  }
  recent.push(nowMs);
  authRateLimitMap.set(clientIp, recent);
  return true;
}

function readJsonBody(req: IncomingMessage, maxBytes = 16384): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    let tooLarge = false;

    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > maxBytes) {
        tooLarge = true;
      }
    });

    req.on('error', err => reject(err));

    req.on('end', () => {
      if (tooLarge) {
        reject(new AuthSecurityError(400, 'PAYLOAD_TOO_LARGE', 'Request payload exceeds maximum size.'));
        return;
      }
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new AuthSecurityError(400, 'INVALID_JSON', 'Request body must be a JSON object.'));
          return;
        }
        resolve(parsed as Record<string, unknown>);
      } catch {
        reject(new AuthSecurityError(400, 'INVALID_JSON', 'Malformed JSON payload.'));
      }
    });
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: Record<string, unknown>): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.end(JSON.stringify(payload));
}

export interface AuthApiHandlerOptions {
  authService?: ServerAuthService;
  nowMsProvider?: () => number;
}

let _defaultServerAuthService: ServerAuthService | null = null;

export function getDefaultServerAuthService(): ServerAuthService {
  if (!_defaultServerAuthService) {
    _defaultServerAuthService = new ServerAuthService();
  }
  return _defaultServerAuthService;
}

export const defaultServerAuthService: ServerAuthService = new Proxy({} as ServerAuthService, {
  get(_target, prop, receiver) {
    return Reflect.get(getDefaultServerAuthService(), prop, receiver);
  }
});

export function createAuthApiHandler(options: AuthApiHandlerOptions = {}) {
  const authService = options.authService || getDefaultServerAuthService();
  const getNowMs = options.nowMsProvider || (() => Date.now());

  return async function authApiMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next?: () => void
  ): Promise<void> {
    const rawUrl = req.url || '/';
    const pathname = rawUrl.split('?')[0].replace(/^\/api\/auth/, '') || '/';
    const method = (req.method || 'GET').toUpperCase();
    const isSecureCookie = isHttpsRequest(req);
    const nowMs = getNowMs();

    // -----------------------------------------------------------------------
    // 1. GET /api/auth/me — Verify current HttpOnly session cookie
    // -----------------------------------------------------------------------
    if (pathname === '/me' || pathname === '/me/') {
      if (method !== 'GET') {
        sendJson(res, 405, { error: 'Method not allowed. Use GET.', code: 'METHOD_NOT_ALLOWED' });
        return;
      }

      const signedToken = parseSessionCookieHeader(req.headers.cookie);
      try {
        const session = authService.validateSession(signedToken, nowMs);
        sendJson(res, 200, {
          authenticated: true,
          user: session.user,
          role: session.role,
          loginTime: new Date(session.createdAt).toISOString(),
          expiresAt: session.expiresAt
        });
      } catch (err) {
        res.setHeader(
          'Set-Cookie',
          serializeClearSessionCookie({ isProduction: isSecureCookie })
        );
        if (err instanceof AuthSecurityError) {
          sendJson(res, err.statusCode, {
            authenticated: false,
            error: err.message,
            code: err.code
          });
          return;
        }
        sendJson(res, 401, {
          authenticated: false,
          error: 'Invalid or expired authentication session.',
          code: 'UNAUTHENTICATED'
        });
      }
      return;
    }

    // -----------------------------------------------------------------------
    // 2. POST /api/auth/login — Authenticate & issue HttpOnly session cookie
    // -----------------------------------------------------------------------
    if (pathname === '/login' || pathname === '/login/') {
      if (method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' });
        return;
      }

      const csrf = verifyCsrfProtection(req);
      if (!csrf.valid) {
        sendJson(res, 403, { error: csrf.message, code: csrf.code });
        return;
      }

      const clientIp = getClientIp(req);
      if (!checkAndRecordAuthRateLimit(clientIp, nowMs)) {
        res.setHeader('Retry-After', '60');
        sendJson(res, 429, {
          authenticated: false,
          error: 'Too many authentication attempts. Please wait a minute before trying again.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
        return;
      }

      try {
        const body = await readJsonBody(req);
        const email = typeof body.email === 'string' ? body.email : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const targetRole =
          typeof body.targetRole === 'string' ? (body.targetRole as UserRole) : undefined;

        const { user, session } = authService.login({
          email,
          password,
          targetRole,
          nowMs
        });

        const cookieHeader = serializeSessionCookie(session.signedToken, {
          maxAgeMs: session.expiresAt - session.createdAt,
          isProduction: isSecureCookie,
          sameSite: 'Lax'
        });
        res.setHeader('Set-Cookie', cookieHeader);

        // Never include sessionToken / signedToken / passwordHash in response JSON
        sendJson(res, 200, {
          authenticated: true,
          user,
          role: session.role,
          loginTime: new Date(session.createdAt).toISOString(),
          expiresAt: session.expiresAt
        });
      } catch (err) {
        if (err instanceof AuthSecurityError) {
          sendJson(res, err.statusCode, {
            authenticated: false,
            error: err.message,
            code: err.code
          });
          return;
        }
        sendJson(res, 500, {
          authenticated: false,
          error: 'An unexpected authentication error occurred.',
          code: 'INTERNAL_AUTH_ERROR'
        });
      }
      return;
    }

    // -----------------------------------------------------------------------
    // 3. POST /api/auth/signup — Register Consumer & issue HttpOnly cookie
    // -----------------------------------------------------------------------
    if (pathname === '/signup' || pathname === '/signup/') {
      if (method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' });
        return;
      }

      const csrf = verifyCsrfProtection(req);
      if (!csrf.valid) {
        sendJson(res, 403, { error: csrf.message, code: csrf.code });
        return;
      }

      const clientIp = getClientIp(req);
      if (!checkAndRecordAuthRateLimit(clientIp, nowMs)) {
        res.setHeader('Retry-After', '60');
        sendJson(res, 429, {
          authenticated: false,
          error: 'Too many registration attempts. Please wait a minute before trying again.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
        return;
      }

      try {
        const body = await readJsonBody(req);
        const name = typeof body.name === 'string' ? body.name : '';
        const email = typeof body.email === 'string' ? body.email : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const mobileNumber =
          typeof body.mobileNumber === 'string' ? body.mobileNumber : undefined;
        const requestedRole =
          typeof body.requestedRole === 'string' ? body.requestedRole : undefined;

        const { user, session } = authService.registerConsumer({
          name,
          email,
          password,
          mobileNumber,
          requestedRole
        });

        const cookieHeader = serializeSessionCookie(session.signedToken, {
          maxAgeMs: session.expiresAt - session.createdAt,
          isProduction: isSecureCookie,
          sameSite: 'Lax'
        });
        res.setHeader('Set-Cookie', cookieHeader);

        sendJson(res, 200, {
          authenticated: true,
          user,
          role: session.role,
          loginTime: new Date(session.createdAt).toISOString(),
          expiresAt: session.expiresAt
        });
      } catch (err) {
        if (err instanceof AuthSecurityError) {
          sendJson(res, err.statusCode, {
            authenticated: false,
            error: err.message,
            code: err.code
          });
          return;
        }
        sendJson(res, 500, {
          authenticated: false,
          error: 'An unexpected registration error occurred.',
          code: 'INTERNAL_SIGNUP_ERROR'
        });
      }
      return;
    }

    // -----------------------------------------------------------------------
    // 4. POST /api/auth/logout — Revoke server session & clear HttpOnly cookie
    // -----------------------------------------------------------------------
    if (pathname === '/logout' || pathname === '/logout/') {
      if (method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' });
        return;
      }

      const csrf = verifyCsrfProtection(req);
      if (!csrf.valid) {
        sendJson(res, 403, { error: csrf.message, code: csrf.code });
        return;
      }

      const signedToken = parseSessionCookieHeader(req.headers.cookie);
      const { revoked } = authService.revokeSession(signedToken);
      res.setHeader(
        'Set-Cookie',
        serializeClearSessionCookie({ isProduction: isSecureCookie })
      );

      sendJson(res, 200, {
        authenticated: false,
        loggedOut: true,
        revoked
      });
      return;
    }

    if (next) {
      next();
      return;
    }

    sendJson(res, 404, { error: 'Authentication endpoint not found.', code: 'NOT_FOUND' });
  };
}
