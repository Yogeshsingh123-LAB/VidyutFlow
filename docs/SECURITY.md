# Cybersecurity Architecture, Threat Model & Cryptographic Controls (`PS000125`)

> **Addresses Official `PS000125` Mandate:** *"Security controls must protect data, ensure availability, enforce strong authentication, and provide full auditability across utility portals and enterprise systems."*
>
> Cloudflare-aligned Security Audit & Hardening Remediation Report: [`docs/SECURITY_AUDIT_REPORT.md`](SECURITY_AUDIT_REPORT.md) · Companion VAPT test cases: [`docs/PENETRATION_TEST_PLAN.md`](PENETRATION_TEST_PLAN.md).

---

## 1. Application-Layer Security Control Matrix (Cloudflare Audit Hardened vs. Proposed Infra Out of Scope)

| Control Domain | Implemented & Tested in This Repository | Production DISCOM Extension |
| :--- | :--- | :--- |
| **Authentication & Session Safety** | 1. **RFC 7519 JWT Claims**: 15-minute access tokens with `jti`, `iss`, `aud`, and `token_type`.<br>2. **Server-Side Session Revocation**: Database-backed `UserSession` tracking active sessions; revoked immediately on logout (`POST /v1/auth/logout`) or password change.<br>3. **Rotating Refresh Tokens**: 384-bit tokens stored as SHA-256 hashes (`POST /v1/auth/refresh`); automatic family revocation on detected reuse.<br>4. **Staff TOTP MFA (RFC 6238)**: AES-256-GCM encrypted secrets, QR provisioning (`POST /v1/auth/mfa/setup`), verification (`POST /v1/auth/mfa/verify`), and 8 single-use hashed recovery codes.<br>5. **Cookie Sessions**: `HttpOnly; SameSite=Lax` cookies (`/auth/login?use_cookie=true`) + in-memory session bridge (`backendSession.ts`) purging legacy tokens. | Hardware FIDO2 / Parichay Gov-SSO MFA (`POST /auth/sso/login` OIDC contract already wired & gated in prod). |
| **Authorization & BOLA/IDOR Access Control** | 1. **Horizontal Consumer Isolation (BOLA)**: Strict tenancy checks across request endpoints (`/v1/requests/*`).<br>2. **Premise IDOR Protection**: Conceals resource existence with HTTP 404 for unauthorized premise queries (`GET /v1/requests/premises/{premise_id}`).<br>3. **Subdivision Officer Containment**: Case-insensitive zone containment (`func.lower(User.subdivision_zone) == func.lower(Request.zone)`).<br>4. **Field Engineer Containment**: Unassigned engineers receive HTTP 403. | Attribute-Based Access Control (ABAC) synced with UGVCL HR/SAP org-unit hierarchy. |
| **Encryption at Rest & KYC Vault** | 1. **Field-level PII cipher (`backend/app/security.py`)**: `encrypt_field_aes256` / `decrypt_field_aes256` using **HKDF-SHA256 + AES-256-GCM** (96-bit random nonce + 128-bit GCM auth tag).<br>2. **Encrypted Document Vault (`backend/app/uploads.py`)**: `VFENC1` **NIST SP 800-38D AES-256-GCM** encrypts uploaded KYC files with AAD bound to filename; zero plaintext stored on disk.<br>3. **Anti-Polyglot Defense**: Magic-byte inspection (`%PDF-`, PNG, JPEG, UTF-8) blocking HTML/XML/SVG scripts in text documents.<br>4. **Secure Document Retrieval**: `GET /v1/requests/{request_id}/document` enforces BOLA, `nosniff`, `Content-Disposition: attachment`, and `Cache-Control: no-store`. | Key wrapping via MeitY Cloud KMS / FIPS 140-3 HSM rotation every 90 days. Upstream ClamAV / ICAP Content Disarm & Reconstruction (CDR) at Citizen DMZ. |
| **Input Validation & Injection Defense** | 1. **SQLi**: `100%` SQLAlchemy ORM bound parameters (zero string-interpolated SQL).<br>2. **XSS**: `sanitize_untrusted_text()` (`backend/app/security.py`) strips `<script>/<iframe>/<object>/<embed>/<form>/onerror=/onload=` and active schemes (`javascript:`, `vbscript:`, `data:`) + React 19 JSX auto-escaping.<br>3. **PIN Code Validation**: Strict 6-digit Indian PIN code format (`[1-9][0-9]{5}`) yielding `NEEDS_CORRECTION` on invalid format in workflow requests and HTTP 422 in premise profiles. | Upstream OWASP CRS 4.x WAF at Citizen DMZ. |
| **Tamper-Evident Audit & SIEM / SOC** | 1. **Sequential SHA-256 Hash Chain**: Fork-proof serialized chain anchored by `AuditChainHead` row lock (`AuditLog.chain_seq` `UNIQUE`), verifiable at `GET /v1/requests/audit/verify`.<br>2. **Full Audit Coverage**: Logs `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, and KYC `DOCUMENT_DOWNLOADED`.<br>3. **Admin SIEM Export**: ArcSight/Wazuh `CEF:0` and JSON formats (`GET /v1/system/siem-events`).<br>4. **Security Posture Self-Test**: Live test at `GET /v1/system/security-posture`. | Real-time syslog TLS shipping to GUVNL / State Cyber SOC Wazuh cluster. |
| **Transport Security & DoS Protection** | 1. **Request Body DoS Limit**: Middleware aborts JSON bodies exceeding 2 MiB (`max_json_body_bytes = 2097152`) with HTTP 413.<br>2. **Security Headers**: `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`, `Content-Security-Policy: ... object-src 'none'; frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`.<br>3. **Production HSTS**: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` in `APP_ENV=production`.<br>4. **CORS Hardening**: Wildcards (`*`) strictly rejected when credentials are enabled. | mTLS (`TLS 1.3`) between NGINX WAF, FastAPI pods, and SAP S/4HANA OData Gateway. Cloudflare Enterprise Layer 7 DDoS mitigation. |

