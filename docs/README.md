# VidyutFlow Documentation Index (`PS000125` — UGVCL)

## Core Problem Statement & Architecture
- [`PS_GAP_ANALYSIS.md`](PS_GAP_ANALYSIS.md) — Blunt requirement-by-requirement gap analysis against official `PS000125`
- [`PS000125_OFFICIAL.md`](PS000125_OFFICIAL.md) — Verbatim official UGVCL problem statement
- [`REQUIREMENT_MAPPING.md`](REQUIREMENT_MAPPING.md) — Complete 12-area requirement mapping (built code vs. simulated/proposal boundaries)
- [`OFFLINE.md`](OFFLINE.md) — Offline field sync: implemented queue/dedupe vs. unimplemented conflict-merge gaps
- [`INFRA_PROPOSAL.md`](INFRA_PROPOSAL.md) — Infrastructure modernisation proposal (explicitly not delivered by prototype)
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — Prototype control plane & ERP integration (simulated) architecture
- [`INFRASTRUCTURE.md`](INFRASTRUCTURE.md), [`INFRASTRUCTURE_BOM_SOURCES.md`](INFRASTRUCTURE_BOM_SOURCES.md) & [`INFRASTRUCTURE_ROADMAP.md`](INFRASTRUCTURE_ROADMAP.md) — Proposed edge hardware (`Raspberry Pi 4 + Quectel EC200U-CN`), MPLS/SD-WAN, Dell R650xs HA, vendor datasheets & 3-tier BOM (`₹14.80L / ₹1.18Cr / ₹7.45Cr`)

## Cybersecurity, Disaster Recovery & API Contract
- [`SECURITY.md`](SECURITY.md) & [`../SECURITY.md`](../SECURITY.md) — STRIDE threat model, Zero-Trust 4-VLAN segmentation, AES-256-GCM field/vault encryption & SIEM `CEF:0` telemetry
- [`PENETRATION_TEST_PLAN.md`](PENETRATION_TEST_PLAN.md) — OWASP Top-10 & CERT-In VAPT verification plan
- [`DISASTER_RECOVERY.md`](DISASTER_RECOVERY.md) — Tiered RPO/RTO targets, SHA-256 offsite replication & live `<60s` Primary → Hot-Standby failover drill (`r4-dr-failover-drill.txt`)
- [`API_CONTRACT.md`](API_CONTRACT.md) & [`api/openapi.json`](api/openapi.json) — Frozen **50-path / 55-operation** versioned `/v1` API contract (`cd backend && python scripts/export_openapi.py`)

## AI, Predictive Services & Empirical Evidence
- [`ML_REPORT.md`](ML_REPORT.md) — All **5 trained `scikit-learn` models**, unseen-template holdout, local `TF-IDF` RAG & optional `Gemini` governance
- [`WORKLOAD_MEASUREMENT.md`](WORKLOAD_MEASUREMENT.md) — Empirical field/click elimination proof (`0` re-typed fields, `0` manual handoffs, `3` staff transitions)
- [`COMPOSE_VERIFICATION.md`](COMPOSE_VERIFICATION.md) & [`STATUS_TRANSITIONS.md`](STATUS_TRANSITIONS.md) — Runtime deployment & state-machine transition rules

## Competition Pitch, Viva Defense & Team Ownership
- [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) — 4-minute live demo script (including 3-System fan-out mock (simulated) & local SQLite backup/restore drill)
- [`DECK_OUTLINE.md`](DECK_OUTLINE.md) & [`SYNOPSIS_ABSTRACT.md`](SYNOPSIS_ABSTRACT.md) — 12-slide presentation structure & portal abstract
- [`DEFENCE_QA.md`](DEFENCE_QA.md), [`TEAM_ROLES.md`](TEAM_ROLES.md) & [`TEAM_COMMIT_AND_VIVA_PLAN.md`](TEAM_COMMIT_AND_VIVA_PLAN.md) — Judge kill-shot Q&A, 5-member module defense & domain commit plan
