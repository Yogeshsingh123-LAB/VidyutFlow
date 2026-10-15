# Code review pack — for a reviewer who cannot browse the repo
**Scope correction:** VidyutOS is not a kernel/OS — there is no `kernel.c`, GDT/IDT or QEMU target.
"OS" is the product metaphor for a utility platform (*like an operating system for the DISCOM*). The kernel-equivalent
core under review is the **workflow engine** (`backend/app/workflow.py`), the **data layer** (`models.py`/`db.py`)
and the **offline sync contract** (`POST /requests/field-sync`). Build system equivalent: Docker Compose + `pip`/`npm` lockfiles.

## 1. Directory structure (61 tracked files)
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

## 3. Checklist (reviewed Oct 15, 2026 — items marked FIXED were changed in the same commit as this file)
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
- [ ] Open (accepted for demo, roadmap): JWT kept in `localStorage` (XSS trade-off — move to httpOnly cookie for production); no login rate-limiting; document upload stores filename only (no type/size validation or object storage); officer actions are not zone-scoped
- [x] Naming/comments: snake_case Python, PascalCase React components; non-obvious rules commented (routing, SLA, sync)
### DevOps & testing
- [x] Backend tests: `pytest` end-to-end (auth/RBAC → submit → route → assistant → offline sync ×2 → status), ML > baseline
- [x] Frontend production build verified (`npm run build`)
- [ ] CI: workflow YAML was prepared/validated locally but GitHub rejected it — the repo token lacks `workflow` scope. Add via GitHub web UI (Actions → New workflow) or a `workflow`-scoped token. Frontend unit tests also still to add.
## 4. How to reproduce this review
```bash
cd backend && pip install -r requirements.txt -r requirements-dev.txt && pytest -q
cd frontend && npm ci && npm run build
docker compose up --build   # full stack
```
