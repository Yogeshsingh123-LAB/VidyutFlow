# Code review pack — for a reviewer who cannot browse the repo
> **Current-state note (17 Oct 2026):** This pack includes historical snapshots. The dated notes below record findings as they stood at the time; later entries and the repository's current source take precedence. Current security limitations and environment setup are summarized in `SECURITY.md` and the root `README.md`.

**Scope correction:** VidyutFlow is not a kernel/OS — there is no `kernel.c`, GDT/IDT or QEMU target.
"OS" is the product metaphor for a utility platform (*like an operating system for the DISCOM*). The kernel-equivalent
core under review is the **workflow engine** (`backend/app/workflow.py`), the **data layer** (`models.py`/`db.py`)
and the **offline sync contract** (`POST /requests/field-sync`). Build system equivalent: Docker Compose + `pip`/`npm` lockfiles.

## 1. Directory structure (historical, abridged snapshot; current repository has 115 tracked files)
```
├── backend
│   ├── app
│   │   ├── assistant
│   │   │   ├── __init__.py
│   │   │   └── service.py
│   │   ├── ml
│   │   │   ├── models
│   │   │   │   └── metrics.json
│   │   │   ├── __init__.py
│   │   │   ├── predict.py
│   │   │   ├── synthetic.py
│   │   │   └── train.py
│   │   ├── routers
│   │   │   ├── __init__.py
│   │   │   ├── assistant.py
│   │   │   ├── auth.py
│   │   │   └── requests.py
│   │   ├── __init__.py
│   │   ├── audit.py
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── deps.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── security.py
│   │   └── workflow.py
│   ├── data
│   │   └── policies
│   │       ├── new_connection.md
│   │       ├── offline_field_work.md
│   │       └── sla_and_escalation.md
│   ├── scripts
│   │   ├── backup.sh
│   │   └── train_models.py
│   ├── tests
│   │   └── test_flow.py
│   ├── .env.example
│   ├── Dockerfile
│   ├── requirements-dev.txt
│   └── requirements.txt
├── docs
│   ├── ARCHITECTURE.md
│   ├── DECK_OUTLINE.md
│   ├── DEMO_SCRIPT.md
│   ├── ML_REPORT.md
│   ├── README.md
│   ├── ROADMAP.md
│   ├── SYNOPSIS_ABSTRACT.md
│   └── VIDYUTONE_UPGRADE.md
├── frontend
│   ├── public
│   │   ├── manifest.webmanifest
│   │   └── sw.js
│   ├── src
│   │   ├── components
│   │   │   ├── RequestDrawer.jsx
│   │   │   ├── Shell.jsx
│   │   │   ├── panels.jsx
│   │   │   └── ui.jsx
│   │   ├── lib
│   │   │   └── format.js
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── index.css
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── scripts
│   └── demo_reset.sh
├── .editorconfig
├── .gitignore
├── README.md
└── docker-compose.yml
```

## 2. Core snippets to review first
- **Workflow core** — `backend/app/workflow.py` (48 lines): validate → ML classify → SLA-risk → route-by-zone → assign; SLA hours by severity.
- **Offline sync / de-duplication** — `backend/app/routers/requests.py`, `field_sync()`: `client_uuid` has a UNIQUE constraint; a repeat returns `{"duplicate": true}` and writes no second row. Covered by `backend/tests/test_flow.py`.
- **Security** — `backend/app/security.py` (bcrypt direct, JWT) + `deps.py` (RBAC) + assignment-level checks in `requests.py`.
- **ML contract** — `backend/app/ml/{synthetic,train,predict}.py`; metrics in `models/metrics.json` (synthetic data, majority-baseline comparison).

