# Cybersecurity Architecture, Threat Model & Cryptographic Controls (`PS000125`)

> **Addresses Official `PS000125` Mandate:** *"Security controls must protect data, ensure availability, enforce strong authentication, and provide full auditability across utility portals and enterprise systems."*
>
> Companion VAPT test cases: [`docs/PENETRATION_TEST_PLAN.md`](PENETRATION_TEST_PLAN.md).

---

## 1. Defense-in-Depth Control Matrix (Live in Code vs. Enterprise Deployment)

| Control Domain | Implemented & Tested in This Repository | Production DISCOM Extension |
| :--- | :--- | :--- |
| **Authentication & Session Safety** | `bcrypt` (72-byte bounded) password hashing; **`HttpOnly; SameSite=Lax` cookie sessions** (`/auth/login?use_cookie=true`) + verified in-memory session bridge (`backendSession.ts`) that purges legacy storage keys (**zero `localStorage` JWTs**) and fails closed on cross-tab identity changes (`BroadcastChannel`). | Hardware FIDO2 / Parichay Gov-SSO MFA (`POST /auth/sso/login` OIDC contract already wired & gated in prod). |
| **Encryption at Rest (AES-256-GCM)** | 1. **Field-level PII cipher (`backend/app/security.py`)**: `encrypt_field_aes256` / `decrypt_field_aes256` using **HKDF-SHA256 + AES-256-GCM** (96-bit random nonce + 128-bit GCM auth tag).<br>2. **Document Vault (`backend/app/uploads.py`)**: `VFENC1` **HKDF-SHA256 + AES-256-GCM** encrypts uploaded KYC files on `POST /v1/requests/with-document` with zero plaintext written to disk. | Key wrapping via MeitY Cloud KMS / FIPS 140-3 HSM rotation every 90 days. |
| **Encryption in Transit & HTTP Headers** | `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` on `/auth/*`, and `Strict-Transport-Security` (`max-age=63072000; includeSubDomains`) in `APP_ENV=production` (`backend/app/main.py`). | mTLS (`TLS 1.3`) between NGINX WAF, FastAPI pods, and SAP S/4HANA OData Gateway. |
| **SQL Injection, XSS & Upload Spoofing** | **SQLi**: `100%` SQLAlchemy ORM bound parameters (zero string-interpolated SQL).<br>**XSS**: `sanitize_untrusted_text()` (`backend/app/security.py`) strips `<script>/<iframe>/onerror=` vectors + React 19 JSX auto-escaping.<br>**Upload Header Check**: `validate_magic_bytes()` verifies `%PDF-`, PNG, JPEG & UTF-8 `.txt` header signatures (blocking extension-spoofed `MZ`/`ELF` binaries; note: header checks are not antivirus/polyglot CDR scanning) + non-web-served `VFENC1` encryption + `X-Content-Type-Options: nosniff`. | Upstream OWASP CRS 4.x WAF + ClamAV / ICAP Content Disarm & Reconstruction (CDR) malware scanner at Citizen DMZ. |
| **RBAC & Zone Isolation** | Server-enforced `require(...)` + `visible_requests(db, u)` (`backend/app/access.py`): Consumers see only own rows; Engineers see only assigned rows; Officers are restricted to their exact UGVCL zone (blank zone fails closed); `/system/*` restricted to `admin`. | Attribute-Based Access Control (ABAC) synced with UGVCL HR/SAP org-unit hierarchy. |
| **Tamper-Evident Audit & SIEM / SOC** | Serialized, fork-proof **SHA-256 hash chain** (`AuditChainHead` + `AuditLog.chain_seq` `UNIQUE` + `GET /v1/requests/audit/verify`) + **Admin SIEM export in ArcSight/Wazuh `CEF:0` and JSON (`GET /v1/system/siem-events`)**. | Real-time syslog TLS shipping to GUVNL / State Cyber SOC Wazuh cluster. |
| **Rate Limiting & Abuse Protection** | Sliding-window login & AI chat rate limiter (`backend/app/routers/auth.py`, `runtimeMiddleware.ts`) ignoring spoofed `X-Forwarded-For` headers unless behind trusted proxy. | Distributed Redis token-bucket limiter across multi-node HPA replicas. |

---

## 2. STRIDE Threat Model

| Threat Category | Concrete Utility Attack Vector | Mitigation in VidyutFlow | Verification Test |
| :--- | :--- | :--- | :--- |
| **S — Spoofing** | Attacker steals JWT via injected JS or spoofs `role: "admin"` in browser state / AI chat payload. | `HttpOnly; SameSite=Lax` cookies; zero `localStorage` tokens; server derives role strictly from DB/cookie session (`auth-access.test.ts`, `teammate-backlog-completion.test.ts`). | `test_auth_security.py`, `auth-access.test.ts` |
| **T — Tampering** | Insider alters a `REJECTED` sanction row or deletes an `AuditLog` entry in the database; or flips 1 byte in a backup file or AES-256-GCM ciphertext. | `GET /v1/requests/audit/verify` detects any edited/deleted/reordered row; GCM auth tag rejects 1-bit ciphertext tamper; `restore.sh` aborts on `.sha256` mismatch. | `test_audit_chain.py`, `test_judge_gap_closure.py` |
| **R — Repudiation** | Approving officer denies sanctioning a high-load commercial connection or triggering an ERP sync. | Every status change, template edit, alert dispatch, and SAP OData sync records actor ID, role, timestamp, and chained SHA-256 `entry_hash`; AI is strictly advisory (`models_can_approve_or_reject = False`). | `test_ai_governance.py`, `test_transitions.py` |
| **I — Information Disclosure** | Consumer enumerates another citizen's application ID, Officer queries another subdivision's queue, or attacker downloads plaintext Aadhaar PDF from disk. | `require_request_access` returns `403` cross-user/cross-zone; KYC uploads are stored exclusively as `VFENC1` AES-256-GCM ciphertext (`uploads.py`). | `test_flow.py`, `test_judge_gap_closure.py` |
| **D — Denial of Service** | Oversized `50 MB` upload exhausts memory, brute-force login flood, or slow/hung external LLM blocks portal threads. | Streaming `MAX_UPLOAD_BYTES` (`5 MiB` → `413`), auth rate-limiting (`429`), and strict `3,500ms` server timeout (`SERVER_GEMINI_TIMEOUT_MS`) falling back to local TF-IDF RAG. | `test_document_upload_validation.py`, `ai-assistant-resilience.test.ts` |
| **E — Elevation of Privilege** | Self-registration payload passes `"role": "admin"` or Field Engineer attempts `APPROVED` transition. | `/auth/register` rejects non-consumer roles (`403`); workflow transition matrix (`workflow.py`) enforces role-per-edge permissions. | `test_flow.py`, `test_transitions.py` |

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
```
