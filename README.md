# VidyutFlow — Intelligent Utility Workflow, Predictive AI & Operations Platform

> VidyutFlow is a working prototype, not a deployed UGVCL system. Capabilities marked Simulated are not connected to any real UGVCL, SAP, e-Urja, or 1912 system.

| Capability | Status | Notes |
| :--- | :--- | :--- |
| 5 role-based portals | ✅ Built | Consumer, Subdivision Officer, Field Engineer, Executive Management, System Admin |
| 5 workflow templates | ✅ Built | `new_connection`, `load_extension`, `meter_replacement`, `billing_dispute`, `outage_safety` |
| Smart Outage Map & live timeline (Phase 10) | ✅ Built | Leaflet + schematic fallback, role-scoped visibility, citizen GPS/PII redaction (`src/outageMap/*`) |
| Meter reading OCR & bill review (Phase 11) | ✅ Built (Demo store) | Browser-local Tesseract.js WASM OCR, maker-checker employee review, read-only GERC tariff validation |
| Verified field completion & transparency (Phase 13) | ✅ Built | `/v1/evidence/*` + IndexedDB photos, safety exemptions, officer verification gate, sanitized citizen timeline |
| Offline field sync (queue + replay) | ✅ Built (see [docs/OFFLINE.md](docs/OFFLINE.md)) | IndexedDB v3 + `localStorage` queue, `client_uuid` dedupe; no version-vector merge |
| AES-256-GCM document vault & polyglot defense | ✅ Built (application-layer) | `VFENC1` HKDF-SHA256 + AES-256-GCM in `uploads_encrypted/` + anti-polyglot magic-byte validation |
| Hardened Auth & MFA (Cloudflare-aligned) | ✅ Built | 15-min JWTs, `UserSession` server revocation, 384-bit rotating refresh tokens with reuse detection, Staff RFC 6238 TOTP MFA, BOLA isolation |
| SHA-256 audit chain | ✅ Built | Serialized `AuditChainHead` + `GET /v1/requests/audit/verify` |
| 5 ML models | ⚠️ Synthetic-trained (not validated on UGVCL data) | Trained on `backend/app/ml/synthetic.py`; strictly advisory |
| SAP S/4HANA IS-U OData gateway | 🟡 Simulated (is_simulated: true) | SAP-shaped OData v4 mock (simulated; not connected to SAP) |
| e-Urja / 1912 CRM fan-out | 🟡 Simulated | 3-System fan-out mock (simulated) (`is_simulated: true`) |
| PostgreSQL production mode | 🟡 Configured, not load-tested | Wired in `docker-compose.yml` via `DATABASE_URL` |
| Disaster recovery | 🟡 Drill script only (not geo-redundant) | Local SQLite backup, SHA-256 checksum & restore drill |
| Hardware / network modernisation | ❌ Out of scope | Software-only prototype; see [docs/INFRA_PROPOSAL.md](docs/INFRA_PROPOSAL.md) |

If evaluating against PS000125, read [docs/PS_GAP_ANALYSIS.md](docs/PS_GAP_ANALYSIS.md) before the feature list.

---

> **Problem Statement `PS000125`** · *Uttar Gujarat Vij Company Limited (UGVCL) · Energy Department · Software*
>
> *Modernizing Electricity Utility Operations Through Workflow Automation, AI Decision-Support, Enterprise ERP Interoperability (Simulated), Application-Layer Security & Backup Tooling*

---

## 1. Executive Summary

**VidyutFlow** is a working prototype addressing subdivision workflow handoffs across **5 operational portals** (`Consumer`, `Subdivision Officer`, `Field Engineer`, `Executive Management`, `System Admin`), **5 seeded configurable utility workflow templates** (`new_connection`, `load_extension`, `meter_replacement`, `billing_dispute`, `outage_safety`, plus Admin-created custom templates), **5 trained `scikit-learn` decision-support & predictive models** (validated on unseen synthetic holdouts at `0.8824` accuracy (synthetic holdout) plus a **team-authored 54-item zero-overlap synthetic/OOD sanity-check set at `0.9074` accuracy (synthetic holdout)**), a **SAP-shaped OData v4 mock (simulated; not connected to SAP)**¹, **offline-resilient field inspection sync**, and **application-layer security + backup script (infra hardening out of scope)**.

