# VidyutOS Lite — PS000125 (UGVCL)

**“Enter Once, Use Everywhere.”** One working end-to-end flow — the **new-connection request** — with two small ML models and an offline-capable field app. Everything else is an explicitly-labelled scale-up roadmap (not code).

> ⚠️ **All ML training/evaluation data is SYNTHETIC.** Accuracies are held-out test results vs a majority-class baseline. They are **not** UGVCL real-world performance. Baseline figures from the design document (lost-request %, ₹/connection, payback, uptime/efficiency targets) are **assumptions/targets, not UGVCL published numbers**.

## Demo in 3–5 minutes
See [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md). Flow: consumer submits (+ document) → auto validate/route/assign with SLA-risk flag → officer dashboard → engineer completes task in airplane mode → reconnect sync (UUID de-duplication, no duplicates) → consumer sees COMPLETED → assistant answers *“Which requests are likely to breach SLA?”* and *“What is the procedure for a new connection?”*

## Run it
### Option A — Docker Compose (PostgreSQL, as in the plan)
```bash
docker compose up --build
# Frontend http://localhost:5173 · API docs http://localhost:8000/docs
```
### Option B — Local (SQLite fallback, fastest for rehearsal)
```bash
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
cd frontend && npm install && npm run dev   # http://localhost:5173
```
Models auto-train on synthetic data on first start (or `cd backend && python scripts/train_models.py`).

### Demo logins (seeded — change before any real use)
| Role | Email | Password |
|---|---|---|
| Consumer | consumer@vidyut.local | Consumer@123 |
| Officer (North) | officer@vidyut.local | Officer@123 |
| Engineer (North) | engineer@vidyut.local | Engineer@123 |
| Admin | admin@vidyut.local | Admin@123 |

## What is built vs roadmap
| Module | Built now | Roadmap only |
|---|---|---|
| Dashboard | React, role views, login, live KPIs | GraphQL, GIS map, WebSockets |
| Workflow | Rule-based: validate→route→assign, SLA, audit log | Temporal/Camunda, Kafka |
| AI assistant | TF-IDF RAG over policies + live data queries (no external LLM) | Fine-tuned LLM, private VPC |
| Offline field ops | PWA + local queue + **UUID de-duplication** | Flutter, Couchbase, CRDT |
| Security & DR | JWT+RBAC, bcrypt, audit logs, Compose, `backend/scripts/backup.sh` | Zero Trust, multi-AZ, Vault |
| Predictive maintenance | Not built (SLA-risk only) | Real SCADA/sensor feeds |

Full roadmap: [`docs/ROADMAP.md`](docs/ROADMAP.md) · Architecture below · ML: [`docs/ML_REPORT.md`](docs/ML_REPORT.md) · Synopsis draft: [`docs/SYNOPSIS_ABSTRACT.md`](docs/SYNOPSIS_ABSTRACT.md) · Deck: [`docs/DECK_OUTLINE.md`](docs/DECK_OUTLINE.md)

## Architecture (Lite)
```
Consumer/Officer/Engineer/Admin (React PWA, Tailwind)
        │  /api (Vite proxy — browser never calls localhost services directly)
FastAPI (one Python service — defendable line by line)
 ├─ JWT auth + RBAC (consumer/officer/engineer/admin), bcrypt, audit log
 ├─ Rule-based workflow: validate → ML classify → SLA-risk → route by zone → assign
 ├─ ML (scikit-learn, synthetic): complaint/fault+severity classifier · SLA-breach predictor (+ reasons)
 ├─ Assistant: TF-IDF RAG over backend/data/policies + live DB queries
 └─ Field sync: POST /requests/field-sync, client_uuid UNIQUE → duplicates ignored
PostgreSQL (Compose) / SQLite (local) · Redis service reserved in Compose (roadmap wiring)
```

## Tests
```bash
cd backend && pip install -r requirements-dev.txt && pytest -q
# covers: auth/RBAC, submit→route, officer view, assistant, offline sync sent twice (no duplicate), ML > baseline
```

## Layout
```
backend/app/{main,workflow,security,deps,audit}.py  backend/app/routers/{auth,requests,assistant}.py
backend/app/ml/{synthetic,train,predict}.py + models/ (committed so the demo runs offline)
backend/app/assistant/service.py  backend/data/policies/  backend/tests/test_flow.py
frontend/src/App.jsx (all role views + offline queue)  frontend/public/{sw.js,manifest.webmanifest}
docs/  docker-compose.yml
```

## Timeline reminder (from plan)
Register by **Oct 17, 2026** · synopsis/deck/video due **Nov 5–6** (submit a day early; synopsis cannot be edited after submission) · finale **Dec 2, 2026**. If a feature is not in the demo script, it does not get built before Nov 6.
