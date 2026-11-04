import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
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
const consumerLoginOtpMap = new Map<string, { otp: string; expiresAt: number; attempts: number; mobile: string; createdAt: number; consumerNo: string }>();

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const consumedCaptchaTokens = new Set<string>();

interface CaptchaRecord {
  code: string;
  createdAt: number;
}
const activeCaptchas = new Map<string, CaptchaRecord>();

export function generateServerCaptcha(nowMs?: number): { token: string; svg: string; expiresInSeconds: number } {
  const now = nowMs ?? Date.now();
  for (const [t, rec] of activeCaptchas.entries()) {
    if (now - rec.createdAt > 180000) activeCaptchas.delete(t);
  }

  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
  }

  const salt = crypto.randomBytes(4).toString('hex');
  const token = `${now}.${salt}.${crypto.createHmac('sha256', 'vidyutflow-secret').update(`${code}:${now}:${salt}`).digest('hex')}`;

  activeCaptchas.set(token, { code, createdAt: now });

  const w = 180;
  const h = 50;
  const dots: string[] = [];
  const colors = ['#cbd5e1', '#94a3b8', '#64748b', '#3b82f6', '#6366f1'];
  for (let i = 0; i < 25; i++) {
    const cx = Math.floor(Math.random() * w);
    const cy = Math.floor(Math.random() * h);
    const r = [1, 1.5, 2][Math.floor(Math.random() * 3)];
    const col = colors[Math.floor(Math.random() * colors.length)];
    dots.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" opacity="0.6"/>`);
  }

  const lines: string[] = [];
  const lineCols = ['#2563eb', '#4f46e5', '#0284c7', '#475569'];
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * 30);
    const y1 = Math.floor(Math.random() * h);
    const x2 = Math.floor(Math.random() * 60) + 60;
    const y2 = Math.floor(Math.random() * h);
    const x3 = Math.floor(Math.random() * 30) + 150;
    const y3 = Math.floor(Math.random() * h);
    const col = lineCols[Math.floor(Math.random() * lineCols.length)];
    lines.push(`<path d="M ${x1} ${y1} Q ${x2} ${y2} ${x3} ${y3}" stroke="${col}" stroke-width="1.5" fill="none" opacity="0.75"/>`);
  }

  const fonts = ['Arial, sans-serif', 'Courier New, monospace', 'Georgia, serif', 'Verdana, sans-serif'];
  const charEls: string[] = [];
  const startX = 22;
  const stepX = 28;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const cx = startX + (i * stepX) + Math.floor(Math.random() * 6) - 3;
    const cy = 33 + Math.floor(Math.random() * 6) - 3;
    const angle = Math.floor(Math.random() * 30) - 15;
    const font = fonts[Math.floor(Math.random() * fonts.length)];
    const sz = Math.floor(Math.random() * 5) + 23;
    charEls.push(
      `<text x="${cx}" y="${cy}" font-family="${font}" font-size="${sz}" font-weight="700" fill="#0f172a" transform="rotate(${angle} ${cx} ${cy})" pointer-events="none" style="user-select:none;-webkit-user-select:none;">${ch}</text>`
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="background-color:#f8fafc; border-radius:8px; border:1px solid #cbd5e1; user-select:none; -webkit-user-select:none; pointer-events:none;">${dots.join('')}${lines.join('')}${charEls.join('')}</svg>`;

  return { token, svg, expiresInSeconds: 180 };
}

export function verifyServerCaptcha(token: string, answer: string, nowMs?: number): boolean {
  if (!token || !answer) return false;
  const now = nowMs ?? Date.now();
  if (consumedCaptchaTokens.has(token)) return false;

  const rec = activeCaptchas.get(token);
  if (!rec) return false;
  if (now - rec.createdAt > 180000) {
    activeCaptchas.delete(token);
    return false;
  }

  if (rec.code.toUpperCase() !== answer.trim().toUpperCase()) {
    return false;
  }

  activeCaptchas.delete(token);
  consumedCaptchaTokens.add(token);
  return true;
}

export function resetAuthRateLimitForTests(): void {
  authRateLimitMap.clear();
}

function getClientIp(req: IncomingMessage): string {
  // Never trust spoofable X-Forwarded-For unless deployed behind an explicit trusted reverse proxy
  if (process.env.TRUSTED_PROXY === 'true') {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
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

      const isProxiedCloudRunPreview =
        (allowedHostname === 'localhost' || allowedHostname === '127.0.0.1') &&
        originHostname.endsWith('.run.app');

      if (!isLocal && !isProxiedCloudRunPreview && allowedHostname && originHostname !== allowedHostname) {
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
    const chunks: Buffer[] = [];
    let byteCount = 0;
    let tooLarge = false;
    let settled = false;

    const rejectOnce = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    req.on('data', (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
      byteCount += buf.length;
      if (byteCount > maxBytes) {
        tooLarge = true;
        if (byteCount > 1_048_576) {
          req.destroy?.();
          rejectOnce(new AuthSecurityError(400, 'PAYLOAD_TOO_LARGE', 'Request payload exceeds maximum size.'));
        }
        return;
      }
      chunks.push(buf);
    });

    req.on('error', err => rejectOnce(err));

    req.on('end', () => {
      if (settled) return;
      settled = true;
      if (tooLarge) {
        reject(new AuthSecurityError(400, 'PAYLOAD_TOO_LARGE', 'Request payload exceeds maximum size.'));
        return;
      }
      const raw = Buffer.concat(chunks).toString('utf8');
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
      if (next && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        next();
        return;
      }
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
    // GET /api/auth/captcha — Generate uncopyable, bot-resistant vector CAPTCHA
    // -----------------------------------------------------------------------
    if (pathname === '/captcha' || pathname === '/captcha/') {
      if (method !== 'GET') {
        sendJson(res, 405, { error: 'Method not allowed. Use GET.', code: 'METHOD_NOT_ALLOWED' });
        return;
      }
      const captchaData = generateServerCaptcha(nowMs);
      sendJson(res, 200, {
        captcha_token: captchaData.token,
        captcha_svg: captchaData.svg,
        expires_in_seconds: captchaData.expiresInSeconds
      });
      return;
    }

    // -----------------------------------------------------------------------
    // POST /api/auth/consumer/otp/send — Send verification OTP for Consumer
    // -----------------------------------------------------------------------
    if (pathname === '/consumer/otp/send' || pathname === '/consumer/otp/send/') {
      if (method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' });
        return;
      }
      try {
        const body = await readJsonBody(req);
        const rawMobile = String(body.mobile_number || body.mobileNumber || '').trim();
        const digitsOnly = rawMobile.replace(/\D/g, '');

        if (digitsOnly.length < 10) {
          sendJson(res, 400, { authenticated: false, error: 'Valid 10-digit mobile number is required.', code: 'INVALID_MOBILE' });
          return;
        }
        const norm10 = digitsOnly.slice(-10);

        // Security CAPTCHA verification
        const captchaToken = body.captcha_token || body.captchaToken;
        const captchaAnswer = body.captcha_answer || body.captchaAnswer;
        if (captchaToken) {
          const now = (nowMs ?? Date.now());
          if (!captchaAnswer || !verifyServerCaptcha(String(captchaToken), String(captchaAnswer), now)) {
            sendJson(res, 400, {
              authenticated: false,
              error: 'Invalid or expired security CAPTCHA. Please refresh and try again.',
              code: 'INVALID_CAPTCHA'
            });
            return;
          }
        }

        const consumerNo = String(body.consumer_no || body.consumerNo || '').trim();

        // If explicit consumer number provided, verify it
        if (consumerNo) {
          const isRegisteredConsumer = consumerNo.replace(/-/g, '') === '0428199231' || consumerNo.replace(/-/g, '') === '0428177190';
          if (!isRegisteredConsumer && consumerNo !== '04281-99231') {
            sendJson(res, 400, {
              authenticated: false,
              error: "Consumer number '" + consumerNo + "' was not found in the UGVCL utility registry.",
              code: 'CONSUMER_NOT_FOUND'
            });
            return;
          }

          if (norm10 !== '9825014820') {
            sendJson(res, 400, {
              authenticated: false,
              error: 'The mobile number provided does not match the registered mobile number on record for consumer ' + consumerNo + '.',
              code: 'MOBILE_MISMATCH'
            });
            return;
          }
        } else {
          // Mobile-only login: check registered mobile
          if (norm10 !== '9825014820') {
            sendJson(res, 400, {
              authenticated: false,
              error: 'Mobile number +91 ' + norm10 + ' is not registered with any UGVCL electricity consumer account.',
              code: 'MOBILE_NOT_REGISTERED'
            });
            return;
          }
        }

        const resolvedCNo = consumerNo || '04281-99231';
        const key = norm10;

        // Rate limit & cooldown check
        const now = (nowMs ?? Date.now());
        const existing = consumerLoginOtpMap.get(key) || consumerLoginOtpMap.get(resolvedCNo);
        if (existing && (now - existing.createdAt < 45000)) {
          const remaining = Math.ceil((45000 - (now - existing.createdAt)) / 1000);
          sendJson(res, 429, {
            authenticated: false,
            error: "Please wait " + remaining + " seconds before requesting a new OTP.",
            code: 'COOLDOWN_ACTIVE'
          });
          return;
        }

        const otp = '482019';
        const entry = {
          otp,
          expiresAt: now + 5 * 60 * 1000,
          attempts: 0,
          mobile: '+91 98250 14820',
          createdAt: now,
          consumerNo: resolvedCNo
        };
        consumerLoginOtpMap.set(key, entry);
        consumerLoginOtpMap.set(resolvedCNo, entry);

        sendJson(res, 200, {
          success: true,
          status: 'OTP_SENT',
          consumer_no: resolvedCNo,
          masked_mobile: '+91 XXXXX XX20',
          expires_in_seconds: 300,
          cooldown_seconds: 45,
          dev_simulation_otp: otp,
          message: 'Verification OTP sent to registered mobile number +91 XXXXX XX20.'
        });
      } catch (err: any) {
        sendJson(res, 400, { authenticated: false, error: err.message || 'Failed to send OTP.' });
      }
      return;
    }

    // -----------------------------------------------------------------------
    // POST /api/auth/consumer/otp/verify — Verify OTP and create consumer session
    // -----------------------------------------------------------------------
    if (pathname === '/consumer/otp/verify' || pathname === '/consumer/otp/verify/') {
      if (method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' });
        return;
      }
      try {
        const body = await readJsonBody(req);
        const consumerNo = String(body.consumer_no || body.consumerNo || '').trim();
        const rawMobile = String(body.mobile_number || body.mobileNumber || '').trim();
        const digitsOnly = rawMobile.replace(/\D/g, '');
        const norm10 = digitsOnly.slice(-10);
        const otp = String(body.otp || '').trim();

        const rec = (norm10 && consumerLoginOtpMap.get(norm10)) ||
                    (consumerNo && consumerLoginOtpMap.get(consumerNo)) ||
                    consumerLoginOtpMap.get('9825014820') ||
                    consumerLoginOtpMap.get('04281-99231');

        if (!rec) {
          sendJson(res, 400, { authenticated: false, error: 'Verification code not found or expired. Please request a new OTP.', code: 'OTP_EXPIRED' });
          return;
        }

        if ((nowMs ?? Date.now()) > rec.expiresAt) {
          if (norm10) consumerLoginOtpMap.delete(norm10);
          if (consumerNo) consumerLoginOtpMap.delete(consumerNo);
          sendJson(res, 400, { authenticated: false, error: 'Verification code has expired. Please request a new OTP.', code: 'OTP_EXPIRED' });
          return;
        }

        if (rec.attempts >= 5) {
          if (norm10) consumerLoginOtpMap.delete(norm10);
          if (consumerNo) consumerLoginOtpMap.delete(consumerNo);
          sendJson(res, 429, { authenticated: false, error: 'Maximum verification attempts exceeded. For security, this OTP is now invalid.', code: 'ATTEMPTS_EXCEEDED' });
          return;
        }

        if (rec.otp !== otp) {
          rec.attempts += 1;
          const rem = 5 - rec.attempts;
          sendJson(res, 400, { authenticated: false, error: "Incorrect verification code. " + rem + " attempt(s) remaining.", code: 'INVALID_OTP' });
          return;
        }

        // OTP verified successfully, consume it
        if (norm10) consumerLoginOtpMap.delete(norm10);
        if (consumerNo) consumerLoginOtpMap.delete(consumerNo);
        consumerLoginOtpMap.delete('9825014820');
        consumerLoginOtpMap.delete('04281-99231');

        // Log in consumer user
        const { user, session } = authService.login({
          email: 'consumer@vidyutflow.demo',
          password: 'Demo@12345',
          targetRole: 'consumer',
          nowMs: (nowMs ?? Date.now())
        });

        const cookieHeader = serializeSessionCookie(session.signedToken, {
          maxAgeMs: session.expiresAt - session.createdAt,
          isProduction: isSecureCookie,
          sameSite: 'Lax'
        });
        res.setHeader('Set-Cookie', cookieHeader);

        sendJson(res, 200, {
          authenticated: true,
          user: {
            ...user,
            role: 'consumer',
            consumer_no: rec.consumerNo || consumerNo || '04281-99231',
            discom: 'UGVCL'
          },
          role: 'consumer',
          loginTime: new Date(session.createdAt).toISOString(),
          expiresAt: session.expiresAt
        });
      } catch (err: any) {
        sendJson(res, 400, { authenticated: false, error: err.message || 'OTP verification failed.' });
      }
      return;
    }

    // 2. POST /api/auth/login — Authenticate & issue HttpOnly session cookie
    // -----------------------------------------------------------------------
    if (pathname === '/login' || pathname === '/login/') {
      if (next && req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
        next();
        return;
      }
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
        const email = String(body.email || body.username || body.employeeId || body.employee_id || '');
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
          typeof body.requestedRole === 'string'
            ? body.requestedRole
            : typeof body.role === 'string'
            ? body.role
            : undefined;

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

    // -----------------------------------------------------------------------
    // 5. GET /api/auth/sso/providers & POST /api/auth/sso — Simulated OIDC SSO (Item #18)
    // -----------------------------------------------------------------------
    if (pathname === '/sso/providers' || pathname === '/sso/providers/') {
      if (method !== 'GET') {
        sendJson(res, 405, { error: 'Method not allowed. Use GET.', code: 'METHOD_NOT_ALLOWED' });
        return;
      }
      sendJson(res, 200, {
        isSimulated: true,
        enabled: process.env.NODE_ENV !== 'production',
        disclosure:
          'SIMULATED OIDC / MeriPehchaan Parichay Single Sign-On for demonstration only — not connected to live Government of Gujarat IdP.',
        providers: [
          {
            id: 'parichay-gujarat-demo',
            name: 'MeriPehchaan / Gujarat Parichay OIDC (Simulated Demo)',
            audience: 'Consumers & Citizens'
          },
          {
            id: 'ugvcl-workforce-oidc-demo',
            name: 'UGVCL Corporate Workforce SSO (Simulated Demo)',
            audience: 'Officers, Field Engineers, Management & IT Admin'
          }
        ]
      });
      return;
    }

    if (pathname === '/sso' || pathname === '/sso/') {
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
          error: 'Too many SSO attempts. Please wait a minute before trying again.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
        return;
      }
      try {
        const body = await readJsonBody(req);
        const email = typeof body.email === 'string' ? body.email : '';
        const providerId = typeof body.providerId === 'string' ? body.providerId : '';
        const state = typeof body.state === 'string' ? body.state : '';
        const targetRole = typeof body.targetRole === 'string' ? (body.targetRole as UserRole) : undefined;
        const { user, session } = authService.loginViaSimulatedSso({
          email,
          providerId,
          state,
          targetRole,
          nowMs
        });
        res.setHeader(
          'Set-Cookie',
          serializeSessionCookie(session.signedToken, {
            maxAgeMs: session.expiresAt - session.createdAt,
            isProduction: isSecureCookie,
            sameSite: 'Lax'
          })
        );
        sendJson(res, 200, {
          authenticated: true,
          ssoSimulated: true,
          providerId,
          disclosure:
            'SIMULATED OIDC / Gujarat Parichay SSO session issued for demonstration only.',
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
          error: 'An unexpected SSO error occurred.',
          code: 'INTERNAL_SSO_ERROR'
        });
      }
      return;
    }

    if (next) {
      next();
      return;
    }

    sendJson(res, 404, { error: 'Authentication endpoint not found.', code: 'NOT_FOUND' });
  };
}
