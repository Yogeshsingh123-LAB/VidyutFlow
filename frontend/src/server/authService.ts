import * as crypto from 'crypto';
import { UserRole } from '../types';
import { DEFAULT_DEMO_ACCOUNTS, CANONICAL_DEMO_IDENTITIES } from '../data/demoAuthData';

/**
 * VidyutFlow Server-Side Authentication & RBAC Foundation (Step 5B.1)
 *
 * Security guarantees:
 * - Passwords hashed exclusively on the server using Node.js `crypto.scryptSync`
 *   with a unique 16-byte cryptographic salt per user.
 * - Constant-time verification via `crypto.timingSafeEqual`.
 * - Cryptographically random 256-bit session IDs (`crypto.randomBytes(32)`) signed
 *   with HMAC-SHA256 using a runtime/env secret (never hardcoded for production).
 * - Configurable session TTL (8 hours by default) with immediate logout revocation.
 * - Strict `HttpOnly`, `SameSite=Lax`, and production `Secure` cookie serialization.
 * - Password hashes and signing secrets are never returned in public session/user objects.
 */

export const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours default
export const SESSION_COOKIE_NAME = 'vidyutflow_sid';

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // N = 2^14
const SCRYPT_BLOCK_SIZE = 8; // r
const SCRYPT_PARALLELIZATION = 1; // p

const VALID_ROLES: readonly UserRole[] = [
  'consumer',
  'employee',
  'field',
  'management',
  'admin'
];

export class AuthSecurityError extends Error {
  public readonly statusCode: 400 | 401 | 403;
  public readonly code: string;

  constructor(statusCode: 400 | 401 | 403, code: string, message: string) {
    super(message);
    this.name = 'AuthSecurityError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface ServerUserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  designation: string;
  department: string;
  division: string;
  mobileNumber?: string;
  isDemoAccount: boolean;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}

export interface PublicUserIdentity {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  designation: string;
  department: string;
  division: string;
  mobileNumber?: string;
  isDemoAccount: boolean;
}

export interface ServerSessionRecord {
  sessionId: string;
  signedToken: string;
  userId: string;
  role: UserRole;
  user: PublicUserIdentity;
  createdAt: number;
  expiresAt: number;
  revoked: boolean;
}

export interface CookieOptions {
  maxAgeMs?: number;
  isProduction?: boolean;
  sameSite?: 'Strict' | 'Lax';
  path?: string;
}

/**
 * Generates a salted scrypt hash using a unique random 16-byte salt.
 */
export function hashPasswordScrypt(plainPassword: string, existingSaltHex?: string): {
  salt: string;
  hash: string;
} {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new AuthSecurityError(400, 'INVALID_PASSWORD', 'Password must be a non-empty string.');
  }
  const salt = existingSaltHex || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainPassword, Buffer.from(salt, 'hex'), SCRYPT_KEYLEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION
  });
  return {
    salt,
    hash: derivedKey.toString('hex')
  };
}

/**
 * Verifies a plaintext password against a stored salt + scrypt hash in constant time.
 */
export function verifyPasswordScrypt(
  plainPassword: string,
  storedSaltHex: string,
  storedHashHex: string
): boolean {
  if (!plainPassword || !storedSaltHex || !storedHashHex) {
    return false;
  }
  try {
    const candidateKey = crypto.scryptSync(
      plainPassword,
      Buffer.from(storedSaltHex, 'hex'),
      SCRYPT_KEYLEN,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION
      }
    );
    const storedKeyBuffer = Buffer.from(storedHashHex, 'hex');
    if (candidateKey.length !== storedKeyBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(candidateKey, storedKeyBuffer);
  } catch {
    return false;
  }
}

/**
 * Strips sensitive fields (`passwordHash`, `passwordSalt`) before returning user identity.
 */
