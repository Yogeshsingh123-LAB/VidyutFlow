# VidyutFlow — Intelligent Utility Workflow, Predictive AI & Operations Platform

> **Problem Statement `PS000125`** · *Uttar Gujarat Vij Company Limited (UGVCL) · Energy Department · Software*
>
> *Modernizing Electricity Utility Operations Through Workflow Automation, AI Decision-Support, Enterprise ERP Interoperability, Cybersecurity & Resilient Infrastructure*

---

## 1. Executive Summary

**VidyutFlow** replaces fragmented paper registers, disconnected spreadsheets, and manual inter-departmental handoffs across electricity subdivisions with a unified, role-governed digital operations platform spanning **5 operational portals** (`Consumer`, `Subdivision Officer`, `Field Engineer`, `Executive Management`, `System Admin`), **7 configurable utility workflow templates** (`New Connection`, `Load Enhancement/Reduction`, `Rooftop Solar Net-Metering`, `Billing Dispute`, `Meter Fault`, `Outage Escalation`, `Safety Hazard`), **5 trained `scikit-learn` decision-support & predictive models**, a **simulated SAP S/4HANA IS-U OData v4 bidirectional gateway**, **offline-resilient field inspection sync**, and **defense-in-depth security + automated DR failover verification**.

- **Zero manual re-entry**: `0` applicant fields re-typed across staff stages; `0` manual routing handoffs; `3` staff transitions from submission to completion ([`docs/WORKLOAD_MEASUREMENT.md`](docs/WORKLOAD_MEASUREMENT.md)).
- **Multilingual citizen & staff UX**: Full 4-language parity across **English, Gujarati (`ગુજરાતી`), Hindi (`हिन्दी`), and Marathi (`मराठी`)**.
- **Versioned API contract**: **50 paths / 55 HTTP operations** dual-served at `/` and `/v1/*` (`X-API-Version: v1`), snapshot-enforced in CI against [`docs/api/openapi.json`](docs/api/openapi.json).

---

## 2. Architecture & PS000125 Coverage Matrix

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│  React 19 + TypeScript + Tailwind 4 (5 Role Portals · en/gu/hi/mr · Lazy Chunks) │
│  • Consumer Wizard & Saved Premises  • Officer Queue & ERP Console               │
│  • Field Engineer Offline IndexedDB  • Executive AI, Billing & 24h kVA Forecast  │
│  • Admin Staff/Zone/Template Studio, Latency Percentiles & SIEM Security Stream  │
└───────────────────────────────────────┬──────────────────────────────────────────┘
                                        │  Same-origin /api & /api/v1
                                        │  HttpOnly SameSite=Strict Cookie + Verified Bearer
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  FastAPI Control Plane & Non-Invasive ERP Gateway (50 Paths / 55 Operations)     │
│  • Configurable Workflow & Least-Loaded Zone Auto-Routing (workflow.py)          │
│  • 5-Model scikit-learn Suite + Local TF-IDF Policy RAG + Optional Gemini Bridge │
│  • 3-System ERP Gateway Fan-Out (SAP FI-CA/IS-U + e-Urja Billing + 1912 CRM)     │
│  • Master Data Reconciliation Engine + SAP S/4HANA IS-U OData v4 Inbound/Outbound│
│  • HKDF-SHA256 + AES-256-GCM Field & Vault Encryption + SHA-256 Audit + SIEM CEF │
└───────────────────────────────────────┬──────────────────────────────────────────┘
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  SQLAlchemy ORM (SQLite Demo / PostgreSQL 16 Production) + Automated DR Suite    │
│  • backup.sh + offsite_replicate.sh (SHA-256 post-copy vault check)              │
│  • restore_drill.sh (1-byte tamper rejection) + dr_failover_drill.py (0 loss)    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Full 12-area mapping to official `PS000125` requirements: [`docs/REQUIREMENT_MAPPING.md`](docs/REQUIREMENT_MAPPING.md).

---

## 3. Five Trained `scikit-learn` Decision-Support & Predictive Models

> **Provenance & Honesty Boundary:** All 5 models are trained on **synthetic data** (`backend/app/ml/synthetic.py`) with **unseen source-template holdout** so zero template phrasings leak between train and test splits. AI is strictly **advisory (`models_can_approve_or_reject = False`)** — every sanction approval or rejection requires an authenticated human officer ([`docs/ML_REPORT.md`](docs/ML_REPORT.md), [`docs/AI_GOVERNANCE.md`](docs/AI_GOVERNANCE.md)).

