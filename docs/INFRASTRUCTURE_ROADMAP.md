# Infrastructure Roadmap — PS000125 points 6 & 8 (proposal, not built)

The problem statement asks for modern, scalable IT hardware and infrastructure. That is a
**procurement and deployment programme**, not something this software repository can build — so it
is answered here as a proposal, in tiers a DISCOM IT cell can phase. No current UGVCL inventory is
assumed; sizes must be confirmed by UGVCL's IT team (resource person: hmtcotech2@ugvcl.com).

## Tier 0 — Today (this repo)
- One machine / free-tier VM: Docker Compose (PostgreSQL + FastAPI + React), `make up`.
- Automated backup script (`backend/scripts/backup.sh`); restore = re-import dump + restart.
- Fits pilot: one subdivision's demo traffic, all roles, offline field sync.

## Tier 1 — Pilot hardening (single site)
| Layer | Proposal (indicative, to be sized by UGVCL IT) |
| :--- | :--- |
| Endpoints | Standard office PCs (8 GB+ RAM, SSD) for portal users; Android devices (4 GB+ RAM, GPS, camera) for field staff — the PWA needs no app-store install |
| Server | 1 app/DB server (8 vCPU, 32 GB RAM class) with nightly automated backups to separate storage + weekly off-site copy |
| Network | Subdivision LAN/Wi-Fi + 4G for field sync; offline-first design means sync tolerates 2G/intermittent links (small JSON payloads, retry-safe) |
| Security | HTTPS everywhere (TLS), secrets via environment/secret store, CORS allowlist (already in code), central log collection |

## Tier 2 — Scale (multi-subdivision)
- App tier behind a load balancer (stateless FastAPI replicas); managed PostgreSQL with read replica.
- Redis (already reserved in Compose) for queue/cache; object storage for documents/photos (replaces filename-only uploads).
- Monitoring: Prometheus/Grafana-style metrics, alerting on SLA-risk and error rates (replaces “uptime by assertion” with measured figures).

## Tier 3 — Resilience & future (statement point 10/12)
- Secondary-region standby: RPO/RTO targets agreed with UGVCL (proposal: RPO ≤ 15 min, RTO ≤ 1 h for the portal tier), quarterly restore drills.
- Event backbone (Kafka) + workflow engine (Temporal/Camunda) on the same API contracts; WebSockets for true real-time dashboards.
- Edge evolution: onboarded field devices receive versioned AI **policies** (classifier/SLA models) for on-device inference; fleet telemetry replaces the simulated feeder panel.

**Costing note:** no prices are quoted here — indicative tiers only. Any cost/payback figure in the
synopsis must be labelled an assumption until UGVCL IT validates inventory and rates.
