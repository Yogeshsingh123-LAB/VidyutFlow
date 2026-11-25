# VidyutFlow: Comprehensive Cybersecurity & Architecture Audit

**Audit Date:** 2026-11-25  
**Classification:** Restricted / Security Assessment  
**Target:** VidyutFlow Enterprise Utility Management Platform (FastAPI Backend, Node/Express Edge Server, React Frontend)  
**Standards:** OWASP Top 10 (2021/2025), OWASP API Security Top 10 (2023), OWASP ASVS Level 2, GERC Regulatory Guidelines  
**Commit / Scope:** `54fdffb` (dirty worktree with verified backend remediations; full-stack source & config review)

---

## 1. Security Architecture Overview

VidyutFlow enforces a **Defense-in-Depth** security architecture tailored for critical energy infrastructure. Electricity distribution systems handle sensitive citizen identity documents (Aadhaar, Voter ID, property title deeds), metering telemetry, and grid switching workflows that require zero-trust access boundaries.

```text
[ Client Browser / PWA Mobile ]
       │ HTTPS / TLS 1.3
       ▼
[ Edge Security Layer (Node.js prodServer / Express Middleware) ]
       ├─ Content-Security-Policy (CSP), X-Frame-Options: DENY, nosniff
       ├─ Cookie Enclave (HttpOnly, SameSite=Lax, Secure in production)
       ├─ CSRF Header (X-VidyutFlow-CSRF) + Origin / Sec-Fetch-Site Checks
       ├─ AI Chat & Meter Reading Rate Limiting + Payload Caps
       └─ In-Memory Session Token Bridge (Zero FastAPI JWTs in localStorage)
       │ Proxy over internal loopback (127.0.0.1:8008)
       ▼
[ Canonical FastAPI Backend Layer ]
       ├─ Input Validation (Pydantic v2 strict models, regex for PIN/phone)
       ├─ Authentication (Bcrypt cost 12, JWT 15m TTL, rotation families)
       ├─ Authorization (RBAC + Zone/Subdivision Object-Level Isolation)
       ├─ Document Vault (Magic-byte detection + HKDF/AES-256-GCM encryption)
       ├─ SQL Protection (Parameterized SQLAlchemy ORM queries)
       └─ Tamper-Evident Hash Chain (SHA-256 chained AuditLog + DB Lock)
       │ TLS / Encrypted Socket
       ▼
[ Storage & Vault Layer (PostgreSQL / SQLite & Encrypted Filesystem) ]
```

---

## 2. Authentication & Session Security (OWASP ASVS V2 & V3)

### 2.1 Password Storage & Validation
- **FastAPI Backend (`backend/app/security.py`):** Passwords hashed with `bcrypt` and validated against modern length/complexity bounds (including 72-byte bcrypt ceiling checks in `test_auth_security.py`).
- **Node Edge Server (`src/server/authService.ts:95-144`):** Uses `crypto.scryptSync` (`N=16384, r=8, p=1`, 16-byte random per-user salt, 64-byte key) with `crypto.timingSafeEqual`.

### 2.2 Token Lifecycle & Rotation
- **Access Tokens:** Short-lived JWTs (15-minute expiration) signed with HS256 using server-side `SECRET_KEY`.
- **Refresh Token Rotation:** Refresh tokens are tracked in `user_sessions` by SHA-256 hash; exchanging a refresh token revokes the prior token (`is_revoked = True`) and issues a new token. Reuse of a revoked token invalidates the entire `token_family`.
- **Node Session Cookies (`src/server/authService.ts:167-240, 305-335`):** 256-bit random session IDs signed with HMAC-SHA256 (`timingSafeEqual`), 8h TTL, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production, and mandatory `SESSION_SECRET` (>= 32 chars) in production.

### 2.3 Session Storage & XSS Token Defense
- **Zero `localStorage` Storage for FastAPI JWTs (`src/utils/backendSession.ts:29, 39-48, 107-109`):** Access and refresh tokens are held strictly in-memory closures, legacy Web Storage token keys are purged on load, and identity is reconciled across tabs via `BroadcastChannel`.
- **Auth Mode Lock (`src/utils/authClient.ts:38-80`):** `isProductionAuthEnvironment` locks `authMode` to `'server'` in production regardless of `localStorage`.

