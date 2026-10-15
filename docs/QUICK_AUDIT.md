# QUICK AUDIT PACK — paste this whole file to a reviewer who cannot open the repo
> Note for the reviewer: VidyutOS is a **utility ERP/portal platform** ("OS" = operating system *for the DISCOM*),
> not a CPU kernel. There is no bootloader/.asm/QEMU; the equivalents are: bootloader → app startup/seed
> (`backend/app/main.py` lifespan), memory safety → DB transactions + UNIQUE constraints, interrupts → HTTP API +
> audit log, build system → `Makefile` + Docker Compose below. Repo: https://github.com/Yogeshsingh123-LAB/VidyutOS (public)

## 1. README.md
````markdown
# VidyutOS Lite — PS000125 (UGVCL)

**“Enter Once, Use Everywhere.”** One working end-to-end flow — the **new-connection request** — with two
small ML models and an offline-capable field app. Everything else is a labelled scale-up roadmap, not code.

> ⚠️ All ML training/evaluation data is **synthetic**. Accuracies are held-out results vs a majority-class
> baseline — **not** UGVCL real-world performance. Figures from the design document (lost-request %, ₹/connection,
> payback, efficiency targets) are assumptions/targets, not UGVCL published numbers.

## Quick start
```bash
make setup && make backend     # terminal 1 — API on :8000 (SQLite fallback)
make frontend                  # terminal 2 — web app on :5173
# — or one command for the full PostgreSQL stack —
make up                        # Docker Compose → http://localhost:5173 · API docs :8000/docs
make test                      # backend tests · make help lists every target
```
Demo logins (seeded; change before any real use):

| Role | Email | Password |
|---|---|---|
| Consumer | consumer@vidyut.local | Consumer@123 |
| Officer | officer@vidyut.local | Officer@123 |
| Engineer | engineer@vidyut.local | Engineer@123 |
| Admin | admin@vidyut.local | Admin@123 |

## Demo (3–5 min)
Consumer submits via the 3-step wizard (+ document) → auto validate/route/assign with SLA-risk flag →
officer dashboard (charts, alerts, Ctrl-K command palette) → engineer completes an inspection in airplane
mode → reconnect sync (UUID de-duplication) → consumer sees COMPLETED → assistant answers
*“Which requests are likely to breach SLA?”*. Full script: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)
UX upgrade notes vs the VidyutOne reference UI: [docs/VIDYUTONE_UPGRADE.md](docs/VIDYUTONE_UPGRADE.md)

## Built vs roadmap
| Built now | Roadmap only |
|---|---|
| React PWA, role views, live KPIs | GraphQL, GIS map, WebSockets |
| Rule workflow: validate→route→assign, SLA, audit | Temporal/Camunda, Kafka |
| TF-IDF RAG assistant + live data queries | Fine-tuned LLM, private VPC |
| Offline queue + UUID de-duplication | Flutter, Couchbase, CRDT |
| JWT+RBAC, bcrypt, Compose, backup script | Zero Trust, multi-AZ, Vault |

## Repo map
```
backend/    FastAPI app (app/), ML (app/ml/), policy docs (data/), tests/
frontend/   React PWA — Shell/sidebar, role portals, wizard, drawers (src/components/), service worker (public/)
docs/       Demo script, architecture, ML report, roadmap, synopsis, deck — start at docs/README.md
Makefile    every build/run/test command (make help) · docker-compose.yml · LICENSE (MIT)
```
ML model binaries are **not** committed — they retrain from synthetic data on first start
(`backend/scripts/train_models.py`); the tracked results live in `backend/app/ml/models/metrics.json`.

## Tests
```bash
cd backend && pip install -r requirements-dev.txt && pytest -q   # end-to-end flow, RBAC, de-dup sync, ML > baseline
```
````

## 2. Directory structure (`tree`, tracked files only)
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
│   ├── CODE_REVIEW.md
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
├── LICENSE
├── Makefile
├── README.md
└── docker-compose.yml
```

## 3. Makefile (run `make help`; verified: `make train`, `make test`, `make build` all pass)
```makefile
# VidyutOS Lite — one-command build/run/test (no hardcoded local paths; run from repo root)
.DEFAULT_GOAL := help
.PHONY: help setup train backend frontend dev test build up down clean demo-reset

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  make %-12s %s\n", $$1, $$2}'

setup: ## Install backend + frontend dependencies
	cd backend && pip install -r requirements.txt -r requirements-dev.txt
	cd frontend && npm install

train: ## Retrain both ML models on synthetic data (writes metrics.json)
	cd backend && python scripts/train_models.py

backend: ## Run API locally (SQLite fallback) on :8000
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000

frontend: ## Run web app locally on :5173 (proxies /api to :8000)
	cd frontend && npm run dev

test: ## Backend test suite (end-to-end flow, RBAC, offline de-dup, ML)
	cd backend && python -m pytest -q

build: ## Production frontend build
	cd frontend && npm run build

up: ## Full stack with PostgreSQL via Docker Compose
	docker compose up --build

down: ## Stop Docker Compose stack
	docker compose down

demo-reset: ## Remove local SQLite demo databases (re-seeded on next start)
	./scripts/demo_reset.sh

clean: demo-reset ## Remove demo DBs and build artefacts
	rm -rf frontend/dist backend/.pytest_cache
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
```

## 4. Red-flag map (reviewer's OS checklist → this codebase)
| Reviewer area | Look here instead | Status |
|---|---|---|
| Bootloader / startup | `backend/app/main.py` lifespan: create tables → train models → seed users/requests | Clean startup log, warns on default SECRET_KEY |
| Memory / corruption | SQLAlchemy transactions; `client_uuid` UNIQUE in `backend/app/models.py` | Duplicate sync writes impossible; tested ×2 sync |
| Interrupts / events | Routers in `backend/app/routers/`, every mutation writes `AuditLog` | RBAC + assignment-level 403 checks, tested |
| Stack / crashes | Pydantic validation + workflow `validate()` → NEEDS_CORRECTION instead of 500 | Invalid input returns reasons, not crashes |
| Build portability | `Makefile` + `docker-compose.yml`, lockfiles, no absolute paths | `make test` 2 passed · `make build` OK |