| # | Model | Pipeline | Held-Out Synthetic Metric | Majority Baseline | Live Endpoint / Screen |
| :-: | :--- | :--- | :--- | :--- | :--- |
| 1 | **Category Triage** | Word `(1,2)` `TfidfVectorizer` + `LogisticRegression` | **Accuracy `0.8824`** · Macro-F1 `0.8620` | `0.1667` | `POST /v1/requests` auto-routing |
| 2 | **Severity & Safety Escalation** | Balanced `TF-IDF` + `LogisticRegression` + life-safety rule guardrail | **Balanced Acc `0.8750`** · **`CRITICAL` Recall `100%` (`17/17`)** | `0.3333` | Emergency queue prioritization |
| 3 | **Calibrated SLA Breach Risk** | `OneHotEncoder` + Cost-Sensitive `RandomForest` (`threshold = 0.38`) | **Breach Recall `0.8913`** · Accuracy `0.8350` | `0.5400` | `LiveSlaRiskWatchlist` + reason codes |
| 4 | **Billing Anomaly Detector** | `IsolationForest` + deterministic GERC RGPU tariff-slab verifier | **Accuracy `0.9511`** · **Anomaly Recall `1.000`** · F1 `0.8706` | `0.8356` | `POST /v1/assistant/billing-anomaly` & `LivePredictiveDecisionPanel` |
| 5 | **24h Feeder / DTR Load Forecaster** | `OneHotEncoder` + `GradientBoostingRegressor` | **`R² = 0.9790`** · **`MAE = 8.89 kVA`** | Mean kVA | `GET /v1/assistant/load-forecast` & 24h kVA chart |

### Hybrid Operational Assistant (`TF-IDF` Policy RAG + Live SQL + Optional `Gemini`)
- **Offline-first deterministic core (`POST /v1/assistant/chat`)**: Answers live operational queries (including **zone-ranked SLA breach analysis**: *"Which zone has highest breach risk and why?"*), consumer status checks, and cited UGVCL policy passages via local `TfidfVectorizer` cosine retrieval (`backend/data/policies/*.md`) with zero external API dependency.
- **Optional server-side Gemini synthesis**: When `GEMINI_API_KEY` is set on the server, conversational synthesis runs with a strict `3,500ms` timeout and read-only tool grounding, explicitly badged in the UI.

---

## 4. Cybersecurity, ERP Interoperability, DR & Infrastructure Readiness

