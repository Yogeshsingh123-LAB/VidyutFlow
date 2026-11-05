# VidyutFlow 2.0 — Source Audit Report

**Date:** 05 November 2026  
**Repository:** `Yogeshsingh123-LAB/VidyutFlow`  
**Reference Commit:** `77d2572230f0bc7685518673e40554de441f75e6`  
**Branch:** `backend-integration/phase9-step4d`  
**Author:** Principal Backend Integration Engineer & Source Auditor  
**Scope Lock:** Phases 1–9 (including Step 1, Step 2, Step 3, Step 4A–4D)

---

## 1. Executive Summary & Repository Structure

An exhaustive, line-by-line inspection of all **538 tracked files** was conducted at commit `77d2572230f0bc7685518673e40554de441f75e6`. 

The repository consists of:
- A high-performance **React 19 + TypeScript + Vite + Tailwind CSS** frontend implementing five distinct portals: Consumer, Employee, Field Engineer, Management, and Admin.
- A **FastAPI + SQLAlchemy 2.0 + Pydantic v2** backend with 159 registered endpoints, 29 database models, Alembic migrations, and 5 scikit-learn machine learning models.
- An **offline field synchronization engine** and **meter reading store** utilizing IndexedDB and localStorage with persistent UUID queuing.
- Full **four-language localization** (`en`, `gu`, `hi`, `mr`) across all portals, notifications, and generated documents.
- A complete **Phase 9 Bi-Monthly Billing & Delinquency Lifecycle** (Steps 1, 2, 3, 4A, 4B, 4C, 4D) featuring 2-month progressive slabs, two-page A4 PDF documents, Code 128 barcodes, verification QR codes, RFC 5545 calendar export, daily DPS accrual, formal Section 56 notices, business clock rollover, and 5-bucket delinquency aging.

---

## 2. Technology Stack & Key Dependencies

### 2.1 Backend Environment
- **Framework**: FastAPI `0.115.6` with Starlette `0.41.3` and Uvicorn `0.34.0`
- **Python Version**: Python 3.12 (compatible with 3.12/3.13)
- **Database ORM**: SQLAlchemy `2.0.36`, Alembic `>=1.13.0`
- **Database Drivers**: `psycopg[binary]==3.2.3` (PostgreSQL 16) and Python standard `sqlite3`
- **Authentication & Security**: `python-jose[cryptography]==3.3.0` (HS256 JWT), `bcrypt==4.2.1`, `pyotp>=2.9.0` (TOTP MFA), `email-validator==2.2.0`
- **Caching & Rate Limiting**: `redis==5.2.1` with fallback in-memory sliding window limiter
- **Machine Learning**: `scikit-learn==1.6.0`, `joblib==1.4.2`, `pandas>=2.2.0`

### 2.2 Frontend Environment
- **Framework**: React `19.0.1`, React DOM `19.0.1`, Motion `12.23.24`
- **Build System**: Vite `8.3.5` with `@tailwindcss/vite` and `@vitejs/plugin-react`
- **Data Visualization**: Recharts `3.10.1`, Leaflet `1.9.4`
- **Utilities**: `qrcode==1.5.4`, `sharp==0.35.5`, `tesseract.js==7.0.0`
- **Test Runners**: `tsx` with Node.js built-in `node:assert/strict` and Playwright `@playwright/test==1.64.1`

---

## 3. Core Architecture & Subsystem Inspection

### 3.1 Authentication, RBAC & Session Management
- **Role Model**: FastAPI defines four core database roles: `consumer`, `officer`, `engineer`, `admin`.
- **Portal Role Mapping (`src/services/backendSession.ts`)**:
  - `consumer` -> `consumer`
  - `employee` -> `officer`
  - `field` -> `engineer`
  - `management` -> `admin`
  - `admin` -> `admin`