- **Zero manual re-entry within prototype portals**: `0` applicant fields re-typed across staff stages; `0` manual routing handoffs; `3` staff transitions from submission to completion ([`docs/WORKLOAD_MEASUREMENT.md`](docs/WORKLOAD_MEASUREMENT.md)).
- **Multilingual citizen & staff UX**: Full 4-language parity across **English, Gujarati (`ગુજરાતી`), Hindi (`हिन्दी`), and Marathi (`मराठी`)**.
- **100% tested API contract**: **61 paths / 66 HTTP operations** dual-served at `/` and `/v1/*` (`X-API-Version: v1`), snapshot-enforced against [`docs/api/openapi.json`](docs/api/openapi.json) with **`66 / 66 (100.0%)` endpoint test coverage** verified in [`docs/verification/r4-api-endpoint-coverage.txt`](docs/verification/r4-api-endpoint-coverage.txt).

---

## 2. Architecture & PS000125 Coverage Matrix

VidyutFlow runs as a **two-tier web & API architecture** with an offline-capable browser edge layer:

1. **Browser PWA & Edge Layer (`src/`, `public/sw.js`)**: Five role-based React 19 + TypeScript + Tailwind 4 portals, Service Worker shell caching, IndexedDB v3 offline queue (`vidyutflow_offline_db`), Smart Outage Map (`src/outageMap/*`), and on-device Tesseract.js WASM OCR in a Web Worker.
2. **Node / Vite Runtime Gateway (`:3000` dev / `:5173` prod — `src/server/*`, `api/index.ts`)**: Issues `HttpOnly; SameSite=Lax` portal cookies (`vidyutflow_sid`), runs the role-grounded AI proxy (`/api/ai-chat` with 3,500ms Gemini timeout + deterministic Grounded Engine fallback), serves Phase 11 meter-reading review endpoints (`/api/meter-readings/*`), and proxies `/api/*` & `/api/v1/*` same-origin to FastAPI.
3. **FastAPI Core Control Plane (`:8008` — `backend/app/*`, `61` paths / `66` HTTP operations)**: Short-lived 15-min JWT + rotating 384-bit refresh sessions (`backendSession.ts` bridge), RBAC/BOLA & zone isolation, configurable workflow engine, Phase 13 work-order evidence (`/v1/evidence/*`), `VFENC1` AES-256-GCM encrypted upload vault, SHA-256 `AuditChainHead`, 5 `scikit-learn` models + local `TF-IDF` Policy RAG, and simulated ERP connectors over SQLite / PostgreSQL.

```mermaid
flowchart LR
    USERS["Consumers · Officers · Field staff · Management · Admins"] --> PWA["VidyutFlow PWA<br/>React 19 + TS + Tailwind 4<br/>Outage Map · Local Tesseract WASM OCR"]
    PWA -. "Offline queue & photos" .-> IDB["IndexedDB v3 + localStorage<br/>client_uuid sync queue"]
    PWA -->|"/api/auth · /api/ai-chat · /api/meter-readings<br/>(HttpOnly vidyutflow_sid + CSRF)"| NODE["Node / Vite Runtime Gateway<br/>prodServer.ts · runtimeMiddleware.ts"]
    IDB -->|"Reconnect & idempotent replay"| NODE
    NODE -->|"Same-origin proxy /api/* & /api/v1/*<br/>(Verified Bearer + 15m refresh rotation)"| API["FastAPI Control Plane (:8008)<br/>61 paths / 66 operations"]
    API --> WORK["Workflows & Evidence<br/>Requests · /v1/evidence · AuditChainHead"]
    API --> SUPPORT["Decision support<br/>5 sklearn models · TF-IDF Policy RAG"]
    API --> ERP["ERP gateway (simulated)<br/>OData v4 & 3-system fan-out mocks"]
    WORK --> DATA[("SQLite demo / PostgreSQL 16<br/>+ VFENC1 AES-256-GCM Vault")]
    SUPPORT --> DATA
    ERP --> DATA
```