## 3. Historical checklist (reviewed Oct 15, 2026; superseded where noted below)
### Documentation
- [x] README: goal, stack, quick-start (Compose + local), demo logins, demo script, built-vs-roadmap table
- [x] **LICENSE added (MIT)** — was missing
- [x] Architecture diagram — `docs/ARCHITECTURE.md` (client → FastAPI → DB; kernel/Hardware diagram N/A)
- [x] README repo-map no longer references a CI file that does not exist — **FIXED**
### Structure
- [x] Logical separation: `backend/app/{routers,ml,assistant}`, `frontend/src/{components,lib}`, `docs/`, `scripts/`, `tests/` co-located with backend
- [x] Lockfiles/build: `package-lock.json`, pinned `requirements.txt`, `docker-compose.yml` (no manual compile steps)
### Code quality (the "kernel panic" equivalents here: 500s, duplicate records, auth bypass)
- [x] Duplicate-write protection: UNIQUE `client_uuid` + idempotent response (tested by syncing twice)
- [x] **Authorisation gap FIXED:** an engineer can no longer field-sync or status-update another engineer's case (403, tested); KPI aggregates are now role-scoped like the list endpoint
- [x] **CORS FIXED:** was `allow_origins=["*"]` with credentials → now an allowlist from `CORS_ORIGINS` env; app warns on the default `SECRET_KEY`
- [x] **Deprecated stack FIXED:** `on_event` → lifespan handler; passlib (broken warning with bcrypt 4.x) → direct `bcrypt`
- [x] Later implemented: process-local login throttling and officer zone-scoped request access. Passwords over bcrypt's 72-byte UTF-8 limit are rejected. Remaining accepted demo limitations: JWT in `localStorage`, document upload stores filename only (no type/size validation or object storage), and rate-limit state is not shared across workers/replicas.
- [x] Naming/comments: snake_case Python, PascalCase React components; non-obvious rules commented (routing, SLA, sync)
### DevOps & testing
- [x] Backend tests: `pytest` end-to-end (auth/RBAC → submit → route → assistant → offline sync ×2 → status), ML > baseline
- [x] Frontend production build verified (`npm run build`)
- [ ] CI: no CI workflow is currently tracked. Frontend unit tests were added after this historical checklist.
## 4. How to reproduce this review
```bash
cd backend && pip install -r requirements.txt -r requirements-dev.txt && pytest -q
cd frontend && npm ci && npm run build
docker compose up --build   # full stack
```

## Backend step 1 — permission review (17 Oct 2026)

Implemented locally before API freeze:
- Engineer detail reads, status PATCH and offline sync now require an exact assignment match, including when a case has no assigned engineer.
- Engineer PATCH allows only IN_PROGRESS, FIELD_VERIFIED and COMPLETED. APPROVED/REJECTED and administrative statuses return 403; officer/admin behavior is unchanged.
- Sync checks request authorization before duplicate lookup. A UUID owned by a different actor or request returns 409. Integrity errors are treated as duplicates only when a matching record exists; unrelated errors are re-raised.
- Evidence: `make test` — 6 passed (deprecation warnings remain). New regression: `test_engineer_permissions_across_request_endpoints`.

This is not an API freeze or production-security sign-off. Officer zone scope, login throttling, a status-transition graph, and Compose verification remain pending. No endpoints or successful response shapes changed; previously unauthorized access now returns 403/409.

Next R1 steps: record officer zone-scope decision; review login throttle with R4; document endpoint contracts; verify Compose with R4 before declaring the contract frozen.

## Backend step 2 — officer zone scope (17 Oct 2026)

Decision: **build**, rather than defer. This is a prototype access policy pending UGVCL validation.