- **Unified Login (`POST /auth/login`)**: Supports email, employee ID aliases (`EMP-UGVCL-001`, `UGVCL-ENG-01`), and JSON/form payloads. Detects and blocks role mismatches (e.g. Officer attempting Admin entry returns 403 Forbidden).
- **Consumer OTP Login (`POST /auth/consumer/otp/send` & `verify`)**: Mobile-only authentication with anti-bot SVG CAPTCHA challenge, single-use OTP codes, and ownership validation against registered consumer connections.
- **Session Security**: 15-minute access tokens (`HS256`), 7-day rotating refresh tokens with automatic reuse detection (invalidates token family upon replay), server-side session tracking in `user_sessions`, and TOTP MFA for staff.

### 3.2 URL Routing & Proxy Rewrite Conventions
Requests traverse three routing layers:
1. **Vite Development Proxy (`vite.config.ts`)**: Proxies `/api/*` to `http://127.0.0.1:8000`, stripping the `/api` prefix via `rewrite: (p) => p.replace(/^\/api/, '')`.
2. **Production Node Express Server (`src/server/prodServer.ts`)**: Proxies `/api/*` to the FastAPI backend upstream while serving Vite static client assets.
3. **FastAPI Middleware (`ApiVersionPrefixMiddleware` in `backend/app/main.py`)**: Seamlessly strips `/v1/` prefixes so that both unversioned `/requests` and versioned `/v1/requests` route identically without duplicating router registrations.

### 3.3 Monotonic SHA-256 Audit Hash Chain
- **File**: `backend/app/audit.py`
- **Function**: `audit(db: Session, actor, action: str, entity: str = "", entity_id: str = "", detail: str = "")`
- **Hashing Function**:
  ```python
  def _entry_hash(prev_hash: str, *, row_id: str, actor_id: str, actor_role: str, action: str, entity: str, entity_id: str, detail: str, created_at_iso: str) -> str:
      payload = "\x1f".join([prev_hash or "", row_id, actor_id, actor_role, action, entity or "", entity_id or "", detail or "", created_at_iso])
      return hashlib.sha256(payload.encode("utf-8")).hexdigest()
  ```
- **Concurrency & Fork-Proof Guarantee**:
  - In-process: Transaction-scoped `_AUDIT_TX_LOCK` (`threading.RLock`) is acquired upon the first audit log call on a session and held until `db.commit()` or `db.rollback()`.
  - Database-level: `AuditChainHead` with `SELECT ... FOR UPDATE` (PostgreSQL) and a unique monotonic constraint on `AuditLog.chain_seq` prevent concurrent workers from ever committing two rows pointing at the same chain tip.

### 3.4 Work Order & Evidence Data Model
- In SQL (`backend/app/models.py`), `connection_requests` functions as the unified operational record for both new connection applications and complaints.
- Field updates are tracked via `field_updates` (linked by `request_id`).
- Work order evidence is tracked via `WorkOrderEvidence`, where `work_order_id` is stored as a `String(64)` referencing the client work order identifier (e.g. `WO-2026-1102`). There is no separate `work_orders` SQL table; work orders are projected views over `connection_requests` and `field_updates`.

### 3.5 Offline Synchronization Engines
Two distinct offline mechanisms exist:
1. `src/utils/offlineFieldSync.ts`: Service worker queue using localStorage / IndexedDB with deterministic client UUIDs, exponential backoff, conflict detection, and auto-sync on `navigator.onLine`.
2. `src/utils/meterReadingStore.ts`: IndexedDB store dedicated to photo evidence, OCR reads, and manual meter readings during field inspection rounds.

### 3.6 Machine Learning Models (Synthetic Data)
Five scikit-learn models are trained and serialized in `backend/app/ml/models/`:
1. `category_model.joblib`: TF-IDF + LogisticRegression for text categorization.
2. `severity_model.joblib`: TF-IDF + LogisticRegression for complaint severity classification.
3. `sla_model.joblib`: Cost-sensitive RandomForestClassifier (triage threshold 0.38) for SLA breach prediction.
4. `billing_anomaly_model.joblib`: IsolationForest for detecting anomalous consumption spikes, zero-reads, and slab discrepancies.
5. `load_forecast_model.joblib`: GradientBoostingRegressor for 24-hour 11kV Feeder / DTR demand forecasting.

