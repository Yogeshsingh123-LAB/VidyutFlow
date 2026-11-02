# Security Policy & Cryptographic Posture (`PS000125`)

Cloudflare-aligned Security Audit & Hardening Remediation Report: [`docs/SECURITY_AUDIT_REPORT.md`](docs/SECURITY_AUDIT_REPORT.md) · Full STRIDE threat model, Zero-Trust VLAN segmentation, and cryptographic controls: [`docs/SECURITY.md`](docs/SECURITY.md) · VAPT plan: [`docs/PENETRATION_TEST_PLAN.md`](docs/PENETRATION_TEST_PLAN.md).

## Scope

VidyutFlow is a working utility workflow & AI decision-support prototype (`PS000125` — UGVCL) evaluated on synthetic holdout datasets. It holds zero real UGVCL citizen PII in this repository, and infrastructure/network hardening is out of scope.

## Reporting a Vulnerability

Do **not** open a public issue for a suspected vulnerability. Contact the team leader (**@Yogeshsingh123-LAB** via GitHub) with:
- affected endpoint/component,
- reproduction steps (seeded demo accounts are listed in `README.md`),
- security impact assessment.

## Implemented Application-Layer Security Controls (Cloudflare Security Audit Hardened)

1. **Phase 1 — Authentication, Session Security & Staff MFA**:
   - `bcrypt` (72-byte bounded) + `scrypt` password hashing compliant with NIST SP 800-63B.
   - 15-minute access tokens with standard RFC 7519 claims (`jti`, `iss`, `aud`, `token_type`).
   - Server-side session tracking via `UserSession` model with immediate revocation on logout (`POST /v1/auth/logout`) or password change.
   - 384-bit rotating refresh tokens with SHA-256 storage and automatic token-family invalidation upon reuse detection (`POST /v1/auth/refresh`).
   - Staff TOTP MFA (RFC 6238) with AES-256-GCM encrypted secrets and 8 single-use hashed recovery codes (`POST /v1/auth/mfa/setup`, `POST /v1/auth/mfa/verify`).
   - Distributed-ready login rate limiting (5 attempts / 300s) and generic registration responses to prevent account enumeration.
2. **Phase 2 — Authorization & BOLA/IDOR Access Control**:
   - Strict horizontal tenant isolation across all connection requests and premises (HTTP 404 concealment on unauthorized premise queries).
   - Vertical privilege escalation blocks preventing non-admin role modification.
   - Case-insensitive subdivision officer zone containment (`func.lower()`).
   - Field engineer assignment containment (unassigned engineers receive HTTP 403).
3. **Phase 3 — File Upload Security & Cryptographic Envelope**:
   - Magic-byte verification (`%PDF-`, PNG, JPEG, UTF-8 text) with anti-polyglot inspection blocking executable HTML/XML/SVG script tags.
   - Double-extension and path traversal sanitization (`deed.php.pdf` $\to$ `deed_php.pdf`).
   - NIST SP 800-38D AES-256-GCM envelope encryption at rest (`VFENC1`) with AAD bound to filename and zero plaintext written to disk.
   - Authenticated document download endpoint (`GET /v1/requests/{request_id}/document`) with BOLA authorization, `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment`, and `Cache-Control: no-store`.
4. **Phase 4 — Input Validation, Injection Defense & Model Hardening**:
   - Stored XSS defense via `sanitize_untrusted_text` stripping dangerous HTML tags, DOM event handlers (`onerror=`, `onload=`), and active schemes (`javascript:`, `vbscript:`, `data:`).
   - 6-digit Indian PIN code format enforcement (`[1-9][0-9]{5}`) across request intake and premise registration.
   - 100% ORM parameterized queries ensuring SQL injection immunity.
5. **Phase 5 — Tamper-Evident Audit Hash Chain & SIEM / SOC Export**:
   - Fork-proof serialized SHA-256 hash chain (`AuditChainHead` row lock + `AuditLog.chain_seq` `UNIQUE`), verifiable at `GET /v1/requests/audit/verify`.
   - Comprehensive audit logging for `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, and `DOCUMENT_DOWNLOADED`.
   - Admin SIEM export in ArcSight/Wazuh `CEF:0` and JSON formats (`GET /v1/system/siem-events`).
   - Live Cryptographic & Security Posture Self-Test at `GET /v1/system/security-posture`.
6. **Phase 6 — Transport Security, Permissions Policy & DoS Limits**:
   - Request body length DoS limit: JSON payloads exceeding 2 MiB rejected with HTTP 413.
   - Restrictive `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`.
   - Hardened `Content-Security-Policy` with `object-src 'none'` and `frame-ancestors 'none'`.
   - Production `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` and CORS wildcard restriction.

## Production DISCOM Hardening Boundary

| Capability | Repo Implementation | UGVCL Production Deployment |
| :--- | :--- | :--- |
| Key Management | HKDF-SHA256 derived 256-bit keys from `SECRET_KEY` | FIPS 140-3 HSM / MeitY Cloud KMS 90-day key rotation |
| Identity Federation | Simulated OIDC / Gujarat Parichay SSO (`403` in prod) + Staff TOTP MFA | Live GUVNL Active Directory / Parichay SAML2/OIDC + Hardware FIDO2 |
| Network Segmentation | Container network isolation + strict CORS allowlist + DoS body limits | 4-VLAN Zero-Trust DMZ / App / DB-Vault / Substation SD-WAN ([`docs/SECURITY.md`](docs/SECURITY.md)) |
| External VAPT | 105 automated security and workflow regression tests (100% pass) | CERT-In empaneled agency VAPT sign-off ([`docs/PENETRATION_TEST_PLAN.md`](docs/PENETRATION_TEST_PLAN.md)) |