export function toPublicUserIdentity(record: ServerUserRecord): PublicUserIdentity {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    designation: record.designation,
    department: record.department,
    division: record.division,
    ...(record.mobileNumber ? { mobileNumber: record.mobileNumber } : {}),
    isDemoAccount: record.isDemoAccount
  };
}

/**
 * Formats an HttpOnly, SameSite-protected session cookie header string.
 * In production (`isProduction: true` or `NODE_ENV === 'production'`), adds `Secure`.
 */
export function serializeSessionCookie(
  signedToken: string,
  options: CookieOptions = {}
): string {
  const maxAgeSeconds = Math.max(
    0,
    Math.floor((options.maxAgeMs ?? DEFAULT_SESSION_TTL_MS) / 1000)
  );
  const isProd = options.isProduction ?? process.env.NODE_ENV === 'production';
  const sameSite = options.sameSite ?? 'Lax';
  const cookiePath = options.path ?? '/';

  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
    `Path=${cookiePath}`,
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    `SameSite=${sameSite}`
  ];

  if (isProd) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

/**
 * Formats a cookie-clearing header for logout.
 */
export function serializeClearSessionCookie(options: CookieOptions = {}): string {
  return serializeSessionCookie('', { ...options, maxAgeMs: 0 });
}

/**
 * Parses the `vidyutflow_sid` token from a raw HTTP `Cookie` header.
 */
export function parseSessionCookieHeader(cookieHeader?: string | null): string | null {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const pairs = cookieHeader.split(';');
  for (const rawPair of pairs) {
    const idx = rawPair.indexOf('=');
    if (idx === -1) continue;
    const key = rawPair.slice(0, idx).trim();
    const val = rawPair.slice(idx + 1).trim();
    if (key === SESSION_COOKIE_NAME && val) {
      try {
        return decodeURIComponent(val);
      } catch {
        return val;
      }
    }
  }
  return null;
}

export class ServerAuthService {
  private readonly usersByEmail = new Map<string, ServerUserRecord>();
  private readonly usersById = new Map<string, ServerUserRecord>();
  private readonly sessions = new Map<string, ServerSessionRecord>();
  private readonly sessionSecret: Buffer;
  private readonly defaultSessionTtlMs: number;

  constructor(options?: { sessionSecret?: string; defaultSessionTtlMs?: number }) {
    // Use environment secret if configured; otherwise generate an ephemeral 256-bit cryptographic key
    const envSecret = options?.sessionSecret || process.env.SESSION_SECRET;
    if (process.env.NODE_ENV === 'production' && (!envSecret || envSecret.length < 32)) {
      throw new Error(
        'Production security violation: SESSION_SECRET environment variable (>= 32 chars) is required in production.'
      );
    }
    this.sessionSecret = envSecret
      ? Buffer.from(envSecret, 'utf8')
      : crypto.randomBytes(32);
    this.defaultSessionTtlMs = options?.defaultSessionTtlMs ?? DEFAULT_SESSION_TTL_MS;

    this.seedPreconfiguredDemoAccounts();
  }

