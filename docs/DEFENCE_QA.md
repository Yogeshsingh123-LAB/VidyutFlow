# Judge Kill-Shot Defence Q&A — VidyutFlow (`PS000125` · UGVCL)

Sources: [`REQUIREMENT_MAPPING.md`](REQUIREMENT_MAPPING.md) · [`ML_REPORT.md`](ML_REPORT.md) · [`INFRASTRUCTURE.md`](INFRASTRUCTURE.md) · [`SECURITY.md`](SECURITY.md) · [`API_CONTRACT.md`](API_CONTRACT.md).

---

## A. The 5 High-Stakes "Kill-Shot" Judge Questions

1. **"UGVCL already runs SAP for finance, e-Urja for billing, and 1912 for grievances. Are you asking us to rip and replace them?"**
   - **Answer:** **Never.** VidyutFlow is a **non-invasive orchestration & API gateway layer** (`replaces_existing_erp = False`). A citizen enters `12` fields once; `POST /v1/erp/gateway/propagate/{id}` fans out canonical records simultaneously to **SAP S/4HANA FI-CA/IS-U OData v4** (`AUFNR` + `VKONT`), **e-Urja CIS Billing**, and **GUVNL 1912 CRM** with **`0` re-typed fields**, while `GET /v1/erp/reconcile` detects and repairs cross-system master-data drift in 1 click.

2. **"The PS title explicitly says IT Infrastructure. Where is the hardware, edge, and network architecture?"**
   - **Answer:** Specified end-to-end in [`docs/INFRASTRUCTURE.md`](INFRASTRUCTURE.md) and costed across 3 tiers (`₹14.80 Lakh` Subdivision · `₹1.18 Crore` Circle HA · `₹7.45 Crore` Full DISCOM in [`INFRASTRUCTURE_ROADMAP.md`](INFRASTRUCTURE_ROADMAP.md)): **500× Substation Industrial Raspberry Pi 4 + Quectel Dual-SIM 4G LTE Cat-4 edge concentrators (`~₹8,000/unit = ₹40L`)**, IP65 Android field handhelds with offline `client_uuid` sync, **BSNL/GFGNL MPLS + SD-WAN automatic failover**, NVMe RAID-10 PostgreSQL 16 HA clusters, and 4-VLAN Zero-Trust segmentation.

3. **"Anyone can write `backup.sh`. Show me you can survive a database crash right now."**
   - **Answer:** Click **"Live DR Drill: Kill DB & Failover"** in `ManagementPortal` (`POST /v1/system/dr-failover-drill` or `python backend/scripts/dr_failover_drill.py`): it destroys the primary database file, verifies the SHA-256 digest of the hot-standby vault snapshot, promotes the replica in **`< 1 second` (`< 60s` RTO target)**, runs `PRAGMA integrity_check = ok`, and proves **`0` records lost**.

4. **"Are your ML models production-credible, or do they miss breaches / leak synthetic templates?"**
   - **Answer:** Every NLP model holds out **unseen source templates (`tpl_id == 8`)** so zero phrasings leak into test splits, and we ship **5 trained `scikit-learn` models**: Category **`0.8824`**, Severity **`100%` (`17/17`) `CRITICAL` recall**, Cost-Sensitive SLA Breach **`0.8913` breach recall** (`threshold = 0.38`), `IsolationForest` **Billing Anomaly (`0.9511` acc / `1.00` recall)**, and `GradientBoostingRegressor` **24h Feeder Load (`R² = 0.9790`)** — all strictly advisory (`models_can_approve_or_reject = False`) with human officer sign-off.

5. **"Is security prototype-grade (`localStorage` JWTs, plaintext uploads, basic logs)?"**
   - **Answer:** Hardened end-to-end ([`docs/SECURITY.md`](SECURITY.md)): **zero `localStorage` tokens** (`HttpOnly; SameSite=Strict` cookies + verified in-memory bridge), **HKDF-SHA256 + AES-256-GCM encryption at rest** for both PII fields (`encrypt_field_aes256`) and KYC documents (`VFENC1` vault), `CSP`/`HSTS`/`X-Frame-Options: DENY`, fork-proof **SHA-256 hash-chained `AuditLog`**, and **ArcSight/Wazuh `CEF:0` SIEM export** (`/v1/system/siem-events`).

---

## B. Hybrid AI Question (`TF-IDF` vs `Gemini`)

- **Do you depend on an external LLM API?** — No. All 5 `scikit-learn` triage/predictive models and `POST /v1/assistant/chat` policy citations (`TF-IDF` cosine retrieval over `backend/data/policies/*.md` + live scoped SQL queries) run **100% offline/locally**. The portal co-pilot (`/api/ai-chat`) optionally invokes server-side `Gemini` with read-only tools under a strict `3,500ms` timeout and falls back automatically to the deterministic `Grounded Engine`.