| Project part | Purpose |
| :--- | :--- |
| **Browser PWA (`src/`)** | Five role-based portals (`Consumer`, `Subdivision Officer`, `Field Engineer`, `Management`, `Admin`), Phase 10 Smart Outage Map, and on-device Tesseract.js meter OCR. |
| **Node Runtime Gateway (`src/server/`)** | Serves compiled SPA assets (`prodServer.ts`) or Vite dev middleware, `HttpOnly` portal auth (`/api/auth/*`), role-scoped AI co-pilot proxy (`/api/ai-chat`), Phase 11 meter review (`/api/meter-readings/*`), and FastAPI reverse proxy. |
| **FastAPI Control Plane (`backend/app/`)** | Canonical workflow state, 15-min JWT + refresh rotation, Staff TOTP MFA, Phase 13 work-order evidence (`/v1/evidence/*`), `VFENC1` encrypted vault, SHA-256 audit chain, analytics, alerts, and simulated ERP endpoints. |
| **Offline Field Sync (`offlineFieldSync.ts`)** | Persists field inspections, meter readings/photos, and completion reports in IndexedDB v3 + `localStorage` and replays idempotently via `client_uuid` (see [`docs/OFFLINE.md`](docs/OFFLINE.md)). |
| **Decision Support (`backend/app/ml/`)** | Five synthetic-trained `scikit-learn` models, `TF-IDF` policy RAG, and optional server-side `Gemini` synthesis advise staff; authorized human officers make all final decisions. |
| **Data & Recovery (`scripts/`, `backend/`)** | SQLite supports local demos; PostgreSQL 16 is configured in `docker-compose.yml`. Local backup, replication, and restore drill scripts verify SHA-256 snapshot checksums. |

### PS000125 coverage at a glance

| PS000125 need | VidyutFlow response | Status |
| :--- | :--- | :---: |
| Reduce repeated entry and manual handoffs | Shared request records inside VidyutFlow, automated validation, routing, and assignment. | **Partly built** |
| Provide an integrated ERP and portal experience | Five role-based portals and a simulated API-based ERP gateway (`is_simulated: true`); not connected to real UGVCL systems. | **Simulated** |
| Improve security and accountability | Application-layer role-scoped access, encrypted document storage, audit chain, and SIEM event export. | **Partly built** |
| Support field work with limited connectivity | Offline field queue with authenticated, duplicate-safe sync (no CRDT conflict merge; see [`docs/OFFLINE.md`](docs/OFFLINE.md)). | **Built** |
| Give staff timely operational information | Dashboards, analytics, alerts, and SLA risk views. External SMS/email alert channels are simulated. | **Partly built** |
| Modernize infrastructure and disaster recovery | Local backup, replication, and restore drill scripts are included; physical infrastructure is out of scope ([`docs/INFRA_PROPOSAL.md`](docs/INFRA_PROPOSAL.md)). | **Proposal / Drill** |
| Enable AI and future integration | Five synthetic-trained advisory models, policy assistant, and versioned APIs; model outputs do not approve or reject requests. | **Partly built** |

**Status guide:** See [`docs/PS_GAP_ANALYSIS.md`](docs/PS_GAP_ANALYSIS.md) for the blunt requirement-by-requirement gap matrix and [`docs/REQUIREMENT_MAPPING.md`](docs/REQUIREMENT_MAPPING.md) for repo file references.

---

## 3. Five Trained `scikit-learn` Decision-Support & Predictive Models

> **Provenance & Honesty Boundary:** All 5 models are trained on **synthetic data** (`backend/app/ml/synthetic.py`) with **unseen source-template holdout** so zero template phrasings leak between train and test splits. AI is strictly **advisory (`models_can_approve_or_reject = False`)** — every sanction approval or rejection requires an authenticated human officer ([`docs/ML_REPORT.md`](docs/ML_REPORT.md), [`docs/AI_GOVERNANCE.md`](docs/AI_GOVERNANCE.md)).

| # | Model | Pipeline | Held-Out Synthetic Metric | Majority Baseline | Live Endpoint / Screen |
| :-: | :--- | :--- | :--- | :--- | :--- |
| 1 | **Category Triage** | Word `(1,2)` `TfidfVectorizer` + `LogisticRegression` | **Accuracy `0.8824` (synthetic holdout) · Team-authored synthetic/OOD set `0.9074` (`49/54`, synthetic holdout)** | `0.1667` | `POST /v1/requests` auto-routing |
| 2 | **Severity & Safety Escalation** | Balanced `TF-IDF` + `LogisticRegression` + life-safety rule guardrail | **Balanced Accuracy `0.8750` (synthetic holdout) · `CRITICAL` Recall `100%` (`9/9`, synthetic holdout)** | `0.3333` | Emergency queue prioritization |
| 3 | **Calibrated SLA Breach Risk** | `OneHotEncoder` + Cost-Sensitive `RandomForest` (`threshold = 0.38`) | **Breach Recall `0.8913` (synthetic holdout) · Accuracy `0.8350` (synthetic holdout)** | `0.5400` | `LiveSlaRiskWatchlist` + reason codes |
| 4 | **Billing Anomaly Detector** | `IsolationForest` + deterministic GERC RGPU tariff-slab verifier | **Accuracy `0.9511` (synthetic holdout) · Anomaly Recall `1.000` (synthetic holdout) · F1 `0.8706` (synthetic holdout)** | `0.8356` | `POST /v1/assistant/billing-anomaly` & `LivePredictiveDecisionPanel` |
| 5 | **24h Feeder / DTR Load Forecaster** | `OneHotEncoder` + `GradientBoostingRegressor` | **`R² = 0.9790` (synthetic holdout) · `MAE = 8.89 kVA` (synthetic holdout)** | Mean kVA | `GET /v1/assistant/load-forecast` & 24h kVA chart |

