# QUICK AUDIT PACK — Complete Reviewer Snapshot (`PS000125` · UGVCL)

> **Reviewer Context:** **VidyutFlow** is a **Non-Invasive Enterprise ERP Orchestration, 5-Model Predictive AI & Cloud-to-Edge Operations Platform** built for **Uttar Gujarat Vij Company Limited (`PS000125`)**.
> - **Repository**: `https://github.com/Yogeshsingh123-LAB/VidyutFlow`
> - **API Surface**: **50 paths / 55 HTTP operations** dual-served at `/` and `/v1/*` (`X-API-Version: v1`), snapshot-enforced in CI against `docs/api/openapi.json`.
> - **Automated Verification**: **`112` backend `pytest` tests + `38` frontend test suites**, `tsc --noEmit` (`0` errors), and production Vite chunks `< 390 kB` (`index-*.js` `224.8 kB` / `56.8 kB` gzip).

---

## 1. Executive Summary & Core Capabilities

1. **Non-Invasive Heterogeneous ERP API Gateway (*"Enter Once, Propagate Everywhere"*)**:
   - Connects — **without replacing** — **SAP S/4HANA FI-CA/IS-U OData v4** (`/v1/erp/sap-odata/{metadata,ServiceOrders,ServiceOrders/inbound-ack}`), **UGVCL e-Urja CIS Billing**, and **GUVNL 1912 Grievance CRM** via `POST /v1/erp/gateway/propagate/{request_id}` (`applicant_fields_retyped = 0`) and **Master Data Reconciliation** (`GET /v1/erp/reconcile` & `POST /v1/erp/reconcile/{request_id}`).
2. **Cloud-to-Edge IT Infrastructure & Hardware BOM (`docs/INFRASTRUCTURE.md` & `docs/INFRASTRUCTURE_ROADMAP.md`)**:
   - **Substation Edge**: **500× Industrial Raspberry Pi 4 / CM4 (8 GB RAM, 64 GB eMMC) + Quectel EC200U-CN Dual-SIM 4G LTE Cat-4 modem + RS-485 DLMS bridge (`~₹8,000/unit = ₹40.00 Lakh`)** + IP65 Android field handhelds running offline IndexedDB `client_uuid` sync (`POST /v1/requests/field-sync`).
   - **Network & Cloud**: Primary **BSNL/GFGNL MPLS L3VPN** + **SD-WAN dual-carrier 4G/5G failover**, 4-VLAN Zero-Trust segmentation, NVMe RAID-10 PostgreSQL 16 HA clusters, and costed 3-tier rollout (`₹14.80 Lakh` Subdivision · `₹1.18 Crore` Circle HA · `₹7.45 Crore` Full DISCOM).
3. **Live `<60s` Primary → Hot-Standby Disaster Recovery Drill (`docs/DISASTER_RECOVERY.md`)**:
   - `backend/scripts/dr_failover_drill.py` and live browser-clickable `POST /v1/system/dr-failover-drill` destroy the primary database, verify SHA-256 checksums in the hot-standby vault (`offsite_replicate.sh`), promote the replica in **`< 1 second` (`< 60s` SLA)**, verify `PRAGMA integrity_check = ok`, and prove **`0` records lost**.
4. **Five Trained `scikit-learn` Models (Unseen-Template Synthetic Holdout — `docs/ML_REPORT.md`)**:
   - `category_model.joblib`: **`0.8824` accuracy** (majority baseline `0.1667`)
   - `severity_model.joblib`: **`0.8750` balanced accuracy · `100%` (`17/17`) `CRITICAL` recall**
   - `sla_model.joblib`: Cost-Sensitive `RandomForest` (`threshold = 0.38`) — **`0.8913` breach recall** (`0.8350` acc)
   - `billing_anomaly_model.joblib`: `IsolationForest` + GERC RGPU slab verifier — **`0.9511` accuracy · `1.000` anomaly recall** (`POST /v1/assistant/billing-anomaly`)
   - `feeder_load_model.joblib`: `GradientBoostingRegressor` 24h 11kV feeder/DTR kVA forecast — **`R² = 0.9790` · `MAE = 8.89 kVA`** (`GET /v1/assistant/load-forecast`)
   - Plus offline `TF-IDF` policy RAG + live zone-breach SQL Q&A (`/v1/assistant/chat`) + optional `3,500ms`-bounded server-side `Gemini` (`/api/ai-chat`), strictly governed by human-only officer approvals (`models_can_approve_or_reject = False`).
5. **Defense-in-Depth Cybersecurity (`docs/SECURITY.md` & `SECURITY.md`)**:
   - Zero `localStorage` tokens (`HttpOnly; SameSite=Strict` cookies + verified in-memory bridge), **HKDF-SHA256 + AES-256-GCM** field (`encrypt_field_aes256`) & KYC document vault (`VFENC1`) encryption at rest, `100%` parameterized ORM SQLi defense, XSS sanitization, `CSP`/`HSTS`/`X-Frame-Options: DENY`, fork-proof SHA-256 `AuditLog` hash chain, **ArcSight/Wazuh `CEF:0` SIEM export** (`/v1/system/siem-events`), and live crypto posture check (`/v1/system/security-posture`).

---

## 2. Repository Structure (Key Modules)

```text
├── .github/workflows/ci.yml              # Backend pytest + Frontend 38 suites + tsc + Vite build
├── backend/
│   ├── app/
│   │   ├── assistant/                    # Local TF-IDF policy RAG + live zone-breach SQL Q&A
│   │   ├── ml/                           # 5 scikit-learn models, unseen-template holdout & AI governance
│   │   ├── routers/                      # auth, requests, workflows, staff, erp (SAP OData + 3-system gateway), assistant, notifications, system (SIEM + DR + security)
│   │   ├── audit.py                      # Serialized fork-proof SHA-256 hash chain (AuditChainHead)
│   │   ├── security.py                   # bcrypt, JWT, HKDF-SHA256 + AES-256-GCM field cipher & XSS sanitizer
│   │   ├── uploads.py                    # Magic-byte verification + VFENC1 AES-256-GCM KYC document vault
│   │   └── workflow.py                   # Configurable 7-template routing, validation & SLA engine
│   ├── scripts/                          # backup.sh, offsite_replicate.sh, restore_drill.sh, dr_failover_drill.py, export_openapi.py
│   └── tests/                            # 112 pytest tests incl. test_judge_gap_closure.py & test_api_contract.py
├── frontend/
│   ├── src/
│   │   ├── components/                   # 5 RBAC portals + LiveAiGovernancePanel + LivePredictiveDecisionPanel
│   │   ├── i18n/                         # Full 4-language dictionaries (English, Gujarati, Hindi, Marathi)
│   │   ├── server/                       # Standalone Node auth, rate-limit & 3,500ms-bounded Gemini middleware
│   │   └── utils/                        # backendSession.ts (in-memory + HttpOnly cookie), offlineQueue.ts, fastApiClient.ts
│   └── tests/                            # 38 end-to-end security, i18n, bundle-budget & integration suites
└── docs/                                 # INFRASTRUCTURE.md, SECURITY.md, DISASTER_RECOVERY.md, ML_REPORT.md, API_CONTRACT.md, REQUIREMENT_MAPPING.md, TEAM_ROLES.md
```

---

## 3. One-Command Verification

```bash
# Backend (112 passed)
cd backend && ../.venv/bin/pytest -q tests

# Frontend (tsc 0 errors + 38 suites passed + production build)
cd frontend && npm run lint && npm test && npm run build
```