  /**
   * Seeds the 5 official VidyutFlow demo accounts from `DEFAULT_DEMO_ACCOUNTS` (read-only)
   * AND all multi-engineer / multi-staff canonical accounts from `CANONICAL_DEMO_IDENTITIES`
   * using unique random per-user salts and `crypto.scrypt` hashes.
   */
  private seedPreconfiguredDemoAccounts(): void {
    for (const role of VALID_ROLES) {
      const demoAcc = DEFAULT_DEMO_ACCOUNTS[role];
      const { salt, hash } = hashPasswordScrypt(demoAcc.password);
      const userId = role === 'consumer' ? 'demo_consumer' : `demo_${role}`;

      const record: ServerUserRecord = {
        id: userId,
        email: demoAcc.email.toLowerCase(),
        name: demoAcc.name,
        role: demoAcc.role,
        designation: demoAcc.designation,
        department: demoAcc.department,
        division: demoAcc.division,
        isDemoAccount: true,
        passwordSalt: salt,
        passwordHash: hash,
        createdAt: '2026-10-01T00:00:00.000Z'
      };

      this.usersByEmail.set(record.email, record);
      this.usersById.set(record.id, record);
    }

    // Also seed all canonical directory accounts (including FLD-UG-201, FLD-UG-204, FLD-UG-209, etc.)
    for (const identity of CANONICAL_DEMO_IDENTITIES) {
      const normalizedEmail = identity.email.toLowerCase();
      if (!this.usersByEmail.has(normalizedEmail)) {
        const { salt, hash } = hashPasswordScrypt(identity.password);
        const canonicalRecord: ServerUserRecord = {
          id: identity.id,
          email: normalizedEmail,
          name: identity.name,
          role: identity.role,
          designation: identity.designation,
          department: identity.department,
          division: identity.subdivision,
          mobileNumber: identity.phone,
          isDemoAccount: true,
          passwordSalt: salt,
          passwordHash: hash,
          createdAt: '2026-10-01T00:00:00.000Z'
        };
        this.usersByEmail.set(normalizedEmail, canonicalRecord);
        this.usersById.set(canonicalRecord.id, canonicalRecord);
      } else {
        const existing = this.usersByEmail.get(normalizedEmail);
        if (existing && !this.usersById.has(identity.id)) {
          this.usersById.set(identity.id, existing);
        }
      }
    }
  }

  private signSessionId(sessionId: string): string {
    const mac = crypto
      .createHmac('sha256', this.sessionSecret)
      .update(sessionId)
      .digest('hex');
    return `${sessionId}.${mac}`;
  }

  private verifySignedToken(signedToken: string): string | null {
    if (!signedToken || typeof signedToken !== 'string') return null;
    const dotIndex = signedToken.indexOf('.');
    if (dotIndex <= 0 || dotIndex === signedToken.length - 1) return null;

    const sessionId = signedToken.slice(0, dotIndex);
    const providedMacHex = signedToken.slice(dotIndex + 1);

    const expectedMacHex = crypto
      .createHmac('sha256', this.sessionSecret)
      .update(sessionId)
      .digest('hex');

    try {
      const providedBuf = Buffer.from(providedMacHex, 'hex');
      const expectedBuf = Buffer.from(expectedMacHex, 'hex');
      if (providedBuf.length !== expectedBuf.length) return null;
      if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;
      return sessionId;
    } catch {
      return null;
    }
  }