- `app/access.py` is the common visibility policy: consumer → owner; engineer → exact assignment; officer → exact zone; admin → global. Missing/blank officer zone and unknown roles fail closed.
- Applied to list/detail, status updates, offline sync, KPI aggregates, assistant risk results and assistant counts. Officer audit views contain only request events for currently visible requests; global/non-request events remain admin-only.
- Fixed an additional leak discovered during review: assistant live-data queries previously read all requests, regardless of caller role.
- Routing no longer falls back to staff in another zone and now excludes inactive staff. An unstaffed zone stays ROUTED without an assignee. Existing assignments are not migrated; admin review is required for historical cross-zone assignments. Engineer access remains assignment-based.
- Audit scope follows the request's current zone, not a historical zone snapshot. Zone names currently use exact matching; an authoritative zone catalogue and audited reassignment workflow remain future work.
- Evidence: `make test` **7 passed**, including `test_officer_zone_scope_and_assistant_visibility`. Covers both zones, denied reads/writes/sync, unchanged state after denial, KPIs, audits, assistant rows/counts, admin visibility, unstaffed routing, and blank-zone denial. Deprecation warnings remain.
- No endpoint or successful response shape changed. Previously permitted cross-zone access now returns 403 or is filtered from collections.
- Login throttling, API contract documentation and Compose verification remain pending; this is not a freeze sign-off.

### Website references reviewed for portal inspiration
- https://sas.svc.ac.in/login (first supplied share link): distinct ERP sign-in and return-to-public-website navigation.
- https://erp.mmumullana.org/ (second supplied share link): role-oriented entry and separate student ERP destination.
- https://svc.ac.in/: public information hub with ERP entry, helpdesk, language and accessibility links.

Adopt clear audience boundaries and consistent portal navigation in a later frontend pass. Public pages do not reveal their internal authorization implementation. No logos, institutional content, Google sign-in or password-reset flows were copied or added. This step changes backend scope only.

## Backend step 3 — login protection (17 Oct 2026)

Implemented a fixed-window throttle before login credential verification. Default: 20 login attempts (successful or failed) per observed client IP per 60 seconds, configured via `LOGIN_MAX_ATTEMPTS` and `LOGIN_WINDOW_SECONDS`. Rejected requests return 429 with `Retry-After`; credential errors remain generic 401. Windows use a monotonic clock. A lock makes updates thread-safe; expired buckets are pruned, and a 10,000-client bound fails closed rather than allowing unlimited memory growth. No passwords or tokens are retained in throttle state.

Related security blockers fixed: public registration now accepts only consumers (staff/admin role requests return 403 with no user created); inactive users cannot obtain tokens, and existing tokens continue to be rejected by current-user checks. Staff provisioning remains seeded/admin-operated outside public registration; no staff-provisioning API was added.

Deployment limitations: counters are process-local, reset on restart and are not shared between replicas/workers. Shared NAT/proxy clients may share a budget. The app does not parse X-Forwarded-For; however, ASGI servers may rewrite the observed IP when proxy headers are trusted. Configure Uvicorn/reverse-proxy trust for known proxies only, never arbitrary Internet clients. A production gateway/shared store must enforce global limits. This is not distributed brute-force or denial-of-service protection. Registration throttling, password policy, recovery/SSO and timing-hardening remain outside this step.

Evidence: `make test` → **10 passed**. Tests cover attempt limit, Retry-After, fake-clock expiry, successful attempts consuming budget, ignored spoofed forwarding header in TestClient, thread concurrency, client isolation, capacity/cleanup, public role escalation denial, and inactive-account token denial. Deprecation warnings remain. No live deployment or Compose verification claimed.

Next: API contract documentation, followed by Compose verification with R4. Earlier notes describing throttling as pending are historical; this prototype throttle is now implemented locally.

## Backend step 4 — API contract review (17 Oct 2026)

Evidence: `docs/API_CONTRACT.md`, `docs/api/openapi.json`, `backend/scripts/export_openapi.py`, `test_openapi_matches_reviewed_snapshot`. Full local suite: **11 passed**. Snapshot captures current input schemas/routes, not typed response enforcement (most handlers lack response models).

Review identified explicit remaining decisions: system status exposes global aggregate counts to officers; KPI pending includes rejected requests; any authenticated role can submit a request; statuses have no transition graph; password hashing truncates at 72 bytes. These are documented honestly rather than silently changing frontend contracts. Earlier broad claims of all officer aggregates being isolated are qualified by the system-status exception. No API freeze declared.

