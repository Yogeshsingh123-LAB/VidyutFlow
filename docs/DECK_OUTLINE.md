# 12-Slide Presentation Deck Outline — VidyutFlow (`PS000125`)

Rules: every metric is badged **measured (code)**, **synthetic (held-out ML)**, or **costed architecture (BOM)** — zero unverified production claims.

| # | Slide | Core Content & Live Demo Hook |
| :-: | :--- | :--- |
| 1 | **Title & Vision** | VidyutFlow — Non-Invasive ERP Orchestration, Predictive AI & Cloud-to-Edge IT Architecture for UGVCL (`PS000125`). *"Enter Once, Propagate Everywhere."* |
| 2 | **The UGVCL Silo Problem** | Disconnected Citizen Portal ↔ SAP S/4HANA Finance/IS-U ↔ e-Urja CIS Billing ↔ 1912 Grievance CRM + rural North Gujarat 2G/4G dead-zones + reactive SLA discovery. |
| 3 | **Non-Invasive ERP Gateway** | **Does NOT replace SAP or e-Urja** — connects them via `/v1/erp/sap-odata/*`, `/v1/erp/gateway/propagate/{id}` (3-system fan-out, `0` re-typed fields), and `/v1/erp/reconcile` (master-data drift detection & 1-click sync). |
| 4 | **Cloud-to-Edge IT Infrastructure** | [`docs/INFRASTRUCTURE.md`](INFRASTRUCTURE.md): Substation Raspberry Pi 4 + Quectel Dual-SIM 4G LTE concentrators (`₹8,000 × 500 = ₹40L`), IP65 field handhelds, BSNL/GFGNL MPLS + SD-WAN failover, 3-tier `₹14.80L / ₹1.18Cr / ₹7.45Cr` BOM. |
| 5 | **Live Multi-Portal & Offline Sync Demo** | 5 RBAC portals (`en`/`gu`/`hi`/`mr`) · 7 configurable workflows · Airplane-mode IndexedDB `client_uuid` field sync (idempotent replay). |
| 6 | **Live `<60s` DR Kill-Switch Demo** | Trigger `POST /v1/system/dr-failover-drill` (or `dr_failover_drill.py`) live on stage: **Destroy Primary DB → Verify SHA-256 → Promote Hot Standby in `<1s` → `0` records lost**. |
| 7 | **5-Model Predictive AI Suite** | Unseen-template synthetic holdout: Category **`0.8824`**, Severity **`100%` `CRITICAL` recall**, Calibrated SLA Breach **`0.8913` recall**, `IsolationForest` Billing Anomaly (**`0.9511` acc / `1.00` recall**), `GBR` 24h Feeder Load (**`R² = 0.9790`**). |
| 8 | **Hybrid AI Governance** | Local `TF-IDF` policy RAG + live zone-breach SQL analytics + optional server-side `Gemini` (`3.5s` bound) · **Humans Approve (`models_can_approve_or_reject = False`)**. |
| 9 | **Defense-in-Depth Cybersecurity** | [`docs/SECURITY.md`](SECURITY.md): Zero `localStorage` tokens (`HttpOnly; SameSite=Strict`), **HKDF-SHA256 + AES-256-GCM** field & KYC vault encryption, fork-proof SHA-256 audit chain, **ArcSight/Wazuh `CEF:0` SIEM export**, 4-VLAN Zero Trust. |
| 10 | **Complete 12-Point `PS000125` Coverage** | Full matrix from [`docs/REQUIREMENT_MAPPING.md`](REQUIREMENT_MAPPING.md) + `112` backend tests + `38` frontend suites + frozen `50`-path / `55`-op OpenAPI contract. |
| 11 | **Phased UGVCL Rollout** | Phase 1: 1 Subdivision Pilot (`₹14.80L`) + anonymized UGVCL historical log retraining → Phase 2: 1 Circle HA (`₹1.18Cr`) → Phase 3: Full DISCOM (`₹7.45Cr`). |
| 12 | **5-Member Team & Ownership** | Module-by-module ownership across Backend/ERP Gateway, Frontend/i18n PWA, 5-Model ML/RAG, DevOps/Security/DR, and Product/Infra Architecture ([`docs/TEAM_ROLES.md`](TEAM_ROLES.md)). |
