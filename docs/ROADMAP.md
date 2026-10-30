# Scale-up roadmap (slides only — NOT built in VidyutFlow)
| Module | Built now (demo-ready) | Roadmap slide only |
|---|---|---|
| Unified dashboard | React, role-based views, login, live KPIs | GraphQL, GIS outage map, WebSockets |
| Workflow automation | Configurable DB-backed workflow templates (`/workflows/templates`), SLA + audit log | Temporal/Camunda, Kafka |
| AI assistant | Two-tier: FastAPI local TF-IDF policy RAG + scoped DB queries (`/assistant/chat`) AND optional server-side Gemini + deterministic `Grounded Engine` fallback in the portal drawer (`/api/ai-chat`) | Private-VPC LLM on governed UGVCL manuals |
| Offline field ops | PWA queue + UUID de-duplication on sync | Flutter, Couchbase, CRDT |
| Security & DR | JWT+RBAC, bcrypt hashing, audit logs, Docker Compose, backup script | Zero Trust, multi-AZ failover, Vault |
| Predictive maintenance | Clearly-labelled simulated/SLA-risk demo only | Real SCADA / sensor feeds |
All baseline figures in the design document (5–10% lost requests, 85% data accuracy, ₹500/connection, 18–24 month payback, 70%/85%/99.9% targets) are **assumptions/targets, not UGVCL published numbers**.

## Repo hygiene / completed & remaining engineering steps
- GitHub Actions workflow `.github/workflows/ci.yml` runs backend `pytest` + frontend tests, type-check (`npm run lint`), and production build (`npm run build`) on pushes and pull requests.
