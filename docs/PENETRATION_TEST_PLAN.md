# Security Hardening & CERT-In VAPT Penetration Test Plan (Item #21 — PS000125 Points 7 & 9)

> **Scope:** Documents the security controls implemented in VidyutFlow today alongside the structured **Vulnerability Assessment & Penetration Testing (VAPT)** plan required before live UGVCL subdivision go-live.

---

## 1. Security Controls Implemented in Code Today

| Control Area | Implementation in Repo | Evidence / Test |
| :--- | :--- | :--- |
| **`httpOnly` Session Cookies** | Both Node portal auth (`vidyutflow_sid`) and FastAPI API auth (`vidyutflow_access_token`) issue `HttpOnly; SameSite=Lax` (`Secure` in `APP_ENV=production`) cookies; client JS never persists tokens in `localStorage`/`sessionStorage`. | `backend/app/routers/auth.py`, `backend/app/deps.py`, `frontend/src/server/authService.ts` |
| **Central Rate Limiting** | `backend/app/login_limit.py` enforces atomic central rate limiting via Redis (`INCR` + `EXPIRE` on `REDIS_URL=redis://redis:6379/0`) with bounded thread-safe in-memory fallback, ignoring spoofable `X-Forwarded-For`. `/api/ai-chat` enforces authenticated per-user + socket-IP sliding windows. | `backend/app/login_limit.py`, `docker-compose.yml`, `frontend/src/server/runtimeMiddleware.ts` |
| **Encryption at Rest & In Transit** | Passwords hashed with `bcrypt` (FastAPI) / `scrypt` (Node); sensitive KYC/field upload payloads supported by HKDF-SHA256 + **AES-256-GCM** envelope encryption (`encrypt_upload_at_rest` / `decrypt_upload_at_rest` in `backend/app/uploads.py`); TLS 1.3 + `Strict-Transport-Security` enforced in `APP_ENV=production`. | `backend/app/uploads.py`, `backend/app/main.py` |
| **Fork-Proof Tamper-Evident Audit Chain** | Monotonic unique `chain_seq` + `AuditChainHead` row lock + SHA-256 hash chain verified via `GET /requests/audit/verify`. | `backend/app/audit.py`, `backend/tests/test_teammate_backlog.py` |
| **Authenticated AI & Prompt Isolation** | `/api/ai-chat` rejects unauthenticated callers (`401`), derives role strictly from verified server session, loads ERP context server-side (never trusting client `accountContext`), and blocks prompt injection. | `frontend/src/server/runtimeMiddleware.ts` |

---

## 2. Pre-Pilot Penetration Testing (VAPT) Plan (CERT-In Empanelled Audit)

Before connecting live consumer PII or SAP IS-U adapters in Tier 1 pilot:

1. **Phase 1 — Automated SAST / DAST & Dependency Audit (Week 1)**
   - Run `pip-audit` + `npm audit` + CodeQL / Semgrep across `backend/` and `frontend/`.
   - Run OWASP ZAP baseline & OpenAPI fuzz scan against `docs/api/openapi.json` (`37` endpoints) testing malformed payloads, oversized uploads (`413`), and NUL/path-traversal filenames (`400`).
2. **Phase 2 — Grey-Box RBAC, IDOR & Auth Boundary Testing (Week 2)**
   - Attempt horizontal & vertical privilege escalation across all 5 roles (`consumer`, `employee`/`officer`, `field`/`engineer`, `management`, `admin`), cross-zone officer reads (`North` vs `South`), reassigned field engineer access revocation, and forged/expired cookies & JWTs.
   - Verify simulated demo SSO (`/auth/sso/login`) and seeded demo accounts are hard-blocked (`RuntimeError` / `403`) when `APP_ENV=production`.
3. **Phase 3 — Infrastructure, Backup Tamper & Rate-Limit Stress Testing (Week 3)**
   - Execute distributed credential-stuffing tests against Redis-backed `/auth/login` (`429` + `Retry-After`), concurrent audit-chain write stress, and 1-byte backup corruption rejection (`restore_drill.sh` + `offsite_replicate.sh`).
4. **Phase 4 — Remediation & Sign-Off Gate (Week 4)**
   - Zero Critical / High findings open; CERT-In clearance certificate archived with UGVCL IT Security Cell prior to subdivision go-live.
