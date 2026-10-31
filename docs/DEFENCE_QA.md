# Judge Kill-Shot Defence Q&A — VidyutFlow (`PS000125` · UGVCL)

Sources: [`REQUIREMENT_MAPPING.md`](REQUIREMENT_MAPPING.md) · [`ML_REPORT.md`](ML_REPORT.md) · [`INFRASTRUCTURE.md`](INFRASTRUCTURE.md) · [`SECURITY.md`](SECURITY.md) · [`API_CONTRACT.md`](API_CONTRACT.md).

---

## A. The 5 High-Stakes "Kill-Shot" Judge Questions

1. **"UGVCL already runs SAP for finance, e-Urja for billing, and 1912 for grievances. Are you asking us to rip and replace them?"**
   - **Answer:** **Never.** VidyutFlow is a **non-invasive orchestration & OData v4-compatible ERP gateway** (`replaces_existing_erp = False`). Today it runs against a **simulated in-repo target** (`is_simulated: true`) ready for UGVCL sandbox credentials: a citizen enters `12` fields once, `POST /v1/erp/gateway/propagate/{id}` fans out canonical records simultaneously to **SAP S/4HANA FI-CA/IS-U OData v4-compatible endpoints** (`AUFNR` + `VKONT`), **e-Urja CIS Billing**, and **GUVNL 1912 CRM** with **`0` re-typed fields**, while `GET /v1/erp/reconcile` detects and repairs cross-system master-data drift in 1 click.

2. **"The PS title explicitly says IT Infrastructure. Where is the hardware, edge, and network architecture?"**
   - **Answer:** Specified end-to-end in [`docs/INFRASTRUCTURE.md`](INFRASTRUCTURE.md), backed by real distributor SKUs & datasheets in [`docs/INFRASTRUCTURE_BOM_SOURCES.md`](INFRASTRUCTURE_BOM_SOURCES.md), and costed across 3 tiers (`₹14.80 Lakh` Subdivision · `₹1.18 Crore` Circle HA · `₹7.45 Crore` Full DISCOM in [`INFRASTRUCTURE_ROADMAP.md`](INFRASTRUCTURE_ROADMAP.md)): **500× Substation Industrial Raspberry Pi 4 + Quectel EC200U-CN Dual-SIM 4G LTE concentrators (`₹8,000/unit = ₹40L`)**, IP65 Android field handhelds with offline `client_uuid` sync, **BSNL/GFGNL MPLS + FortiGate 60F SD-WAN failover**, Dell R650xs NVMe RAID-10 PostgreSQL 16 HA clusters, and 4-VLAN Zero-Trust segmentation.

3. **"Anyone can write `backup.sh`. Show me you can survive a database crash right now."**
   - **Answer:** Click **"Live DR Drill: Kill DB & Failover"** in `ManagementPortal` (`POST /v1/system/dr-failover-drill`) or run `python backend/scripts/cold_start_dr_proof.py` on a fresh cold boot: it creates a live citizen request, replicates a SHA-256 verified hot-standby snapshot, destroys the primary database file, promotes the replica in **`~3.5 ms` (`< 60s` RTO target)**, runs `PRAGMA integrity_check = ok`, and proves **`0` records lost**.

4. **"Are your ML models production-credible, or do they miss breaches / leak synthetic templates?"**
   - **Answer:** Every NLP model holds out **unseen source templates (`tpl_id == 8`)** so zero phrasings leak into test splits, and we ship **5 trained `scikit-learn` models**: Category **`0.8824`** unseen-template synthetic + **`0.9074` (`49/54`) on our team-authored 54-item zero-overlap OOD sanity-check set** (grounded in public GERC/CGRF terminology; explicitly labeled as team-authored, not independent utility data), Severity **`100%` `CRITICAL` recall**, Cost-Sensitive SLA Breach **`0.8913` breach recall** (`threshold = 0.38`), `IsolationForest` **Billing Anomaly (`0.9511` acc / `1.00` recall)**, and `GradientBoostingRegressor` **24h Feeder Load (`R² = 0.9790`)** — all strictly advisory (`models_can_approve_or_reject = False`) with human officer sign-off.

5. **"Is security prototype-grade (`localStorage` JWTs, fake PDF uploads, unencrypted files)?"**
   - **Answer:** Hardened end-to-end ([`docs/SECURITY.md`](SECURITY.md)) and verified across **`124` backend `pytest` tests (`55/55` OpenAPI operations = `100%`)**: **zero `localStorage` tokens** (`HttpOnly; SameSite=Strict` cookies + verified in-memory bridge), **strict `%PDF-` / PNG / JPEG / UTF-8 `.txt` magic-byte upload checks** (`validate_magic_bytes` rejecting disguised PE/MZ & ELF executables with `400`), **always-on `VFENC1` HKDF-SHA256 + AES-256-GCM vault encryption** (`uploads_encrypted/` by default) + PII field cipher, `CSP`/`HSTS`/`X-Frame-Options: DENY`, fork-proof **SHA-256 hash-chained `AuditLog`**, and **ArcSight/Wazuh `CEF:0` SIEM export** (`/v1/system/siem-events`).

---

## B. Hybrid AI Question (`TF-IDF` vs `Gemini`)

- **Do you depend on an external LLM API?** — No. All 5 `scikit-learn` triage/predictive models and `POST /v1/assistant/chat` policy citations (`TF-IDF` cosine retrieval over `backend/data/policies/*.md` + live scoped SQL queries) run **100% offline/locally**. The portal co-pilot (`/api/ai-chat`) optionally invokes server-side `Gemini` with read-only tools under a strict `3,500ms` timeout and falls back automatically to the deterministic `Grounded Engine`.
