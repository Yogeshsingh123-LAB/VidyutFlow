# Security Policy & Cryptographic Posture (`PS000125`)

Full STRIDE threat model, Zero-Trust VLAN segmentation, and cryptographic controls: [`docs/SECURITY.md`](docs/SECURITY.md) · VAPT plan: [`docs/PENETRATION_TEST_PLAN.md`](docs/PENETRATION_TEST_PLAN.md).

## Scope

VidyutFlow is an enterprise-ready utility orchestration & AI decision-support platform (`PS000125` — UGVCL) evaluated on leak-free synthetic datasets. It holds zero real UGVCL citizen PII in this repository.

## Reporting a Vulnerability

Do **not** open a public issue for a suspected vulnerability. Contact the team leader (**@Yogeshsingh123-LAB** via GitHub) with:
- affected endpoint/component,
- reproduction steps (seeded demo accounts are listed in `README.md`),
- security impact assessment.

## Implemented Defense-in-Depth Controls

1. **Zero `localStorage` Tokens & Strict Session Isolation**:
   - `bcrypt` (72-byte bounded) + `scrypt` password hashing.
   - `HttpOnly; SameSite=Strict` cookies (`/auth/login?use_cookie=true`) paired with an in-memory, portal-verified session bridge (`backendSession.ts`) that purges legacy storage keys and fails closed across tabs via `BroadcastChannel`.
2. **AES-256-GCM Encryption at Rest (Fields + Document Vault)**:
   - **Field-level PII cipher (`backend/app/security.py`)**: `encrypt_field_aes256` / `decrypt_field_aes256` using **HKDF-SHA256 + AES-256-GCM** (96-bit random nonce + 128-bit GCM auth tag).
   - **Encrypted KYC Upload Vault (`backend/app/uploads.py`)**: Magic-byte signature inspection (`%PDF-`, PNG, JPEG, UTF-8) + `MAX_UPLOAD_BYTES` (`5 MiB`) + **`VFENC1` HKDF-SHA256 + AES-256-GCM** encryption at rest on `POST /v1/requests/with-document` (zero plaintext stored on disk).
3. **SQLi, XSS & Transport Hardening**:
   - `100%` SQLAlchemy ORM bound parameters; `sanitize_untrusted_text()` XSS tag/event stripper + React 19 JSX auto-escaping.
   - HTTP security headers: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` on `/auth/*`, and production `Strict-Transport-Security`.
4. **Tamper-Evident Audit Hash Chain & SIEM / SOC Export**:
   - Fork-proof serialized **SHA-256 hash chain** (`AuditChainHead` + `AuditLog.chain_seq` `UNIQUE`), verifiable at `GET /v1/requests/audit/verify`.
   - **ArcSight / Wazuh `CEF:0` & JSON SIEM stream** at `GET /v1/system/siem-events`.
   - **Live Cryptographic & Posture Self-Test** at `GET /v1/system/security-posture`.
5. **Distributed-Ready Rate Limiting & Production Startup Guards**:
   - Redis-backed sliding-window throttle (`REDIS_URL` with bounded in-memory fallback) ignoring spoofed `X-Forwarded-For` headers.
   - `APP_ENV=production` rejects default secrets, disables simulated OIDC SSO (`403`), and refuses seeded demo accounts.

## Production DISCOM Hardening Boundary

| Capability | Repo Implementation | UGVCL Production Deployment |
| :--- | :--- | :--- |
| Key Management | HKDF-SHA256 derived 256-bit keys from `SECRET_KEY` | FIPS 140-3 HSM / MeitY Cloud KMS 90-day key rotation |
| Identity Federation | Simulated OIDC / Gujarat Parichay SSO (`403` in prod) | Live GUVNL Active Directory / Parichay SAML2/OIDC + MFA |
| Network Segmentation | Container network isolation + strict CORS allowlist | 4-VLAN Zero-Trust DMZ / App / DB-Vault / Substation SD-WAN ([`docs/SECURITY.md`](docs/SECURITY.md)) |
| External VAPT | Automated security regression suites (`test_auth_security.py`, `auth-access.test.ts`) | CERT-In empaneled agency VAPT sign-off ([`docs/PENETRATION_TEST_PLAN.md`](docs/PENETRATION_TEST_PLAN.md)) |
