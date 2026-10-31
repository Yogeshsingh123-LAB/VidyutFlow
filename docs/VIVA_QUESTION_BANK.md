# VidyutFlow Viva Question Bank — All 5 Roles (Basic → Advanced)

> **Verified 1:1 Against Repository Code (`main`):**
> - **Workflow templates (`backend/app/workflow_templates.py`)**: **5 seeded** (`new_connection`, `load_extension`, `meter_replacement`, `billing_dispute`, `outage_safety`), plus Admin-created custom templates (`POST /v1/workflows/templates`).
> - **Security headers (`backend/app/main.py`)**: `Content-Security-Policy` (`default-src 'self'; frame-ancestors 'none'; base-uri 'self'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, and `Strict-Transport-Security` in `APP_ENV=production`.
> - **Cookies (`authService.ts` & `routers/auth.py`)**: `HttpOnly; SameSite=Lax` (`Secure` in production), paired with in-memory FastAPI bearer bridge (`backendSession.ts`).
> - **Audit hash chain (`backend/app/audit.py`)**: Starts from empty string `prev_hash = ""` (`chain_seq` `UNIQUE`, serialized via `AuditChainHead`).
> - **Exact ORM / endpoint symbols**: `ConnectionRequest.consumer_id`, `FieldUpdate.client_uuid`, `create()` (`routers/requests.py:L62`), `SubdivisionZone` (`North` and `South` seeded in DB; Admins can add zones).
> - **Workload measurement (`docs/WORKLOAD_MEASUREMENT.md`)**: `12` consumer fields entered once, `0` staff re-entries, `3` staff transitions (`FIELD_VERIFIED` → `APPROVED` → `COMPLETED`); the `23`-field disconnected baseline is an **assumed comparison baseline** (wall-clock savings are a pilot measurement target).

| Role | Owner | Scope | Open These Files First |
| :-: | :--- | :--- | :--- |
| **1** | **Yogesh** | Backend control plane, workflow engine, simulated ERP gateway | `backend/app/workflow.py`, `transitions.py`, `access.py`, `routers/requests.py`, `routers/erp.py` |
| **2** | **Utsav** | 5 portals, 4 languages (`en`/`gu`/`hi`/`mr`), offline Field PWA | `frontend/src/utils/backendSession.ts`, `utils/offlineFieldSync.ts`, `context/AppContext.tsx` |
| **3** | **Aakash** | 5-model `scikit-learn` suite, local TF-IDF RAG, AI governance | `backend/app/ml/train.py`, `ml/predict.py`, `ml/predictive_services.py`, `ml/governance.py` |
| **4** | **Sandip** | Security, `VFENC1` vault, `AuditChainHead`, backup/restore drill, CI | `backend/app/uploads.py`, `audit.py`, `security.py`, `main.py`, `tests/conftest.py` |
| **5** | **Arnav** | `PS000125` requirement mapping, costed BOM, workload & demo flow | `docs/REQUIREMENT_MAPPING.md`, `INFRASTRUCTURE_BOM_SOURCES.md`, `WORKLOAD_MEASUREMENT.md` |

---

## Role 1 — Backend Control Plane, Workflow Engine & ERP Gateway (Yogesh)

### Level 1 — Basics
1. **What problem does VidyutFlow solve?** — Citizens, officers, engineers, and billing/ERP systems re-type the same data, files move manually between desks, field work stalls without cellular signal, and SLA breaches appear late. One citizen submission feeds every role: *"Enter Once, Use Everywhere."*
2. **What is the backend stack and why?** — FastAPI, SQLAlchemy 2, Pydantic v2. Runs zero-config on SQLite locally and on PostgreSQL 16 in Docker Compose via `DATABASE_URL` with identical ORM models.
3. **What are all request statuses?** — `SUBMITTED`, `NEEDS_CORRECTION`, `ROUTED`, `ASSIGNED`, `IN_PROGRESS`, `FIELD_VERIFIED`, `APPROVED`, `BLOCKED`, plus terminal `COMPLETED` and `REJECTED` (`transitions.py`).
4. **What are the backend roles vs. frontend portals?** — Backend roles: `consumer`, `officer`, `engineer`, `admin`. Portals: `Consumer`, `Employee/Officer`, `Field`, `Management`, and `Admin`.
5. **Which workflow templates are seeded?** — **5 templates** in `workflow_templates.py`: `new_connection`, `load_extension`, `meter_replacement`, `billing_dispute`, and `outage_safety` (Admins can create more via `POST /v1/workflows/templates`).
6. **What is the SLA per severity?** — `CRITICAL` `24h`, `HIGH` `48h`, `MEDIUM` `72h`, `LOW` `120h` (`SLA_HOURS`). Template `sla_hours` overrides default, except `CRITICAL` is always capped at `24h`.

### Level 2 — Code Walkthrough
7. **Walk through what happens on `POST /v1/requests`.** — `create()` (`routers/requests.py:L62`) calls `run_workflow()` (`workflow.py:L62`): fetches `WorkflowTemplate`, classifies `category` + `severity` (`classify_text()`), sets `priority`, runs `validation_issues()` (10-digit phone, load `>0` and `<=100 kW`, address, required document), sets `sla_due_at`, clamps load for `sla_risk()` + reason strings. If invalid → `NEEDS_CORRECTION`; if valid → routes to active zone `officer` and (if `require_field_visit`) active zone `engineer` (`ASSIGNED`, or `ROUTED` if no engineer yet), and writes a hash-chained `AuditLog` row in the same transaction.
8. **Why set `NEEDS_CORRECTION` instead of returning HTTP `400` on business-rule issues?** — Preserves the citizen's application with plain-language `validation_issues` so they can fix missing documents or review high loads (`>100 kW`) without losing work.
9. **How does RBAC scope data (`access.py`)?** — `consumer` sees `ConnectionRequest.consumer_id == user.id`; `engineer` sees `assigned_engineer_id == user.id`; `officer` sees `zone == user.zone` (blank zone fails closed and sees nothing); `admin` sees all. KPIs and `/assistant/chat` reuse `visible_requests()`.
10. **How do `/v1/...` and plain paths both work?** — `ApiVersionPrefixMiddleware` (`main.py:L187`) rewrites `/v1/*` to canonical routes and stamps `X-API-Version: v1`. `test_api_contract.py` locks all `50` paths / `55` operations against `docs/api/openapi.json`.
11. **How are zones validated?** — Zones are DB rows (`SubdivisionZone`, seeded with `North` and `South`; extensible via `POST /v1/staff/zones`). Unknown zones return HTTP `422` listing valid active zones.

### Level 3 — Concurrency & Edge Cases
12. **Two officers click `APPROVED` and `REJECTED` at the same millisecond — what happens?** — `apply_transition()` (`transitions.py:L33`) runs an atomic compare-and-swap `UPDATE ... WHERE id = :id AND status = :old AND updated_at = :old`. One succeeds (`1` row); the second updates `0` rows, rolls back, and gets HTTP `409 Conflict`.
13. **How is offline field sync idempotent?** — `FieldUpdate.client_uuid` is `UNIQUE`. Replaying the same UUID from the same engineer/request returns `duplicate: true` with zero state/audit mutation; concurrent duplicate races catch `IntegrityError`; reusing another engineer's UUID returns `409`.
14. **Can `POST /v1/requests/field-sync` approve a request?** — No. Field sync only permits `FIELD_VERIFIED`, `COMPLETED`, or `BLOCKED`; `APPROVED` and `REJECTED` require an officer/admin on `PATCH /requests/{id}/status`.
15. **What happens if a zone has no active engineer?** — Request stays `ROUTED`. When Admin activates/assigns an engineer to that zone (`PATCH /v1/staff/members/{id}`), waiting `ROUTED` requests in that zone are claimed automatically.

### Level 4 — Judge Traps
16. **"UGVCL already owns SAP and e-Urja. Why use your app?"** — Never replaces them (`replaces_existing_erp: false`). Sits in front as a workflow & orchestration layer: `/v1/erp/gateway/propagate/{id}` maps 1 approved request into SAP IS-U, e-Urja billing, and 1912 CRM payloads (`0` re-typed fields), and `/v1/erp/reconcile` detects master-data drift.
17. **"Is your SAP gateway connected to real SAP?"** — No (`is_simulated: true` on every response). It is a **SAP-shaped OData v4 mock (simulated; not connected to SAP)** (`$metadata`, `ServiceOrders`, `inbound-ack`) running against an in-repo simulated target. Always say **"SAP-shaped OData v4 mock (simulated; not connected to SAP)"**, never *"integrated"*.
18. **"What happens at 100,000 requests/day?"** — Today it is a single FastAPI service (`login_limit.py` uses Redis `INCR` + `TTL` when `REDIS_URL` is configured, as in Docker Compose, with an in-memory fallback — tested with a fake Redis client rather than a live Redis server) and synchronous SQLite/PostgreSQL writes. High-throughput scale-out (PostgreSQL HA, live Redis cluster load-testing, async worker queue, multiple pods) is our Tier 2/3 roadmap.

---

## Role 2 — Portals, 4 Languages & Offline Field PWA (Utsav)

### Level 1 — Basics
1. **Frontend stack?** — React 19, TypeScript (`tsc --noEmit`), Vite, Tailwind CSS 4, plus standalone Node production server (`prodServer.ts`).
2. **Portals and languages?** — `Consumer`, `Employee/Officer`, `Field`, `Management`, `Admin` across `English`, `Gujarati`, `Hindi`, and `Marathi`.
3. **Why Gujarati?** — UGVCL serves North Gujarat where citizens and field linemen read Gujarati first.
4. **How do dashboards refresh?** — Polling every `45 s` (*"live on refresh"*), not WebSockets.

### Level 2 — Implementation
5. **How is initial load kept small?** — Lazy-loaded portal and i18n Rollup chunks (`~122–253 kB` raw / `~26–66 kB` gzipped).
6. **Where does offline sync live?** — `frontend/src/utils/offlineFieldSync.ts` + `FieldPortal.tsx`: queues inspections locally with a UUIDv4 `client_uuid` while offline, lets engineers inspect/retry/discard items, and flushes to `/v1/requests/field-sync` on reconnect.
7. **Where is live logic inside `AppContext.tsx` (~6,000 lines)?** — Lines `1–1176` are static demo/fallback fixtures; `AppProvider` starts at `L1177`; protected `/api/auth/me` check is near `L3609`; server login is near `L4153`; new live widgets live in separate `src/components/common/Live*.tsx` files.

### Level 3 — Browser Security & State
8. **Where are auth tokens stored?** — Zero tokens in `localStorage` or `sessionStorage`. `backendSession.ts` purges legacy storage keys on load and holds the FastAPI bearer token strictly in module memory, while the Node portal session uses an `HttpOnly; SameSite=Lax` cookie (`vidyutflow_sid`).
9. **What happens if two tabs log into different roles?** — `backendSession.ts` listens on `BroadcastChannel` and `visibilitychange`, re-verifies `/api/auth/me` vs FastAPI `/auth/me`, and fails closed immediately on any email or role mismatch.

### Level 4 — Judge Traps
10. **"Why two auth systems (Node cookie + FastAPI JWT)?"** — Node BFF guards portal rendering + `/api/ai-chat` (optional Gemini), while FastAPI guards workflow/ML/ERP endpoints; `backendSession.ts` binds them in memory and fails closed on mismatch. Because Node in-memory sessions vanish on restart and don't scale across pods, production consolidates into shared Redis + Gujarat Parichay OIDC.
11. **"Does offline queue survive clearing site data?"** — No; device-queued unsynced items live in browser storage until synced, whereas once synced the server record is permanent and replay-safe.

---

## Role 3 — 5-Model ML Suite, Hybrid Assistant & Governance (Aakash)

### Level 1 — Basics
1. **Which 5 models exist?** — `scikit-learn` (`train.py`): (1) Category classifier, (2) Severity classifier, (3) SLA breach predictor, (4) `IsolationForest` billing anomaly detector, (5) `GradientBoostingRegressor` 24h feeder-load forecaster.
2. **Can AI approve or reject a request?** — Never (`models_can_approve_or_reject = False`). Officers decide.
3. **Why TF-IDF + Logistic Regression instead of BERT/LLM per ticket?** — Millisecond CPU inference, zero internet/API-key dependency, inspectable weights, and zero per-ticket cost.

### Level 2 — Exact Hyperparameters (`backend/app/ml/train.py`)
4. **Exact hyperparameters & synthetic holdout scores?**
   - **Category & Severity (`L80–89`)**: `TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)` + `LogisticRegression(max_iter=1000, C=2.0, class_weight="balanced")` → Category **`0.8824`** (baseline `0.1667`), Severity balanced **`0.8750`**.
   - **SLA Breach (`L109–127`)**: `RandomForestClassifier(n_estimators=250, class_weight={0: 1, 1: 2.0}, min_samples_leaf=2, random_state=42)` at **`SLA_TRIAGE_THRESHOLD = 0.38`** → **`0.8913` breach recall**, `0.8350` accuracy (baseline `0.5400`).
   - **Billing Anomaly (`L136–144`)**: `IsolationForest(n_estimators=200, contamination=0.06, random_state=42)` fit on normal rows + GERC RGPU slab verifier (`predictive_services.py:L34`) → **`0.9511` accuracy**, **`1.000` recall**.
   - **24h Feeder Load (`L151–158`)**: `GradientBoostingRegressor(n_estimators=220, max_depth=4, learning_rate=0.06, random_state=42)` → **`R² = 0.9790`**, `MAE = 8.89 kVA` (smooth synthetic curve — not claimed as real feeder accuracy).
5. **How is train/test leakage prevented?** — Whole source templates (`[-1]` per class, `train.py:L70–75`) are held out for test, so zero wording variants of a test template appear in training.
6. **What is `SAFETY_CRITICAL_TERMS` (`predict.py:L6`)?** — Deterministic rule pre-check (`"live wire"`, `"sparking"`, `"electrocution"`, etc.) forcing `("SAFETY", "CRITICAL")` before ML inference and incrementing `safety_override` telemetry.

### Level 3 & 4 — OOD Sanity Check & Judge Traps
7. **What do the `49/54` (`0.9074`, 95% Wilson CI `~0.80–0.96`) OOD results and 5 misses show?** — It is a **team-authored OOD sanity-check set** (zero string overlap with `synthetic.py`, verified by `evaluate_realworld_benchmark.py`, **not** independent utility data). 4 of the 5 misses (`RW-49`, `50`, `52`, `54`) have true label `OTHER` pushed into specific classes, plus `RW-31` (stolen meter → `NEW_CONNECTION`), showing `OTHER` lacks an explicit abstain threshold — which we would add with real pilot tickets.
8. **`/v1/assistant/chat` vs `/api/ai-chat`?** — `/v1/assistant/chat` is 100% local FastAPI TF-IDF policy retrieval + live scoped SQL breach ranking; `/api/ai-chat` is the Node co-pilot with optional `3,500ms`-bounded Gemini and automatic local Grounded Engine fallback.

---

## Role 4 — Security, Cryptography, Audit Chain, Backup/Restore & CI (Sandip)

### Level 1 & 2 — Controls & Code Walkthrough
1. **Passwords & production secret guard?** — `bcrypt` (72-byte bounded) on FastAPI; `scryptSync` + `timingSafeEqual` on Node. `config.py` refuses production boot if `SECRET_KEY` is `<32` chars or starts with `dev-only`/`change-me`/`replace-with`/`your-`, and `main.py` refuses production boot if demo accounts exist.
2. **HTTP security headers (`main.py:L229` & `prodServer.ts:L44`)?** — `Content-Security-Policy` (`default-src 'self'; frame-ancestors 'none'; base-uri 'self'` on FastAPI; `prodServer.ts` sets CSP on HTML/static responses with `'unsafe-inline'` allowed for the theme bootstrap script and styles — nonce-based CSP is a production hardening step), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, and `Strict-Transport-Security` in production.
3. **Upload pipeline (`uploads.py`)?** — `sanitize_uploaded_filename()` (`L79`) → `64 KiB` streaming `5 MiB` cap (`413`) + non-empty check → `validate_magic_bytes()` (`L28`: `%PDF-`, PNG, JPEG, valid UTF-8 `.txt` with no null/binary headers) → `encrypt_upload_at_rest()` (`L182`: HKDF-SHA256 per-file key + AES-256-GCM 12-byte nonce + filename bound as AAD + `VFENC1` header) → always written to `uploads_encrypted/` (`settings.upload_vault_dir`).
4. **Audit hash chain (`audit.py`)?** — Starts from `prev_hash = ""` (empty string), increments `UNIQUE` `chain_seq` under `AuditChainHead` lock (`SELECT ... FOR UPDATE` on Postgres + process lock), and `GET /v1/requests/audit/verify` (`verify_chain`, `L178`) recomputes every SHA-256 digest. SIEM export at `/v1/system/siem-events?format=cef`.
5. **Why are all 124 `pytest` tests repeatable?** — `tests/conftest.py` deletes stale `test_vidyutflow.db*` before collection, at `pytest_sessionstart`, and after `engine.dispose()` at `pytest_sessionfinish`, and isolates `upload_vault_dir` in `tmp_path_factory`.

### Level 3 & 4 — Judge Traps
6. **"`%PDF-` followed by `<script>` passes your upload check!"** — Correct: `validate_magic_bytes()` blocks extension spoofing (`MZ`/`ELF` disguised as `.pdf`), not polyglot malware. Uploaded bytes are stored encrypted (`VFENC1`) and never served raw over HTTP, plus `nosniff` + `CSP`; production adds a DMZ ClamAV/ICAP CDR scanner.
7. **"Your DR drill swaps SQLite in `3.5 ms` — is that HA failover?"** — No: it is an **automated backup, SHA-256 verify, tamper-rejection (`restore_drill.sh`), and local SQLite restore drill** (`0` records lost). Multi-node PostgreSQL 16 streaming HA failover is Tier 2/3 (`INFRASTRUCTURE_ROADMAP.md`).
8. **"What would a VAPT still flag?"** — Single `SECRET_KEY` shared across JWT signing and HKDF derivation (production separates via KMS), Redis login limiter tested with a fake Redis client rather than a live Redis server (and Node `/api/ai-chat` rate-limiting + sessions remain in-memory), `prodServer.ts` HTML CSP allowing `'unsafe-inline'` rather than per-request nonces, `SameSite=Lax` cookie + bearer bridge without separate CSRF token, and CI kept as `docs/ci.yml` template until copied via GitHub Web UI.

---

## Role 5 — `PS000125` Mapping, Costed BOM, Workload & Demo (Arnav)

### Level 1–4 — Core Answers
1. **Scope honesty (`REQUIREMENT_MAPPING.md`)**: Every `PS000125` problem (1–12) and outcome (1–14) is tagged `Built`, `Simulated/Lite`, or `Costed Proposal`. Never claim hardware or live SAP as deployed.
2. **Hardware & Network Proposal (`INFRASTRUCTURE_BOM_SOURCES.md`)**: Costed 3-tier reference plan — **Tier 1 `₹14.80 Lakh`** (1 subdivision 90-day pilot), **Tier 2 `₹1.18 Crore`** (1 circle PostgreSQL 16 HA on Dell R650xs + FortiGate 60F SD-WAN + 60 edge nodes), **Tier 3 `₹7.45 Crore`** (full DISCOM, 500× substation RPi4 + Quectel `EC200U-CN` 4G concentrators at indicative `₹8,000/unit = ₹40 Lakh`).
3. **Workload reduction (`WORKLOAD_MEASUREMENT.md`)**: `12` consumer fields entered once, `0` re-typed by staff, `0` manual routing handoffs, `3` staff transitions (`FIELD_VERIFIED` → `APPROVED` → `COMPLETED`). The `23`-re-entry legacy baseline is an **assumed baseline**; real minutes saved will be timed before/after during the 90-day subdivision pilot.
4. **3-Minute Live Demo Sequence**: Consumer submits with PDF → Officer shows ML triage + SLA reasons → Field Engineer toggles offline, queues inspection, syncs **twice** (`duplicate: true` on second) → Officer clicks `APPROVED` → 3-System fan-out mock (simulated) → Admin runs `GET /v1/requests/audit/verify` (`ok: true`).
