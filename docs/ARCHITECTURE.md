# System & Integration Architecture — VidyutFlow (`PS000125`)

Hardware, edge concentrator, SD-WAN/MPLS network, and server/storage specifications: [`docs/INFRASTRUCTURE.md`](INFRASTRUCTURE.md) · Threat model & Zero-Trust controls: [`docs/SECURITY.md`](SECURITY.md).

## Cloud-to-Edge & Non-Invasive ERP Orchestration

VidyutFlow is architected as a **non-invasive orchestration, AI decision-support, and cloud-to-edge integration plane** — it **connects** citizen portals, subdivision officers, offline field engineers, and UGVCL's heterogeneous enterprise systems (**SAP S/4HANA FI-CA/IS-U**, **e-Urja CIS Billing**, and **GUVNL 1912 Grievance CRM**) without requiring a rip-and-replace migration.

```text
Consumer / Subdivision Officer / Field JE / Executive / Admin (React 19 + TS · en/gu/hi/mr)
        │  ├─ Phase 10 Smart Outage Map (Leaflet + offline schematic fallback + citizen GPS redaction)
        │  └─ Phase 11 Local Tesseract.js WASM OCR (Web Worker) + IndexedDB v3 offline sync queue
        │
        ├── Node / Vite Runtime Gateway (:3000 dev / :5173 prod — prodServer.ts & runtimeMiddleware.ts)
        │     ├─ /api/auth/* (HttpOnly SameSite=Lax vidyutflow_sid cookie + scrypt + CSRF)
        │     ├─ /api/ai-chat (Vidyut Mitra role co-pilots: optional server-side Gemini 3,500ms deadline
        │     │                + read-only grounded tools → deterministic Grounded Engine fallback)
        │     └─ /api/meter-readings/* (Phase 11 maker-checker meter review & read-only bill check)
        │
        └── /api/* & /api/v1/* (Same-origin proxy · verified Bearer + 15m rotating refresh session)
              ▼
FastAPI Control Plane & Non-Invasive Enterprise API Gateway (78 Paths / 88 HTTP Operations)
 ├─ Auth, RBAC, Staff TOTP MFA & Zone Isolation · HKDF-SHA256 + AES-256-GCM field & document vault encryption
 ├─ Phase 12 Distribution Transformer Fleet Health (HMAC telemetry ingestion, rules engine, SSE streaming, XGBoost + SHAP risk)
 ├─ Phase 13 Verified Field Completion (/v1/evidence/* — client_uuid idempotent, staff-only BOLA, officer review)
 ├─ Fork-proof SHA-256 AuditLog hash chain + ArcSight/Wazuh CEF:0 SIEM export (/v1/system/siem-events)
 ├─ Configurable Workflow Engine: validate → ML triage → calibrated SLA risk → zone auto-assign
 ├─ 5 Trained scikit-learn Models (unseen-template synthetic holdout):
 │    1. Category Classifier (0.8824 acc)       2. Severity + Safety Guardrail (100% CRITICAL recall)
 │    3. SLA Breach Risk RF (0.8913 recall)     4. Billing Anomaly IsolationForest (0.9511 acc / 1.00 recall)
 │    5. 24h Feeder/DTR Load GBR (R² = 0.9790)  + Local TF-IDF Policy RAG (/v1/assistant/chat)
 ├─ ERP integration (simulated) ("Enter Once, Propagate Everywhere"):
 │    ├─ SAP-shaped OData v4 mock (simulated; not connected to SAP) (/v1/erp/sap-odata/* — AUFNR + VKONT + inbound-ack)
 │    ├─ 3-System fan-out mock (simulated) (/v1/erp/gateway/propagate/{id} → mock SAP + e-Urja Billing + 1912 CRM)
 │    └─ Simulated Master Data Reconciliation (/v1/erp/reconcile — in-repo drift check & 1-click sync)
 └─ Edge Offline Sync & Live Hot-Standby DR:
      ├─ Idempotent Field Sync (POST /v1/requests/field-sync & POST /v1/evidence — client_uuid UNIQUE)
      └─ Automated Primary → Hot-Standby Failover Drill (POST /v1/system/dr-failover-drill — <1s RTO, 0 loss)
              ▼
PostgreSQL 16 Primary + Hot Standby (Docker/Prod) / SQLite Local · Offsite SHA-256 Backup Vault
```
