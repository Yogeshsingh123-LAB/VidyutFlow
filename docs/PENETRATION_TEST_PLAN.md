# Security Hardening & CERT-In VAPT Penetration Test Plan (Item #21 — PS000125 Points 7 & 9)

> **Scope:** Documents the security controls implemented and hardened in VidyutFlow today (aligned with the Cloudflare Security Audit methodology) alongside the structured **Vulnerability Assessment & Penetration Testing (VAPT)** plan required before live UGVCL subdivision go-live.
>
> Remediation Report: [`docs/SECURITY_AUDIT_REPORT.md`](SECURITY_AUDIT_REPORT.md) · Architecture & STRIDE Threat Model: [`docs/SECURITY.md`](SECURITY.md).

---

## 1. Security Controls Implemented in Code Today (Cloudflare Security Audit Hardened)

| Control Area | Implementation in Repo | Evidence / Verification Test |
| :--- | :--- | :--- |
| **Authentication, JWTs & Session Revocation** | 15-minute access tokens with standard RFC 7519 claims (`jti`, `iss`, `aud`, `token_type`); database-backed `UserSession` tracking with server-side revocation on logout (`POST /v1/auth/logout`) and password reset; 384-bit rotating refresh tokens with SHA-256 storage and reuse detection (`POST /v1/auth/refresh`). | `backend/tests/test_phase1_auth_hardening.py`, `backend/app/security.py`, `backend/app/routers/auth.py` |
| **Staff Multi-Factor Authentication (MFA)** | RFC 6238 TOTP MFA for staff roles with AES-256-GCM encrypted secrets, QR provisioning (`POST /v1/auth/mfa/setup`), verification (`POST /v1/auth/mfa/verify`), and 8 single-use hashed recovery codes. | `backend/tests/test_phase1_auth_hardening.py`, `backend/app/mfa.py` |
| **BOLA & IDOR Access Control** | Horizontal tenant isolation across requests; premise IDOR returns HTTP 404 concealing existence; vertical privilege escalation blocked on staff/admin routes; case-insensitive officer zone containment (`func.lower()`); field engineer assignment containment. | `backend/tests/test_phase2_authorization_hardening.py`, `backend/app/access.py` |
| **File Upload Security & Envelope Encryption** | Magic-byte verification (`%PDF-`, PNG, JPEG, UTF-8 text); anti-polyglot script inspection; double-extension and path traversal sanitization; `VFENC1` NIST SP 800-38D AES-256-GCM envelope encryption at rest; authenticated download endpoint (`GET /v1/requests/{request_id}/document`) with BOLA authorization and `nosniff`. | `backend/tests/test_phase3_upload_hardening.py`, `backend/app/uploads.py` |
| **Input Validation & Stored XSS Defense** | Stored XSS sanitization via `sanitize_untrusted_text` stripping dangerous HTML tags, DOM event handlers (`onerror=`), and active schemes (`javascript:`, `vbscript:`, `data:`); 6-digit Indian PIN code format enforcement (`[1-9][0-9]{5}`); 100% ORM parameterized queries. | `backend/tests/test_phase4_input_validation_hardening.py`, `backend/app/security.py` |
| **Tamper-Evident Audit Chain & SIEM** | Serialized SHA-256 hash chain with `AuditChainHead` row lock anchor; audit logging for `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, and `DOCUMENT_DOWNLOADED`; verification walk (`GET /v1/requests/audit/verify`); ArcSight/Wazuh `CEF:0` and JSON export (`GET /v1/system/siem-events`). | `backend/tests/test_phase5_audit_hashchain_hardening.py`, `backend/app/audit.py` |
| **Transport Security & DoS Protection** | Request body length DoS limit (2 MiB → HTTP 413); `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`; hardened CSP with `object-src 'none'` and `frame-ancestors 'none'`; production HSTS preload (`max-age=63072000; includeSubDomains; preload`); CORS wildcard restriction. | `backend/tests/test_phase6_transport_dos_hardening.py`, `backend/app/main.py` |

---

## 2. Pre-Pilot Penetration Testing (VAPT) Plan (CERT-In Empanelled Audit)

Before connecting live consumer PII or SAP IS-U adapters in Tier 1 pilot:

1. **Phase 1 — Automated SAST / DAST & Dependency Audit (Week 1)**
   - Run `pip-audit` + `npm audit` + CodeQL / Semgrep across `backend/` and `frontend/`.
   - Run OWASP ZAP baseline & OpenAPI fuzz scan against `docs/api/openapi.json` (57 paths / 62 operations) testing malformed payloads, oversized payloads exceeding 2 MiB (`413`), oversized file uploads (`413`), and NUL/path-traversal filenames (`400`).
2. **Phase 2 — Grey-Box RBAC, IDOR & Auth Boundary Testing (Week 2)**
   - Attempt horizontal & vertical privilege escalation across all 5 roles (`consumer`, `employee`/`officer`, `field`/`engineer`, `management`, `admin`), cross-zone officer reads (`North` vs `South`), unassigned field engineer inspections (`403`), and forged/expired cookies & JWTs.
   - Verify simulated demo SSO (`/auth/sso/login`) and seeded demo accounts are hard-blocked (`RuntimeError` / `403`) when `APP_ENV=production`.
   - Test TOTP MFA brute-force resistance, recovery code single-use burn, and refresh token reuse family revocation.
3. **Phase 3 — Cryptographic Vault, Polyglot Upload & Audit Stress Testing (Week 3)**
   - Attempt polyglot file uploads (PDFs containing HTML/JS, text files with script tags, double extensions `file.php.pdf`).
   - Execute 1-bit ciphertext corruption attacks on the `VFENC1` vault verifying decryption failure.
   - Execute concurrent audit-chain write stress, verifying zero chain forks via `AuditChainHead` lock and deterministic verification walk (`GET /v1/requests/audit/verify`).
   - Run distributed credential-stuffing tests against Redis-backed `/auth/login` verifying 5-attempt/300s account lockout.
4. **Phase 4 — Remediation & Sign-Off Gate (Week 4)**
   - Zero Critical / High findings open; CERT-In clearance certificate archived with UGVCL IT Security Cell prior to subdivision go-live.