These metrics reflect performance on a team-generated synthetic holdout set. They are not evidence of production performance on UGVCL data.

### Hybrid Operational Assistant (`TF-IDF` Policy RAG + Live SQL + Optional `Gemini`)
- **Offline-first deterministic core (`POST /v1/assistant/chat`)**: Answers live operational queries (including **zone-ranked SLA breach analysis**: *"Which zone has highest breach risk and why?"*), consumer status checks, and cited UGVCL policy passages via local `TfidfVectorizer` cosine retrieval (`backend/data/policies/*.md`) with zero external API dependency.
- **Optional server-side Gemini synthesis**: When `GEMINI_API_KEY` is set on the server, conversational synthesis runs with a strict `3,500ms` timeout and read-only tool grounding, explicitly badged in the UI.

---

## 4. Application-Layer Security, Hardening & Audit Controls

- **Phase 1 — Authentication, Session Security & Staff MFA**:
  - 15-minute JWT access tokens with standard RFC 7519 claims (`jti`, `iss`, `aud`, `token_type`).
  - Active session tracking via database-backed `UserSession` model with server-side revocation on logout (`POST /v1/auth/logout`) and password change.
  - 384-bit cryptographically secure rotating refresh tokens (`POST /v1/auth/refresh`) stored as SHA-256 digests; automatic family revocation upon detected token reuse.
  - Staff TOTP MFA (RFC 6238) with AES-256-GCM encrypted secrets, QR provisioning (`POST /v1/auth/mfa/setup`), verification (`POST /v1/auth/mfa/verify`), and 8 single-use hashed emergency recovery codes.
  - Distributed-ready login rate limiting (5 failed attempts per 300s window) with IP and account lockout; generic registration responses reducing username enumeration.
- **Phase 2 — Authorization & BOLA/IDOR Access Control**:
  - Horizontal consumer isolation (Broken Object Level Authorization defense) across all connection requests.
  - Premise IDOR protection concealing resource existence with HTTP 404 for unauthorized tenant queries.
  - Vertical privilege escalation blocks preventing non-admin role modification; case-insensitive subdivision officer zone containment (`func.lower()`); field engineer assignment containment (unassigned engineers receive HTTP 403).
- **Phase 3 — File Upload Security & Cryptographic Envelope**:
  - Strict magic-byte validation (`%PDF-`, `\x89PNG\r\n\x1a\n`, `\xff\xd8\xff`, and valid UTF-8 text); anti-polyglot inspection blocking executable HTML/XML/SVG script tags in uploaded documents.
  - Filename sanitization stripping double-extensions (`deed.php.pdf` $\to$ `deed_php.pdf`), path traversals, and non-whitelisted characters.
  - NIST SP 800-38D AES-256-GCM envelope encryption at rest (`VFENC1`) with AAD bound to filename and zero plaintext stored on disk.
  - Secure document retrieval endpoint (`GET /v1/requests/{request_id}/document`) with BOLA authorization, `nosniff`, `Content-Disposition: attachment`, and `Cache-Control: no-store`.
- **Phase 4 — Input Validation, Injection Defense & Model Hardening**:
  - Stored XSS defense via `sanitize_untrusted_text` stripping dangerous HTML tags, DOM event handlers (`onerror=`, `onload=`), and active schemes (`javascript:`, `vbscript:`, `data:`).
  - Strict 6-digit Indian PIN code format enforcement (`[1-9][0-9]{5}`) yielding `NEEDS_CORRECTION` on invalid format in workflow requests and HTTP 422 in premise profiles.
  - 100% ORM parameterized query coverage across all database operations (SQL injection immunity).