---

## 2. STRIDE Threat Model

| Threat Category | Concrete Utility Attack Vector | Mitigation in VidyutFlow | Verification Test Suite |
| :--- | :--- | :--- | :--- |
| **S — Spoofing** | Attacker steals JWT via injected JS, brute forces credentials, or spoofs staff role. | 15-minute access tokens with standard claims; rotating refresh tokens with reuse invalidation; Staff TOTP MFA (RFC 6238); server-side session revocation (`UserSession`); distributed rate limiting (5 attempts / 300s). | `test_phase1_auth_hardening.py`, `test_auth_security.py` |
| **T — Tampering** | Insider alters a `REJECTED` sanction row, deletes an `AuditLog` entry, or flips 1 byte in backup/ciphertext. | `GET /v1/requests/audit/verify` detects any edited/deleted/reordered row; AES-256-GCM auth tag rejects 1-bit ciphertext tamper; `restore.sh` aborts on `.sha256` mismatch. | `test_phase5_audit_hashchain_hardening.py`, `test_audit_chain.py` |
| **R — Repudiation** | Approving officer denies sanctioning high-load connection, downloading KYC document, or executing ERP sync. | Every action, document download (`DOCUMENT_DOWNLOADED`), status change, and login logs actor ID, role, IP, and chained SHA-256 `entry_hash`; AI is strictly advisory (`models_can_approve_or_reject = False`). | `test_phase5_audit_hashchain_hardening.py`, `test_transitions.py` |
| **I — Information Disclosure** | Attacker accesses other citizen's application (BOLA), queries other premise (IDOR), or downloads KYC document directly from disk. | Horizontal tenant isolation on all requests; premise IDOR returns HTTP 404; KYC files encrypted with `VFENC1` AES-256-GCM; download route requires BOLA authorization and returns `nosniff`. | `test_phase2_authorization_hardening.py`, `test_phase3_upload_hardening.py` |
| **D — Denial of Service** | Oversized JSON payload (DoS), massive 50 MB upload, brute-force login flood, or hung LLM synthesis. | Request body length limit (2 MiB → HTTP 413); streaming upload limit (5 MiB → 413); login rate-limiting (429); strict 3,500ms timeout on LLM synthesis falling back to local TF-IDF RAG. | `test_phase6_transport_dos_hardening.py`, `test_document_upload_validation.py` |
| **E — Elevation of Privilege** | Self-registration passes `"role": "admin"`, consumer modifies request status, or unassigned engineer inspects request. | Registration rejects non-consumer roles (`403`); strict workflow transition matrix; field engineer assignment checks (403 for unassigned engineers). | `test_phase2_authorization_hardening.py`, `test_flow.py` |

---

## 3. Zero Trust & Four-Zone Network Segmentation

1. **Zone 1 — Public / Citizen DMZ (`VLAN 10`)**: Terminates TLS 1.3, enforces WAF rate-limits & Geo/bot rules; zero direct route to database or SAP network.
2. **Zone 2 — Application & Non-Invasive ERP Gateway (`VLAN 20`)**: Runs stateless FastAPI & Node workers; every internal request carries short-lived cryptographic identity + DB-reverified active status; outbound SAP OData / CIS Billing / 1912 CRM calls traverse an explicit allowlist egress gateway.
3. **Zone 3 — Restricted Data & Cryptographic Vault (`VLAN 30`)**: PostgreSQL 16 Primary/Standby + AES-256-GCM `UPLOAD_VAULT_DIR` + offsite backup vault; accepts connections **only** from `VLAN 20` DB service accounts on port `5432` and SOC integrity verifiers.
4. **Zone 4 — Substation Edge & OT Read-Only Collector (`VLAN 40`)**: Raspberry Pi 4 + 4G SD-WAN concentrators authenticate via per-device WireGuard keys and can only `POST` bounded telemetry/field-sync payloads — **never** issue inbound commands to substation protection relays.

---

## 4. Live Cryptographic & Security Self-Test

Administrators and judges can verify active cryptographic and application defenses live at runtime:

```bash
# 1. Run live AES-256-GCM round-trip + tamper-rejection + XSS/SQLi + hash-chain posture check
curl -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:8000/v1/system/security-posture

# 2. Export live ArcSight / Wazuh CEF:0 SIEM stream
curl -H "Authorization: Bearer <ADMIN_TOKEN>" "http://localhost:8000/v1/system/siem-events?format=cef"

# 3. Verify cryptographic audit chain integrity
curl -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:8000/v1/requests/audit/verify
```