  /**
   * Registers a new Consumer account with salted scrypt password hashing.
   * Internal staff roles (`employee`, `field`, `management`, `admin`) cannot be self-registered.
   */
  public registerConsumer(params: {
    name: string;
    email: string;
    password: string;
    mobileNumber?: string;
    requestedRole?: string;
  }): { user: PublicUserIdentity; session: ServerSessionRecord; cookieHeader: string } {
    if (params.requestedRole && params.requestedRole !== 'consumer') {
      throw new AuthSecurityError(
        403,
        'ROLE_ESCALATION_FORBIDDEN',
        'Public registration is restricted to Consumer accounts only.'
      );
    }

    const cleanName = (params.name || '').trim();
    const cleanEmail = (params.email || '').trim().toLowerCase();
    const password = params.password || '';

    if (!cleanName || !cleanEmail || !password) {
      throw new AuthSecurityError(400, 'MISSING_FIELDS', 'Name, email, and password are required.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new AuthSecurityError(400, 'INVALID_EMAIL', 'Please provide a valid email address.');
    }

    if (password.length < 6) {
      throw new AuthSecurityError(
        400,
        'WEAK_PASSWORD',
        'Password must be at least 6 characters long.'
      );
    }

    if (this.usersByEmail.has(cleanEmail)) {
      throw new AuthSecurityError(
        400,
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email address is already registered.'
      );
    }

    const { salt, hash } = hashPasswordScrypt(password);
    const newUserId = `usr_${crypto.randomBytes(8).toString('hex')}`;

    const newRecord: ServerUserRecord = {
      id: newUserId,
      email: cleanEmail,
      name: cleanName,
      role: 'consumer',
      designation: 'Registered Domestic Consumer',
      department: 'Consumer Self-Service Portal',
      division: 'UGVCL Consumer Services',
      mobileNumber: params.mobileNumber?.trim(),
      isDemoAccount: false,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString()
    };

    this.usersByEmail.set(cleanEmail, newRecord);
    this.usersById.set(newUserId, newRecord);

    const session = this.createSession(newRecord);
    const cookieHeader = serializeSessionCookie(session.signedToken, {
      maxAgeMs: this.defaultSessionTtlMs
    });

    return {
      user: toPublicUserIdentity(newRecord),
      session,
      cookieHeader
    };
  }

  /**
   * Authenticates a user by email and password, optionally enforcing that the user's
   * server-assigned role matches the target portal requested at login.
   */
  public login(params: {
    email: string;
    password: string;
    targetRole?: UserRole;
    ttlMs?: number;
    nowMs?: number;
  }): { user: PublicUserIdentity; session: ServerSessionRecord; cookieHeader: string } {
    const cleanEmail = (params.email || '').trim().toLowerCase();
    const password = params.password || '';

    if (!cleanEmail || !password) {
      throw new AuthSecurityError(400, 'MISSING_CREDENTIALS', 'Email and password are required.');
    }

    const userRecord = this.usersByEmail.get(cleanEmail);
    if (!userRecord) {
      throw new AuthSecurityError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const passwordValid = verifyPasswordScrypt(
      password,
      userRecord.passwordSalt,
      userRecord.passwordHash
    );
    if (!passwordValid) {
      throw new AuthSecurityError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    // Server enforces the account's actual stored role and rejects mismatched portal login attempts
    if (params.targetRole && userRecord.role !== params.targetRole) {
      throw new AuthSecurityError(
        403,
        'ROLE_MISMATCH',
        `Account ${userRecord.email} is authorized for the "${userRecord.role}" portal, not "${params.targetRole}".`
      );
    }

    const ttlMs = params.ttlMs ?? this.defaultSessionTtlMs;
    const session = this.createSession(userRecord, ttlMs, params.nowMs);
    const cookieHeader = serializeSessionCookie(session.signedToken, { maxAgeMs: ttlMs });

    return {
      user: toPublicUserIdentity(userRecord),
      session,
      cookieHeader
    };
  }

  private createSession(
    userRecord: ServerUserRecord,
    ttlMs: number = this.defaultSessionTtlMs,
    nowMs: number = Date.now()
  ): ServerSessionRecord {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const signedToken = this.signSessionId(sessionId);
    const publicUser = toPublicUserIdentity(userRecord);

    const session: ServerSessionRecord = {
      sessionId,
      signedToken,
      userId: userRecord.id,
      role: userRecord.role,
      user: publicUser,
      createdAt: nowMs,
      expiresAt: nowMs + ttlMs,
      revoked: false
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Validates a signed session token (from HttpOnly cookie or Authorization header).
   * Enforces HMAC signature integrity, revocation status, and expiration TTL.
   */
  public validateSession(
    signedToken?: string | null,
    nowMs: number = Date.now()
  ): ServerSessionRecord {
    if (!signedToken) {
      throw new AuthSecurityError(401, 'UNAUTHENTICATED', 'Authentication session token is required.');
    }

    const sessionId = this.verifySignedToken(signedToken);
    if (!sessionId) {
      throw new AuthSecurityError(401, 'INVALID_SESSION_SIGNATURE', 'Session token signature is invalid or tampered.');
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new AuthSecurityError(401, 'SESSION_NOT_FOUND', 'Session was not found or has been terminated.');
    }

    if (session.revoked) {
      throw new AuthSecurityError(401, 'SESSION_REVOKED', 'Session has been logged out and revoked.');
    }

    if (nowMs >= session.expiresAt) {
      this.sessions.delete(sessionId);
      throw new AuthSecurityError(401, 'SESSION_EXPIRED', 'Session has expired. Please sign in again.');
    }

    return session;
  }

  /**
   * Revokes an active session on logout so the token can never be reused.
   */
  public revokeSession(signedToken?: string | null): { revoked: boolean; clearCookieHeader: string } {
    const clearCookieHeader = serializeClearSessionCookie();
    if (!signedToken) {
      return { revoked: false, clearCookieHeader };
    }
    const sessionId = this.verifySignedToken(signedToken);
    if (!sessionId) {
      return { revoked: false, clearCookieHeader };
    }
    const existing = this.sessions.get(sessionId);
    if (!existing) {
      return { revoked: false, clearCookieHeader };
    }
    existing.revoked = true;
    this.sessions.delete(sessionId);
    return { revoked: true, clearCookieHeader };
  }

  /**
   * Inspects internal stored hash metadata for security auditing in tests without exposing it via public APIs.
   */
  public getStoredHashMetadataForAudit(email: string): {
    exists: boolean;
    saltLengthBytes: number;
    hashLengthBytes: number;
    saltHex: string;
    hashHex: string;
  } | null {
    const rec = this.usersByEmail.get(email.trim().toLowerCase());
    if (!rec) return null;
    return {
      exists: true,
      saltLengthBytes: Buffer.from(rec.passwordSalt, 'hex').length,
      hashLengthBytes: Buffer.from(rec.passwordHash, 'hex').length,
      saltHex: rec.passwordSalt,
      hashHex: rec.passwordHash
    };
  }
}

/**
 * Reusable RBAC Guard: Verifies session and enforces that the authenticated user's
 * server-assigned role is in `allowedRoles`. Never trusts client-supplied role parameters.
 */
export function requireServerRole(
  authService: ServerAuthService,
  signedToken: string | null | undefined,
  allowedRoles: readonly UserRole[],
  nowMs: number = Date.now()
): ServerSessionRecord {
  const session = authService.validateSession(signedToken, nowMs);
  if (!allowedRoles.includes(session.role)) {
    throw new AuthSecurityError(
      403,
      'FORBIDDEN_ROLE',
      `Role "${session.role}" is not authorized for this operation. Allowed roles: ${allowedRoles.join(', ')}.`
    );
  }
  return session;
}

/**
 * Reusable Consumer Ownership Guard:
 * - Internal staff roles specified in `allowedStaffRoles` (if any) are permitted.
 * - A `consumer` role is strictly restricted to records where `recordOwnerAccountId === session.userId`
 *   OR `recordConsumerNo` is in the consumer's verified linked connection numbers.
 */
export function assertConsumerRecordOwnership(params: {
  session: ServerSessionRecord;
  recordOwnerAccountId?: string | null;
  recordConsumerNo?: string | null;
  ownedConsumerNos: ReadonlySet<string>;
  allowedStaffRoles?: readonly UserRole[];
}): void {
  const {
    session,
    recordOwnerAccountId,
    recordConsumerNo,
    ownedConsumerNos,
    allowedStaffRoles = []
  } = params;

  if (session.role !== 'consumer') {
    if (allowedStaffRoles.includes(session.role)) {
      return;
    }
    throw new AuthSecurityError(
      403,
      'FORBIDDEN_ROLE',
      `Role "${session.role}" is not permitted to access this consumer resource.`
    );
  }

  const matchesAccountId = Boolean(
    recordOwnerAccountId && recordOwnerAccountId === session.userId
  );
  const matchesConsumerNo = Boolean(
    recordConsumerNo && ownedConsumerNos.has(recordConsumerNo)
  );

  if (!matchesAccountId && !matchesConsumerNo) {
    throw new AuthSecurityError(
      403,
      'CROSS_CONSUMER_ACCESS_DENIED',
      `Consumer "${session.user.email}" (${session.userId}) is not authorized to access records belonging to another consumer.`
    );
  }
}