### 2.4 Multi-Factor Authentication (MFA)
- **Implementation:** TOTP (RFC 6238) via `pyotp` with AES-256-GCM encrypted seeds (`mfa_secret_encrypted`) and hashed backup codes (`test_phase1_auth_hardening.py`).

---

## 3. Authorization & Access Control (OWASP Top 10 A01: Broken Access Control)

### 3.1 Role-Based Access Control (RBAC)
Authoritative roles (`consumer`, `engineer`, `officer`, `admin`, plus `management` UI persona) are enforced across FastAPI endpoints via `current_user` and `require(*roles)` (`backend/app/deps.py`):
- `staff.py`, `system.py`, `workflows.py`, `directory.py`: Admin-only mutations and operational/SIEM/DR endpoints enforce `Depends(require("admin"))` (or `current_user.role != "admin"`).
- `erp.py`: Enforces `Depends(require("officer", "admin"))` and zone isolation via `visible_requests(db, u)` / `require_request_access(db, u, r)`.
- `assistant.py`: Enforces `Depends(current_user)` + `visible_requests` for chat, `officer`/`admin` for AI governance, and `officer`/`engineer`/`admin` for load forecasting.
- `transformers.py`: Blocks consumers (`403` + `SECURITY_VIOLATION` audit log), zone-scopes officers/engineers, rejects JWTs in SSE query parameters (`transformers.py:714-718`), and protects `POST /transformers/telemetry` with `hmac.compare_digest`.

### 3.2 Node Edge Middleware & AI Tool Isolation
- **`src/server/runtimeMiddleware.ts:166-346`:** `/api/ai-chat` enforces `Sec-Fetch-Site`/Origin checks, IP and `userId:clientIp` sliding-window rate limits, session validation prior to body read, `50 KB` payload / `2,500` char message caps, prompt-injection detection, and server-authoritative context (`buildServerVerifiedContext`).
- **`src/server/agenticTools.ts:388-704`:** `executeAgenticTool` enforces `verifyReadOnlyToolCall`, `persona.allowedTools`, consumer ownership checks, and staff-field stripping.

---

## 4. Input Validation & Injection Defenses (OWASP A03: Injection)

- **SQL Injection Protection:** FastAPI routers use parameterized SQLAlchemy ORM queries; `system.py:32` uses static `SELECT 1`.
- **Markdown & QR/Barcode XSS Defense:**
  - `src/components/common/SafeMarkdown.tsx:9-343` renders markdown strictly as React JSX elements without `dangerouslySetInnerHTML`, restricting links to `[label](action:tab_id)` buttons.
  - `src/utils/qrCodeEngine.ts` and `src/utils/barcodeEngine.ts` strip characters outside `[A-Z0-9-]` before embedding references into Code 128 SVG `<text>`/`aria-label` attributes and apply `encodeURIComponent` to UPI parameters.
- **Data Format & Regex Verification:** Indian mobile numbers (`^(\+91[\-\s]?)?[6-9]\d{9}$`), Gujarat postal PIN bounds (`360000 - 396999`), and load capacity (`0.5 kW - 10,000.0 kW`) are enforced on request schemas.

---

## 5. Document Upload Security & Vault Encryption

- **Filename Sanitization (`backend/app/uploads.py:94-129`):** Strips directory paths, rejects control/bidi characters, normalizes NFKC, bounds length, and restricts extensions to `{.pdf, .jpg, .jpeg, .png, .txt}`.
- **Magic-Byte Verification (`backend/app/uploads.py:37-78`):** Validates `%PDF-`, PNG, JPEG (`\xff\xd8\xff`), and UTF-8 `.txt` while rejecting PE/ELF/Mach-O/ZIP/RAR/HTML/SVG/script disguises.
- **Streaming Bounds & Encryption (`backend/app/uploads.py:156-223, 434-470`):** Caps chunked reads at `max_bytes` and encrypts stored files with HKDF-SHA256 + AES-256-GCM (16-byte random salt, 12-byte nonce, `clean_name` AAD).

---

## 6. Audit Trail & Tamper-Evidence (OWASP A09)

- **Cryptographic Hash Chain:** State transitions, logins, and approvals are recorded in `audit_logs` with SHA-256 chaining anchored by `audit_chain_head` (`with_for_update()` pessimistic locking) and verifiable via `GET /v1/requests/audit/verify`.
- **SIEM Export:** `GET /v1/system/siem-events` (`admin`-only) exports CEF:0 formatted events.

