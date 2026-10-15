# Scale-up roadmap (slides only — NOT built in VidyutOS Lite)
| Module | Built now (demo-ready) | Roadmap slide only |
|---|---|---|
| Unified dashboard | React, role-based views, login, live KPIs | GraphQL, GIS outage map, WebSockets |
| Workflow automation | Rule-based backend workflow, SLA + audit log | Temporal/Camunda, Kafka |
| AI assistant | TF-IDF RAG over policies + live data queries (no external LLM) | Fine-tuned LLM, private VPC |
| Offline field ops | PWA queue + UUID de-duplication on sync | Flutter, Couchbase, CRDT |
| Security & DR | JWT+RBAC, bcrypt hashing, audit logs, Docker Compose, backup script | Zero Trust, multi-AZ failover, Vault |
| Predictive maintenance | Clearly-labelled simulated/SLA-risk demo only | Real SCADA / sensor feeds |
All baseline figures in the design document (5–10% lost requests, 85% data accuracy, ₹500/connection, 18–24 month payback, 70%/85%/99.9% targets) are **assumptions/targets, not UGVCL published numbers**.

## Repo hygiene / next engineering steps
- Add the GitHub Actions workflow (backend `pytest` + frontend `npm run build`) — needs a token with
  `workflow` scope, or paste it via the GitHub web UI ("Actions → New workflow"). The exact YAML was
  validated locally during cleanup and can be re-added in one commit.
