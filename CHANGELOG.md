# Changelog

All notable changes to VidyutFlow. Format follows [Keep a Changelog](https://keepachangelog.com);
this project is a hackathon prototype, so versions track milestones rather than releases.

## [Unreleased]

### Added
- **ML evidence pack (Role 3):** `scripts/export_ml_charts.py` → `docs/assets/ml_confusion_matrices.png`
  + `ml_risk_distribution.png` (SYNTHETIC-labelled, deck-ready) · `docs/ML_REPORT.md` expanded with the
  results table, evaluation protocol, 30-second honesty script and 3 hostile Q&A with 2-line answers ·
  `make train` verified **byte-identical** reproducible. Live **SLA-Risk Watchlist** (model probability
  + reasons) added to Management ▸ AI Insights via the wired API.
- **Synopsis & defence pack (Role 5):** `docs/SYNOPSIS_ABSTRACT.md` finalised with measured/synthetic
  figures · `docs/DECK_OUTLINE.md` expanded to 12 slides with speaker notes · `docs/DEFENCE_QA.md`
  (print sheet) · architecture diagram built-vs-roadmap (`docs/assets/architecture.svg` + `.png`) ·
  `docs/REQUIREMENT_MAPPING.md` evidence refresh + §E words grid + §F numbers-audit checklist ·
  12-slide deck generated: `docs/deck/VidyutFlow_PS000125.pptx` (`scripts/build_deck.py`, regenerable).
- **QA evidence pack (Role 4):** `backend/scripts/load_check.py` — 100 mixed authenticated reads,
  **p50 3.1 ms · p95 4.5 ms · 0 errors** (labelled *local, synthetic*; never a UGVCL figure) ·
  `docs/verification/r4-load-check.txt`. `scripts/restore_drill.sh` — backup → checksum verify →
  tamper-reject → wipe → restore → live-serve drill **PASS** · `docs/verification/r4-backup-restore.txt`.
  Backup checksums now record basenames so `restore.sh` verifies from inside `backups/`.
- **CI (Role 4):** `.github/workflows/ci.yml` — backend pytest + frontend suites/tsc/build on every
  push and PR (mirrors `make test` / `make build`).
- **Defence pack (Role 4):** `SECURITY.md` gains the one-sentence team auth story, known-gap
  one-liners for Q&A, and the evidence index (load check + restore drill + CI).
- **UI → live API wiring (Role 2):** the three demo-critical screens now talk to the FastAPI
  backend through `fastApiClient` — Consumer wizard `POST /api/requests` (toast reports live ML
  category/severity + SLA risk), Employee **Live Request Queue** (`GET /api/requests`), and
  Management/Admin **Live Workflow KPIs** (`GET /api/requests/kpis/summary`). Panels poll every
  45s with a last-updated stamp ("live on refresh" — streaming is roadmap) and degrade silently
  to the demo workspace when the API is unreachable. Alert centre merges backend
  `/api/notifications` rows with mark-read wired through. New test chain file
  `tests/live-api-wiring.test.ts` (18 checks).
- **One credential set for portal + API:** backend seeds the portal demo accounts
  (`*@vidyutflow.demo` / `Demo@12345`, role-mapped to RBAC); `src/utils/backendSession.ts`
  acquires the backend JWT at portal login (stored as `vidyutos_token`) via the new
  `/api/backend/*` dev proxy (the dev auth middleware shadows `/api/auth`). Kills the dual-auth
  story: same login covers workspace + live API. Production seeding/rejection unchanged in policy.
- **Alert centre (server-side):** per-user `Notification` rows with `GET /notifications`,
  `POST /notifications/read-all`, `POST /notifications/{id}/read` (owner-or-admin; cross-user
  writes 403). Workflow events (submit, status change, field sync) notify the attached parties —
  closes the "notification centre is frontend-state only" gap. Tests: `tests/test_notifications.py`.
- **Tamper-evident audit log:** sha256 hash chain (`prev_hash`/`entry_hash` per row) with read-only
  admin check `GET /requests/audit/verify` (`ok,checked,legacy_skipped,last_entry_hash,broken_at`);
  pre-upgrade rows are reported as `legacy_skipped`, never counted as verified. Editing/deleting any
  chained row is detectable. Tests: `tests/test_audit_chain.py`.
- **Server security headers** on every response (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Cache-Control: no-store`; HSTS in `APP_ENV=production` only, TLS at gateway).
  AI endpoints (`/assistant/chat`, `/assistant/ml-metrics`) verified auth-required.
- **Storage permanence:** `backup.sh` now writes `sha256` checksums; new `restore.sh` verifies the
  checksum before restoring SQLite/PostgreSQL dumps.
- Seed-data polish: realistic North/South synthetic cases (commercial, agricultural, high-load,
  NEEDS_CORRECTION without document) so dashboards demo convincingly; production seeding stays off.
- `docs/API_CONTRACT.md`: demo-path endpoint shapes **frozen 21 Oct 2026** (20 ops / 19 paths with
  notifications + audit verify) and frozen example payloads for R2's UI→API wiring.

### Fixed
- Backend `Settings` crashed when the shared root `.env` (frontend keys `SESSION_SECRET`,
  `APP_URL`, `VITE_PROXY_TARGET`) was present in the environment; unknown keys are now ignored.
- Audit-chain timestamps hash identically across Python (timezone-aware) and SQLite (naive)
  representations; same-microsecond insert ordering guard added.
- Compose runtime blockers: corrected demo PostgreSQL password YAML type and healthcheck database name; added API/proxy readiness checks and frontend dependency gating. Compose/PostgreSQL flow, restart persistence and scripted Chromium offline/conflict checks passed (17 Oct 2026); evidence in docs/verification.
- Terminal request protection: status PATCH and fresh field sync cannot overwrite COMPLETED/REJECTED cases. Lifecycle policy plus status/timestamp conditional writes reject stale updates; existing authorized UUID retries remain idempotent. Frontend preserves queued conflicts for review and no longer labels HTTP 4xx as network failure. 17 tests pass locally; frontend builds.
- Public registration can no longer create staff/admin accounts; inactive users cannot obtain login tokens.
- Login now has a bounded, thread-safe process-local IP throttle with HTTP 429 and Retry-After (configurable; not distributed protection). Security regression suite: 10 passing locally.
- Backend permission review: engineer status decisions and detail access hardened; sync deduplication now follows authorization and checks actor/request ownership.
- Officer zone scope enforced across requests, actions, KPIs, assistant queries and audit views. Assistant live-data queries now respect every caller's scope. Routing excludes inactive/cross-zone fallback staff. Local suite: 7 passing.
- **Approval bypass via field sync:** `POST /requests/field-sync` accepted any `task_status`,
  letting an engineer set `APPROVED`/`REJECTED` (or corrupt states) and bypass the officer-decision
  invariant. Sync now accepts only `FIELD_VERIFIED`/`COMPLETED`/`BLOCKED` (400 otherwise), and a
  concurrent duplicate retry resolves to `duplicate: true` instead of a 500. Regression test:
  `test_field_sync_cannot_decide_approvals` (suite: 5 passing).

### Changed
- Standardized active branding as VidyutFlow across community docs, UI, API labels, PWA/package metadata, repository links and mail PDF. Persistent database/storage identifiers and historical verification evidence preserved; see docs/BRANDING.md.
- API review: system status is admin-only; both request creation endpoints are consumer-only; KPI pending excludes completed/rejected requests. Frontend no longer fetches system status for officers. These tighten access without changing successful response keys; 12 tests pass locally and frontend builds.
- README Core Invariants rewritten as an auditable table (invariant → enforcement point → verification).

### Added
- API contract review candidate, generated OpenAPI snapshot/export script and drift regression test (11 passing locally). Freeze pending explicit review gates and Compose verification.
- Community & professionalism pack: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`,
  issue/PR templates, Dependabot config, README banner, table of contents, GitHub About/topics.
- Team designations: Yogesh Kumar Singh (Team Leader), Aakash Kumar Singh/Utsav/Sandip/Arnav (Collaborators).

## [0.4.0] — 2026-10-16 · Team & PS000125 lock-in

### Added
- Official PS000125 statement + requirement-to-solution mapping (`docs/PS000125_OFFICIAL.md`,
  `docs/REQUIREMENT_MAPPING.md`), infrastructure roadmap tiers, UGVCL resource-person mail pack (`.md` + PDF).
- 5-role team split mapped to repo modules (`docs/TEAM_ROLES.md`) with verified GitHub IDs.
- ML evaluation improvements and electrical-safety guardrails (@1006coder); backend suite now 4 tests.

### Changed
- Product reframed as a **Cloud-to-Edge Orchestration Platform** (ML → Edge Intelligence Simulation /
  Policy Validation; offline PWA → Control Interface for Intermittent Connectivity; admin console →
  Fleet Management Console). Device-side policy deployment stays explicitly roadmap.

## [0.3.0] — 2026-10-15 · VidyutOne feature parity

### Added
- Full role-portal parity on the real backend: complaint desk, document upload, admin user directory
  (`GET /auth/users`), live system status (`GET /system/status`), derived notifications, command
  palette, workflow visualizer, deep links — SIMULATED surfaces labelled as such.

## [0.2.0] — 2026-10-15 · Docs, Makefile & review fixes

### Added
- Makefile automation, quick-audit pack, code-review document, MIT license, README rewrite.
- Backend review fixes (bcrypt direct, lifespan startup, secret warning).

## [0.1.0] — 2026-10-15 · Initial build

### Added
- End-to-end new-connection flow: React role dashboards (consumer/officer/engineer/admin), rule-based
  FastAPI workflow (validate → classify → route → assign → SLA → audit), two synthetic-data
  scikit-learn models, RAG assistant, offline field PWA with UUID de-duplicated sync, JWT/RBAC,
  Docker Compose.