Docker CLI is absent in this sandbox (`command -v docker` returned no executable). Compose runtime verification must run in a Docker-enabled environment; no PostgreSQL/Compose success claimed.

## Compose readiness — execution blocked in sandbox

No Docker/Podman executable or `/var/run/docker.sock` available. Added `.dockerignore` for both image build contexts to exclude host dependencies, caches, local DBs and .env files. Added `scripts/verify_compose.py` (stdlib-only, explicit PostgreSQL requirement, real frontend-proxy flow, dedup/security checks) and `docs/COMPOSE_VERIFICATION.md` with manual browser and persistence checks. Python compilation and `--help` passed; the runtime script has NOT been run against Compose. Phase 1.1 and contract freeze remain pending.

## API review decisions implemented — 17 Oct 2026

Supersedes the three open policy findings above: global system status is now admin-only; JSON and multipart request creation require consumer role; KPI pending excludes both COMPLETED and REJECTED, matching assistant counts. Staff-assisted intake remains deferred because there is no explicit verified consumer selection/ownership contract. Officers retain zone KPI/audit access. Frontend separates officer audit loading from admin system-status loading, clears system status outside admin, and guards creation/system deep links by role.

Evidence: `test_freeze_review_role_boundaries_and_pending_semantics` verifies both create paths, all denied roles, no added rows on denial, admin status access, rejected-case count changes and assistant/KPI consistency. `make test`: **12 passed** (deprecation warnings); frontend `npm run build`: passed. No browser interaction test claimed. OpenAPI schema is unchanged because dependency role restrictions/aggregate meaning are not encoded there; behavioral regression is essential.

API contract updated. R1/R2 final acceptance, response-model/transition-policy decisions and Docker runtime verification remain outstanding. Not frozen, not deployed, not pushed.

## Lifecycle protection — 17 Oct 2026

Implemented `transitions.py`: explicit prototype state graph, terminal-state protection and conditional SQL updates matching status + updated_at. PATCH/sync mutate through this helper; audit and field writes share the transaction. Authorized same-UUID retries remain successful even after completion; fresh terminal writes return 409 without changing meter/notes/audit/field counts. Earlier notes saying no transition graph are superseded.

Updated field action visibility and error handling. HTTP 4xx is not queued as a network outage; existing offline queue conflicts remain retained and pause the queue for review. No conflict-discard UI or client version protocol added. Graph preserves ASSIGNED → COMPLETED; not an official approval-before-installation rule. See `STATUS_TRANSITIONS.md` for limits.

Evidence: `make test` **17 passed**, frontend build passed. Tests include deterministic stale-snapshot protection, not parallel PostgreSQL stress testing. No Docker runtime or manual browser conflict test claimed. Response models, final team review and Compose verification remain pending; not frozen or pushed.

## Docker and real-browser verification — 17 Oct 2026 (supersedes blocked status)

Installed Docker/Compose using available sudo and ran the actual container stack. Found/fixed malformed PostgreSQL demo password YAML, incorrect healthcheck DB name and startup-readiness race (added backend/proxy healthchecks). PostgreSQL-backed smoke flow passed; backend + DB restart preserved request, meter, field-update and audit counts. Scripted Chromium ran true network-offline queueing, separate officer rejection via UI, reconnect 409 with retained UUID, explicit retry, local discard, normal offline sync, successful duplicate retry and no uncaught JS exceptions. Screenshots inspected. Existing Discard UI was found; prior claims it was absent were wrong and the lifecycle doc is corrected.

Evidence: `docs/verification/README.md` plus logs, screenshots and reproducible `scripts/verify_browser_conflicts.py`. Full backend suite 17 passed; frontend production build passed inside container. This is scripted real-browser testing, not human-manual acceptance. No production or full API-freeze claim. Source includes remote README rename commit df2fe62 (fast-forwarded without overwriting it).
