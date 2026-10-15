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