- **Zero `localStorage` Tokens**: Sessions use `HttpOnly; SameSite=Strict` cookies (`/auth/login?use_cookie=true`) paired with an in-memory, portal-verified session bridge (`backendSession.ts`) that purges legacy storage keys and fails closed on cross-tab mismatches.
- **Magic-Byte Validation & AES-256-GCM Encryption at Rest**: `POST /v1/requests/with-document` verifies `%PDF-` / PNG / JPEG / UTF-8 magic signatures, enforces `MAX_UPLOAD_BYTES` (`5 MiB`), and encrypts document bytes using **HKDF-SHA256 + AES-256-GCM (`VFENC1` envelope)** before vault storage (`UPLOAD_VAULT_DIR`).
- **Tamper-Evident Audit Chain & SIEM Export**: Every state transition, ERP sync, alert dispatch, and template edit appends to a serialized, fork-proof **SHA-256 hash chain** (`AuditChainHead` + `GET /v1/requests/audit/verify`) exportable by Admins in **ArcSight/Wazuh `CEF:0` or JSON** (`GET /v1/system/siem-events`).
- **HTTP Security Headers**: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` on `/auth/*`, and production `Strict-Transport-Security`.
- **Non-Invasive Multi-System ERP Gateway ("Enter Once, Propagate Everywhere")**: Connects — without replacing — **SAP S/4HANA FI-CA/IS-U OData v4** (`/v1/erp/sap-odata/*`), **UGVCL e-Urja CIS Billing**, and **GUVNL 1912 Grievance CRM** via `POST /v1/erp/gateway/propagate/{id}` (`0` re-typed fields) plus automated **Master Data Reconciliation** (`GET /v1/erp/reconcile` & `POST /v1/erp/reconcile/{id}`).
- **Live `<60s` Primary → Hot-Standby DR Failover Drill**: `backup.sh`, `offsite_replicate.sh`, `restore_drill.sh`, `dr_failover_drill.py`, and live browser-clickable `POST /v1/system/dr-failover-drill` (`<1s` promotion, `0` records lost, `PRAGMA integrity_check = ok`) ([`docs/DISASTER_RECOVERY.md`](docs/DISASTER_RECOVERY.md)).
- **Cloud-to-Edge IT Infrastructure & Hardware BOM**: Substation **Raspberry Pi 4 + Quectel Dual-SIM 4G LTE Cat-4 edge concentrators (`~₹8,000 × 500 = ₹40L`)**, IP65 field handhelds, BSNL/GFGNL MPLS + SD-WAN failover, and 3-tier Subdivision (`₹14.80 Lakh`), Circle HA (`₹1.18 Crore`), and Full UGVCL DISCOM (`₹7.45 Crore`) BOM ([`docs/INFRASTRUCTURE.md`](docs/INFRASTRUCTURE.md), [`docs/INFRASTRUCTURE_ROADMAP.md`](docs/INFRASTRUCTURE_ROADMAP.md)).

---

## 5. Quick Start & Demo Credentials

### Option A — Local Development (Backend + Frontend)

```bash
# 1. Backend (FastAPI on :8000 — auto-seeds demo users, 7 workflow templates & trains 5 sklearn models)
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cd backend && ../.venv/bin/uvicorn app.main:app --reload --port 8000

# 2. Frontend (Vite + Node middleware on :3000)
cd frontend && npm install && npm run dev
```

### Option B — Docker Compose

```bash
docker compose up --build
```

### Demo Accounts (Seeded Locally)

| Portal Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Consumer** | `consumer@vidyut.local` | `Consumer@123` | Own requests, saved premises, document upload, bill anomaly check |
| **Subdivision Officer** | `officer@vidyut.local` | `Officer@123` | `North` zone queue, approvals, SAP IS-U OData v4 sync, alerts |
| **Field Engineer** | `engineer@vidyut.local` | `Engineer@123` | Assigned `North` inspections, offline IndexedDB queue & `client_uuid` sync |
| **Admin / Executive** | `admin@vidyut.local` | `Admin@123` | All zones, AI Governance, 24h Load Forecast, Staff/Template Studio, SIEM stream |

---

## 6. Automated Verification Gates

```bash
# Backend: 112 pytest assertions (RBAC, transitions, 5 ML models, OData v4, AES-256-GCM vault, SIEM, DR drill, OpenAPI)
cd backend && ../.venv/bin/pytest -q tests

# Frontend: TypeScript strict check + 38 end-to-end/unit/i18n/security suites + production bundle build
cd frontend && npm run lint && npm test && npm run build
```

---

## 7. Key Documentation Index

- [`docs/PS000125_OFFICIAL.md`](docs/PS000125_OFFICIAL.md) — Verbatim official problem statement
- [`docs/REQUIREMENT_MAPPING.md`](docs/REQUIREMENT_MAPPING.md) — Complete 12-area PS000125 mapping & honesty boundaries
- [`docs/INFRASTRUCTURE.md`](docs/INFRASTRUCTURE.md) & [`docs/INFRASTRUCTURE_ROADMAP.md`](docs/INFRASTRUCTURE_ROADMAP.md) — Edge hardware (`Raspberry Pi 4 + 4G`), MPLS/SD-WAN, NVMe RAID-10 & 3-tier BOM
- [`docs/SECURITY.md`](docs/SECURITY.md) & [`SECURITY.md`](SECURITY.md) — STRIDE threat model, Zero-Trust VLANs, AES-256-GCM field/vault encryption & SIEM `CEF:0`
- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) & [`docs/api/openapi.json`](docs/api/openapi.json) — Frozen 50-path / 55-operation `/v1` API specification
- [`docs/ML_REPORT.md`](docs/ML_REPORT.md) — 5-model `scikit-learn` evaluation, template holdout & human-approval governance
- [`docs/DISASTER_RECOVERY.md`](docs/DISASTER_RECOVERY.md) — RPO/RTO matrix, offsite SHA-256 vault replication & `<60s` Primary→Standby failover drill
- [`docs/TEAM_ROLES.md`](docs/TEAM_ROLES.md) & [`docs/DEFENCE_QA.md`](docs/DEFENCE_QA.md) — 5-member ownership map & viva defense Q&A