---

## 4. Phase 9 Billing & Delinquency Architecture

The Phase 9 billing implementation in `src/` represents a mature, fully verified utility billing engine:
- **Bi-Monthly Period Logic**: 2-month progressive slab scaling (proportional 2x) for RGPU residential connections, with exact handling of commercial (NRGP), industrial (LTMD), and agricultural (AG) tariffs.
- **Smart Payment Calendar**: Maps monthly and bi-monthly due dates, partial payments, and overdue countdowns. Supports standard RFC 5545 `.ics` export and Google Calendar links.
- **Overdue Surcharge (DPS)**: Daily accrual formula:
  $$\text{DPS} = P \times \left(\frac{R}{100 \times 365}\right) \times D$$
  computed strictly in the `Asia/Kolkata` timezone with 7-day agricultural grace rules.
- **Section 56 Formal Notices**: 15-day statutory countdown tracking (`SERVED` -> `DEADLINE_APPROACHING` -> `DEADLINE_REACHED`). Prohibits automatic physical disconnection.
- **Delinquency Aging**: 5 chronological aging buckets (`Current`, `1–30 Days`, `31–60 Days`, `61–90 Days`, `>90 Days`) with drill-down views by subdivision and tariff category.

---

## 5. Architectural Inconsistencies & Identified Risks

1. **Dual-Auth Story**:
   - *Issue*: Historical documentation referenced separate authentication paths for browser DEMO accounts vs LIVE backend tokens.
   - *Status*: Unified login in `backendSession.ts` and `backend/app/routers/auth.py` resolves this; DEMO credentials now authenticate directly against the live API.
2. **OpenAPI Schema Divergence**:
   - *Issue*: `test_openapi_matches_reviewed_snapshot` fails because recent endpoints (captcha, consumer profile) were added without updating `docs/api/openapi.json`.
   - *Resolution*: During implementation, deliberately regenerate `docs/api/openapi.json` and review against `docs/API_CONTRACT.md`.
3. **Production Mode Logger NameError**:
   - *Issue*: In `backend/app/main.py:224`, `logger.info(...)` is called when `settings.app_env == "production"`, but `logger` is undefined.
   - *Resolution*: Import and configure standard Python `logging` in `backend/app/main.py`.
4. **`sha256sum` Windows Incompatibility**:
   - *Issue*: `backend/tests/test_teammate_backlog.py` calls the external binary `sha256sum`.
   - *Resolution*: Ensure test scripts utilize Python's built-in `hashlib.sha256` or conditionally invoke PowerShell `Get-FileHash` on Windows.
5. **Field Sync Assignment Authorisation**:
   - *Issue*: Several tests in `test_transitions.py` fail with 403 because they attempt `field-sync` without setting `assigned_engineer_id`.
   - *Resolution*: The live backend correctly enforces that only the assigned engineer can submit field work. Test fixtures must set `assigned_engineer_id` properly.

---

## 6. Implementation Roadmap (Milestones M1–M6)

- **M1: Core Bridge & Session Hardening**: Fix `NameError: logger`, reconcile OpenAPI contract snapshot, align registration status codes (400 vs 409), and ensure clean Windows test execution.
- **M2: Connection & Work Order Pipeline**: Connect Consumer application wizard, Employee intake queue, and Admin staff assignment to authoritative PostgreSQL storage.
- **M3: Field Operations & Offline Sync**: Reconcile `field_updates` and `work_order_evidence` with offline UUID deduplication and conflict detection.
- **M4: Phase 9 Authoritative Billing & Surcharge Engine**: Mount backend billing endpoints (`/v1/billing/*`) reflecting the verified Phase 9 Step 1–4D logic.
- **M5: Notifications, Alerts & Audit Verification**: Bind alert centre drawers to `/notifications`, enforce hash chain integrity, and verify backup/restore scripts.
- **M6: Full End-to-End Test Matrix & Documentation**: Execute all CI gates (`pytest`, `npm test`, `npm run build`), verify zero bundle regressions, and finalize audit documentation.

