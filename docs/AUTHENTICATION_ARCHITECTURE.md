# VidyutFlow – Unified Authentication Architecture

**Document Version:** 1.0.0  
**Authority:** Principal Software Architect & Cybersecurity Lead  
**Classification:** Enterprise Government Utility Standard (UGVCL / GUVNL)

---

## 1. Executive Architecture Summary

VidyutFlow enforces a **single source of truth** for authentication, role-based authorization, and session lifecycle management. The FastAPI backend serves as the authoritative identity store, while the Node.js/Vite edge middleware acts as a high-performance, cookie-forwarding proxy.

```
[Browser / Mobile Client]
         │
         │  1. POST /api/auth/signup
         │     (Credentials + CSRF Header)
         ▼
[Node.js Edge / Vite Middleware]
         │
         │  2. Reverse-Proxy / Fast Forward
         │     (with Client IP & Diagnostics)
         ▼
[FastAPI Authoritative Backend] ───► [PostgreSQL User Table]
         │                                (Argon2id Hash + Salt)
         │  3. Issues JWT + HttpOnly Session
         ▼
[Response to Client]
  - HttpOnly; SameSite=Lax; Secure Cookie
  - Diagnostic Reference: REG-XXXX-XXXX
  - 201 Created (or structured error payload)
```

---

## 2. Centralized Identity Authority (FastAPI)

### Endpoints Specification

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register new consumer account (Argon2id hashing) | No |
| `POST` | `/auth/token` | Authenticate with credentials, issue access & refresh tokens | No |
| `POST` | `/auth/refresh` | Rotate access token using valid refresh token | Refresh Token |
| `GET` | `/auth/me` | Return active user identity, role, and zone permissions | Bearer / Cookie |
| `POST` | `/auth/logout` | Revoke active user session in database and clear cookies | Session |

### Backward Compatibility
Both `/auth/register` and `/api/auth/signup` are mounted in FastAPI to ensure seamless operation across reverse-proxies, CLI clients, and single-page application entry points without breaking existing integrations.

---

## 3. Session & Token Architecture

1. **Password Hashing:**
   - Evaluated via `Argon2id` (RFC 9106) with memory cost 64 MiB, 3 iterations, and 4 parallel threads.
   - Salt generation: 16 cryptographically secure random bytes per user (`os.urandom(16)`).

2. **Access Token (JWT):**
   - Algorithm: `HS256` (minimum 32-character secret enforced in production).
   - Validity: 15 minutes (`access_token_minutes = 15`).
   - Claims: `sub` (user_id), `role`, `zone`, `iss` (`vidyutflow-api`), `aud` (`vidyutflow-client`), `exp`.

3. **Refresh Token & UserSession:**
   - Stored in `user_sessions` table with SHA-256 token hash.
   - Validity: 7 days (`refresh_token_days = 7`).
   - Automatic revocation upon password change or explicit logout.

4. **Cookie Security:**
   - `HttpOnly`: Prevents client-side JavaScript access and XSS theft.
   - `SameSite=Lax`: Defends against Cross-Site Request Forgery (CSRF).
   - `Secure`: Mandatory in production and over HTTPS.

---

## 4. Distributed Rate Limiting & Fail-Closed Behavior

The distributed rate limiting layer (`backend/app/login_limit.py`) coordinates across multi-instance clusters:

- **Storage Engine:** Redis atomic operations (`pipeline.incr` + `expire`).
- **Sliding Window:**
  - IP Limit: Maximum 20 attempts per 60-second window.
  - Account Limit: Maximum 5 failed attempts per 300 seconds (temporary lockout).
- **Trusted Proxy Resolution:**
  - Honors `X-Forwarded-For` exclusively when `TRUSTED_PROXY=true` is set.
  - Rejects spoofed client headers in direct edge configurations.
- **Fail-Closed Security Guarantee:**
  - When `APP_ENV=production`, if Redis is unreachable, the system raises `HTTP 503 Service Unavailable` with `BACKEND_UNAVAILABLE` rather than failing open to prevent brute-force exploitation.
  - In development mode, falls back gracefully to a thread-safe in-memory sliding window.

---

## 5. Structured Signup Error Diagnostics

Frontend clients calling `/api/auth/signup` receive structured, deterministic responses:

```json
{
  "authenticated": false,
  "error": "An account with this email address already exists. Please sign in or reset your password.",
  "code": "ACCOUNT_EXISTS",
  "status": 409,
  "supportReferenceId": "REG-4A9F-B28C",
  "retryable": false,
  "timestamp": "2026-11-03T15:35:00.000Z"
}
```

### Diagnostics Error Code Taxonomy
- `CONNECTION_REFUSED` (503): Backend daemon is offline or port unreachable.
- `REQUEST_TIMEOUT` (408): Upstream took longer than 15,000ms.
- `ACCOUNT_EXISTS` (409): Duplicate email or mobile registration attempt.
- `VALIDATION_FAILED` (422): Schema violation (e.g. invalid phone format, weak password).
- `RATE_LIMIT_EXCEEDED` (429): Exceeded maximum registration burst threshold.
- `SERVER_ERROR` (500): Unhandled exception; support reference ID logged for tracing.