---

## 7. Transport Security, Network Hardening & Repository Hygiene

| Header / Control | FastAPI (`backend/app/main.py:483-530`) | Node Edge (`src/server/prodServer.ts:53-62, 86`) |
|---|---|---|
| **Strict-Transport-Security (HSTS)** | Enforced in `production` | Enforced in `production` (`prodServer.ts:54-56`) |
| **Content-Security-Policy (CSP)** | Enforced (`frame-ancestors 'none'`, `object-src 'none'`) | Enforced (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`) |
| **X-Frame-Options** | `DENY` | `DENY` |
| **X-Content-Type-Options** | `nosniff` | `nosniff` |
| **Referrer-Policy** | `no-referrer` | `no-referrer` |
| **Permissions-Policy** | Enforced | `camera=(self), microphone=(), geolocation=(self)` |
| **Static Path Traversal Guard** | N/A (API only) | `prodServer.ts:167-174` (`normalizedDist + path.sep`, returns `403`) |
| **Secret Hygiene (`.gitignore`)** | `.env` & `backend/.env` untracked; `.env.example` placeholders empty | `.env` untracked; `run.bat:62` generates 32-byte random hex secrets |

---

## 8. Remediated Findings (Fixed & Verified on 2026-11-25)

All 21 identified findings (3 from the initial focused review + 18 from the full-stack audit) have been remediated and verified:

### Initial Focused Review Remediations
1. **[HIGH] Cross-Consumer Connection Hijacking & Hardcoded OTP Exposure — FIXED** (`backend/app/routers/consumer_profile.py`)
2. **[MEDIUM] Signed Proxy Header Replay & Deactivated-User Bypass — FIXED** (`backend/app/routers/meter_readings.py`)
3. **[LOW/MEDIUM] Unvalidated `profile_photo_url` Input — FIXED** (`backend/app/routers/consumer_profile.py`)

### Full-Stack Audit Remediations
4. **[CRITICAL] Node Consumer Profile Auth Bypass (`src/server/consumerProfileRoutes.ts`) — FIXED:** Removed `'demo-consumer-meenaben-patel'` fallback; requires valid `vidyutflow_sid` cookie or Bearer session (`401`) and `X-VidyutFlow-CSRF` on mutations (`403`).
5. **[HIGH] Node Directory Mutations Unauthenticated (`src/server/directoryRoutes.ts`) — FIXED:** `POST /api/directory/offices` and `POST /api/directory/import-csv` now require `admin` session role + CSRF header.
6. **[HIGH] Node Consumer OTP Login Weaknesses (`src/server/authRoutes.ts`) — FIXED:** Enforced CSRF, rate limiting, mandatory CAPTCHA, `crypto.randomInt` OTP, production suppression of `dev_simulation_otp`, and removed hardcoded demo key fallbacks on `/consumer/otp/verify`.
7. **[HIGH] Node Connection-Link OTP Hardcoded (`src/server/consumerProfileRoutes.ts`) — FIXED:** Replaced hardcoded `'482019'` with `crypto.randomInt`, omitted `demo_verification_code` in production, and enforced expiry + 5-attempt cap.
8. **[HIGH] Default `telemetry_ingest_secret` in Production (`backend/app/config.py`) — FIXED:** `validate_production_secret` rejects the dev default and secrets `< 32` chars when `app_env == "production"`.
9. **[HIGH] Client-Side Portal Guard `sessionStorage` Bypass (`src/context/AppContext.tsx`) — FIXED:** Stopped trusting `sessionStorage` in `'server'` mode prior to `/api/auth/me` and enforced fail-closed clearing on `authenticated: false`.
10. **[MEDIUM] Cross-Zone `client_uuid` IDOR (`backend/app/routers/transformers.py`) — FIXED:** Scoped `InspectionRecord` idempotency check to `transformer_id == tr.id` (`409` on mismatch).
11. **[MEDIUM] Missing HSTS Header (`src/server/prodServer.ts`) — FIXED:** Added `Strict-Transport-Security: max-age=31536000; includeSubDomains` in `production`.
12. **[MEDIUM] Hardcoded Meter Photo Fallback Key (`src/server/dataStore.ts`) — FIXED:** Requires `VIDYUTFLOW_UPLOAD_KEY` (`>= 32` chars) in `production`; uses ephemeral 32-byte key in dev/test.
13. **[MEDIUM] Hardcoded CAPTCHA HMAC Secret & `Math.random()` (`src/server/authRoutes.ts`) — FIXED:** Switched to `crypto.randomInt`, env/ephemeral 32-byte HMAC secret, and bounded `consumedCaptchaTokens`.
14. **[MEDIUM] `dangerouslySetInnerHTML` on `captchaSvg` (`src/components/common/VidyutFlowAuthModal.tsx`) — FIXED:** Switched to `<img src={\`data:image/svg+xml;utf8,\${encodeURIComponent(captchaSvg)}\`} />`.
15. **[MEDIUM] Unvalidated `prefix` Glob & Short `master_secret` Padding (`backend/app/uploads.py`) — FIXED:** Enforced `re.fullmatch(r"[A-Za-z0-9_-]+", prefix)` and removed `(master_secret * 4)[:32]` padding.
16. **[MEDIUM] Optional `iss`/`aud`/`token_type` Checks (`backend/app/security.py`) — FIXED:** Enforced strict `verify_iss=True`, `verify_aud=True`, and `payload.get("token_type") == expected_type`.
17. **[MEDIUM] Unbounded JSON Body Reads & `Object.assign` (`src/server/consumerProfileRoutes.ts`, `directoryRoutes.ts`) — FIXED:** Added byte caps (`65536` / `1_048_576`) and allowlisted preference keys.
18. **[MEDIUM] `POST /security/change-password` Stub (`src/server/consumerProfileRoutes.ts`, `authService.ts`) — FIXED:** Implemented `ServerAuthService.changePassword` with `scrypt` verification and minimum length enforcement.
19. **[LOW] Unhandled `decodeURIComponent` `URIError` (`src/server/prodServer.ts`) — FIXED:** Wrapped in `try/catch`, returning `400 Bad Request`.
20. **[LOW] Unconditional `X-Forwarded-Host` Trust (`authRoutes.ts`, `runtimeMiddleware.ts`, `meterReadingRoutes.ts`) — FIXED:** Gated on `TRUSTED_PROXY === 'true'`.
21. **[LOW] Dev `0.0.0.0` Binding & Unpinned Python Ranges (`package.json`, `vite.config.ts`, `backend/requirements.txt`) — FIXED:** Bound Vite dev/preview to `127.0.0.1` with explicit `allowedHosts`, and pinned `pandas==3.0.0`, `alembic==1.20.1`, `pyotp==2.10.0`, `xgboost==3.2.0` (`shap>=0.44.0` retained as optional/uninstalled locally).

---

## 9. Security Test Suite Verification Results (2026-11-25 Post-Remediation)

### TypeScript & Node/Frontend Suites (`npm run lint` & `npx tsx`)
All checks exited with code `0`:
- `npm run lint` (`tsc --noEmit`): **PASS**
- `tests/auth-access.test.ts`: **PASS (10/10)**
- `tests/server-auth-foundation.test.ts`: **PASS**
- `tests/server-auth-api.test.ts`: **PASS**
- `tests/security-resilience-stress.test.ts`: **PASS (12/12)**
- `tests/consumer-portal-security.test.ts`: **PASS (13/13)**
- `tests/backend-session-boundary.test.ts`: **PASS**
- `tests/unified-login-security.test.ts`: **PASS (6/6 steps)**
- `tests/consumer-profile.test.ts`: **PASS (8/8 steps, including `401` unauthenticated guard)**
- `tests/ugvcl-directory.test.ts`: **PASS (9/9)**
- `tests/meter-reading.test.ts`: **PASS (Phase 11A–11F)**

### FastAPI Backend (`pytest`)
- `tests/test_phase1_auth_hardening.py`, `test_phase2_authorization_hardening.py`, `test_phase3_upload_hardening.py`, `test_phase12_security.py`, `test_transformer_security_and_dr.py`, `test_document_upload_validation.py`: **PASS (54/54)**
- `tests/test_auth_security.py` + `tests/test_phase6_transport_dos_hardening.py`: **PASS (9/9)**
- `tests/test_consumer_profile.py` (isolated): **PASS (7/7)**
