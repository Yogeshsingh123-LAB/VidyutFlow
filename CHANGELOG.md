# Changelog

All notable changes to VidyutOS Lite. Format follows [Keep a Changelog](https://keepachangelog.com);
this project is a hackathon prototype, so versions track milestones rather than releases.

## [Unreleased]

### Fixed
- **Approval bypass via field sync:** `POST /requests/field-sync` accepted any `task_status`,
  letting an engineer set `APPROVED`/`REJECTED` (or corrupt states) and bypass the officer-decision
  invariant. Sync now accepts only `FIELD_VERIFIED`/`COMPLETED`/`BLOCKED` (400 otherwise), and a
  concurrent duplicate retry resolves to `duplicate: true` instead of a 500. Regression test:
  `test_field_sync_cannot_decide_approvals` (suite: 5 passing).

### Changed
- README Core Invariants rewritten as an auditable table (invariant → enforcement point → verification).

### Added
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