- **Phase 5 — Audit Log Integrity & Anti-Repudiation**:
  - Tamper-evident sequential SHA-256 hash chain: $\text{entry\_hash} = \text{SHA-256}(\text{canonical\_payload} + \text{prev\_hash})$ with `AuditChainHead` single-row lock anchor preventing multi-process chain forks.
  - Comprehensive audit coverage including `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, and KYC `DOCUMENT_DOWNLOADED`.
  - On-demand verification walk (`GET /v1/requests/audit/verify`) detecting modified, reordered, or deleted audit rows.
  - SIEM ArcSight/Wazuh CEF (`CEF:0|UGVCL|VidyutFlow|1.0|...`) and JSON export (`GET /v1/system/siem-events`) + cryptographic self-test (`GET /v1/system/security-posture`).
- **Phase 6 — Transport Security & Denial-of-Service Defense**:
  - Request body length DoS limit: FastAPI middleware aborts JSON payloads exceeding 2 MiB (`max_json_body_bytes = 2097152`) with HTTP 413, and Node gateway streams cap `/api/auth/*` (16 KiB) and `/api/ai-chat` (50 KiB) buffers immediately.
  - Restrictive `Permissions-Policy`: `camera=(), microphone=(), geolocation=(self)` on FastAPI JSON APIs and `camera=(self), microphone=(), geolocation=(self)` on the Node PWA gateway for same-origin meter/evidence photo capture.
  - Hardened `Content-Security-Policy` with `'wasm-unsafe-eval'` (permitting local Tesseract.js WASM OCR without `'unsafe-eval'`), `object-src 'none'`, and `frame-ancestors 'none'`.
  - Production `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` and CORS wildcard prohibition with credentials.
- **Simulated ERP Gateway & Backup Drill Scripts**:
  - SAP-shaped OData v4 mock (simulated; not connected to SAP) (`/v1/erp/sap-odata/*`¹) + 3-System fan-out mock across mock SAP FI-CA/IS-U, e-Urja CIS Billing, and GUVNL 1912 Grievance CRM targets via `POST /v1/erp/gateway/propagate/{id}`.
  - Self-contained `POST /v1/system/dr-failover-drill`, `cold_start_dr_proof.py`, `backup.sh`, `offsite_replicate.sh`, and `restore_drill.sh` verifying SQLite snapshot checksums and 1-byte tamper rejection.
- **Infrastructure Modernisation Proposal (Out of Delivered Scope)**: Proposed reference architecture and indicative BOM documented in [`docs/INFRA_PROPOSAL.md`](docs/INFRA_PROPOSAL.md) and [`docs/INFRASTRUCTURE_BOM_SOURCES.md`](docs/INFRASTRUCTURE_BOM_SOURCES.md).
- **Audit Verification Report**: Complete Cloudflare-aligned remediation matrix and findings documented in [`docs/SECURITY_AUDIT_REPORT.md`](docs/SECURITY_AUDIT_REPORT.md).

> ¹ *Simulation disclosure:* All OData v4, CIS Billing, and 1912 CRM endpoints execute against deterministic in-repo mocks (`is_simulated: true` in API metadata) and are not connected to any real SAP or UGVCL server.

---

## 5. Quick Start & Demo Credentials

### Option A — Local Development (Backend + Root Frontend)

```bash
# 1. Backend (FastAPI on :8008 — auto-seeds demo users, 5 workflow templates & trains 5 sklearn models)
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt -r backend/requirements-dev.txt
cd backend && ../.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8008

# 2. Frontend (run from repository root — Vite + Node runtime gateway on :3000, proxying /api/* -> :8008)
npm install && npm run dev
```

*(On Windows, you can also run `run.bat dev`, `run.bat test`, or `run.bat up` from the repository root.)*

### Option B — Docker Compose

```bash
docker compose up --build
```

### Demo Accounts (Seeded Locally)

The Welcome screen provides **one-click role cards** (`@vidyutflow.demo` / `Demo@12345`) for the Node portal runtime, and FastAPI seeds matching `@vidyut.local` accounts for direct backend / Swagger (`/docs`) testing:

| Portal Role | Web Portal Login (`Demo@12345`) | FastAPI Direct Login | Scope |
| :--- | :--- | :--- | :--- |
| **Consumer** | `consumer@vidyutflow.demo` | `consumer@vidyut.local` (`Consumer@123`) | Own requests, saved premises, meter OCR, bill check, complaint timeline |
| **Subdivision Officer** | `employee@vidyutflow.demo` | `officer@vidyut.local` (`Officer@123`) | `North` zone queue, approvals, evidence & meter review, OData v4 mock sync |
| **Field Engineer** | `field@vidyutflow.demo` | `engineer@vidyut.local` (`Engineer@123`) | Assigned `North` inspections, offline IndexedDB v3 queue, field evidence |
| **Management** | `management@vidyutflow.demo` | `admin@vidyut.local` (`Admin@123`) | Executive analytics, SLA risk watchlist, outage map KPIs, quality metrics |
| **System Admin** | `admin@vidyutflow.demo` | `admin@vidyut.local` (`Admin@123`) | All zones, AI Governance, 24h Load Forecast, Staff/Template Studio, SIEM stream |

---

## 6. Automated Verification Gates

```bash
# Backend: 154 pytest tests (61 paths / 66 ops OpenAPI contract, Phases 1-6 security hardening, Phase 13 evidence RBAC, magic-byte vault, 5 ML models, OData v4 mock, SIEM, backup drill)
cd backend && ../.venv/bin/pytest -q tests

# Frontend (from repository root): TypeScript strict check + 41 end-to-end/unit/i18n/security suites + production bundle build
npm run lint && npm test && npm run build
```

> **CI workflow template (`docs/ci.yml`):** Ready-to-enable GitHub Actions workflow template mirroring `make coverage`, `make train`, `make dr-proof`, and `make build`. Stored at `docs/ci.yml` because fine-grained `contents`-only PATs block pushing `.github/workflows/*` — copy to `.github/workflows/ci.yml` via the GitHub Web UI or push with a `workflow`-scoped token to enable hosted Actions runs.

---

## 7. Key Documentation Index

- [`docs/SECURITY_AUDIT_REPORT.md`](docs/SECURITY_AUDIT_REPORT.md) — Cloudflare-aligned Security Audit & Hardening Remediation Report (Phases 1–6)
- [`docs/SECURITY.md`](docs/SECURITY.md) & [`SECURITY.md`](SECURITY.md) — Application-layer threat model, AES-256-GCM field/vault encryption & SIEM `CEF:0`
- [`docs/PENETRATION_TEST_PLAN.md`](docs/PENETRATION_TEST_PLAN.md) — CERT-In aligned VAPT test plan across authentication, authorization, and cryptographic layers
- [`docs/PS_GAP_ANALYSIS.md`](docs/PS_GAP_ANALYSIS.md) — Blunt requirement-by-requirement gap analysis against official `PS000125`
- [`docs/OFFLINE.md`](docs/OFFLINE.md) — Offline field sync: what is implemented vs. unimplemented conflict/version-vector gaps
- [`docs/PHASE11_METER_READINGS.md`](docs/PHASE11_METER_READINGS.md) — Phase 11 on-device Tesseract.js meter reading OCR, maker-checker review & read-only bill check
- [`docs/PHASE13_VERIFIED_COMPLETION_CONTRACT.md`](docs/PHASE13_VERIFIED_COMPLETION_CONTRACT.md) — Phase 13 verified field work completion, `/v1/evidence/*` RBAC & citizen timeline sanitization
- [`docs/INFRA_PROPOSAL.md`](docs/INFRA_PROPOSAL.md) — Infrastructure modernisation proposal (explicitly not delivered by prototype)
- [`docs/PS000125_OFFICIAL.md`](docs/PS000125_OFFICIAL.md) — Verbatim official problem statement
- [`docs/REQUIREMENT_MAPPING.md`](docs/REQUIREMENT_MAPPING.md) — Detailed 12-area PS000125 mapping & honesty boundaries
- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) & [`docs/api/openapi.json`](docs/api/openapi.json) — OpenAPI 3.1.0 specification (61 paths / 66 operations Dual-served `/` and `/v1`)
- [`docs/ML_REPORT.md`](docs/ML_REPORT.md) — 5-model `scikit-learn` evaluation (`0.9074` accuracy (synthetic holdout) on team-authored synthetic/OOD sanity-check set) & human-approval governance
- [`docs/DISASTER_RECOVERY.md`](docs/DISASTER_RECOVERY.md) — Local SQLite backup, SHA-256 checksum & restore drill scripts
- [`docs/TEAM_ROLES.md`](docs/TEAM_ROLES.md), [`docs/VIVA_QUESTION_BANK.md`](docs/VIVA_QUESTION_BANK.md) & [`docs/DEFENCE_QA.md`](docs/DEFENCE_QA.md) — 5-member viva bank & Q&A
