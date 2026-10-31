# 5-Member Commit Ownership, 2-Minute Video & Deep Technical Viva Plan (`PS000125`)

> **Purpose:** Ensures all 5 team members (**Yogesh**, **Utsav**, **Aakash**, **Sandip**, **Arnav**) have clear domain commit tasks from their own GitHub accounts, a crisp 2-minute module walkthrough script, and deep hyperparameter/code-level answers for live judge questioning.

---

## 1. Pre-Finale Git Commit Plan (3 Genuine Commits per Member in Their Own Module)

Each member clones `main`, creates a role branch (`git checkout -b role/<n>-<feature>`), and opens PRs from their own GitHub account:

| Role & Member | GitHub Handle | 3 Domain-Specific Commits to Push Before Finale |
| :--- | :--- | :--- |
| **Role 1 — Yogesh Kumar Singh** *(Backend & ERP Gateway)* | `@Yogeshsingh123-LAB` | 1. SAP IS-U OData v4 `$filter` query support on `/v1/erp/sap-odata/ServiceOrders`<br>2. Batch reconciliation endpoint test cases in `test_erp_adapter.py`<br>3. Subdivision SLA escalation hook in `workflow.py` |
| **Role 2 — Utsav** *(Frontend, UX & PWA)* | `@utsavmandalia-01` | 1. Interactive reconciliation badge & filter in `EmployeePortal` ERP view<br>2. Keyboard shortcut (`Alt+L`) language cycle accessibility test in `ui-ux-accessibility.test.ts`<br>3. Offline queue retry timestamp indicator in `FieldPortal.tsx` |
| **Role 3 — Aakash Kumar Singh** *(5-Model ML & RAG)* | `@1006coder` | 1. Feature-importance export in `train.py` for `feeder_load_model` & `sla_model`<br>2. Expand `gerc_ugvcl_public_field_benchmark.json` from 54 → 72 public CGRF samples & re-run `evaluate_realworld_benchmark.py`<br>3. Add GERC Clause 4.95 & 4.10 policy citations to `backend/data/policies/` |
| **Role 4 — Sandip** *(Security, DR & CI)* | `@SANDIP29072007` | 1. Push `.github/workflows/ci.yml` (`make coverage` + `cold_start_dr_proof.py` gate)<br>2. Add key-id (`kid`) rotation header support to `encrypt_field_aes256` in `security.py`<br>3. Docker Compose healthcheck + cold-start DR smoke script |
| **Role 5 — Arnav** *(Product, BOM & Demo)* | `@coderAJ22` | 1. Export final 12-slide PDF deck (`docs/deck/`) synced with `DECK_OUTLINE.md`<br>2. Record & link 2-minute per-role walkthrough timestamps in `DEMO_SCRIPT.md`<br>3. Add subdivision pilot KPI measurement sheet to `WORKLOAD_MEASUREMENT.md` |

---

## 2. Deep Technical Viva Questions & Exact Code-Level Answers (By Member)

### Role 3 — Aakash Kumar Singh (`backend/app/ml/`)
1. **"Walk me through the exact `GradientBoostingRegressor` hyperparameters you chose for the 24-hour feeder load forecaster (`train.py`)."**
   - **Answer:** *"In `backend/app/ml/train.py`, we use `OneHotEncoder(handle_unknown='ignore')` on `zone` combined with numerical `hour (0–23)`, `ambient_temp_c`, `rated_capacity_kva`, `pending_sanction_kw`, and `is_weekend`, feeding `GradientBoostingRegressor(n_estimators=140, max_depth=4, learning_rate=0.07, subsample=0.85, random_state=42)`. `max_depth=4` captures the non-linear interaction between afternoon `>40°C` heat and evening `19:00–21:00` residential peak without overfitting synthetic noise, while `subsample=0.85` (stochastic gradient boosting) regularizes variance — yielding held-out `R² = 0.9790` and `MAE = 8.89 kVA` across `n=240` test rows."*
2. **"How did you raise SLA breach recall from `0.62` to `0.8913`, and why `threshold = 0.38`?"**
   - **Answer:** *"In utility SLA management, missing a real breach (false negative) is far costlier than flagging a borderline request for early officer attention. We trained a cost-sensitive `RandomForestClassifier(n_estimators=220, max_depth=10, min_samples_leaf=2, class_weight={0: 1.0, 1: 1.8})` and lowered the decision threshold from `0.50` to `triage_threshold = 0.38` (`predict.py`), lifting held-out breach recall to `0.8913` while maintaining `0.7810` precision (`F1 = 0.8325`)."*
3. **"How do you prove your NLP classifier works on real Indian DISCOM text rather than memorized templates?"**
   - **Answer:** *"Two ways: first, during training we hold out template index `8` (`[-1]`) per class so test phrasings are unseen (`0.8824` accuracy). Second, `backend/scripts/evaluate_realworld_benchmark.py` asserts `0` string overlap against `synthetic.py` and evaluates `classify_text()` on 54 hand-labeled GERC Supply Code / CGRF & Gujarati-English colloquial complaints (`gerc_ugvcl_public_field_benchmark.json`), achieving **`0.9074` (`49/54`) accuracy** and **`9/9` (`100%`) `CRITICAL` safety recall**, with all 5 boundary errors printed openly in `docs/verification/r3-realworld-text-eval.txt`."*

### Role 4 — Sandip (`security.py`, `uploads.py`, `audit.py`, `dr_failover_drill.py`)
1. **"What happens if we cold-boot the app right now and hit `POST /v1/system/dr-failover-drill`?"**
   - **Answer:** *"Verified by `backend/scripts/cold_start_dr_proof.py` (`docs/verification/r4-cold-start-dr-proof.txt`): with zero pre-configured containers or manual setup, it captures all live `ConnectionRequest` and `AuditLog` rows from the active DB, writes a SHA-256 checksummed replica via `offsite_replicate.sh`, deletes the primary DB file, verifies `sha256sum -c`, promotes the standby in **`~3.5 ms` (`< 60s` SLA)**, checks `PRAGMA integrity_check = ok`, and proves `0` records lost — even recovering a citizen request submitted milliseconds earlier."*
2. **"How are KYC uploads and PII protected at rest?"**
   - **Answer:** *"`uploads.py` checks magic bytes (`%PDF-`, PNG, JPEG) and encrypts files with `HKDF-SHA256` + `AES-256-GCM` (`VFENC1` header + 96-bit random nonce + 128-bit GCM tag), while `security.py` provides `encrypt_field_aes256` for PII fields and `/v1/system/siem-events?format=cef` streams hash-chained `CEF:0` events to ArcSight/Wazuh."*

### Role 1 — Yogesh (`workflow.py`, `routers/erp.py`)
- **Answer on ERP Integration:** *"VidyutFlow is a non-invasive orchestration gateway (`replaces_existing_erp = False`). `POST /v1/erp/gateway/propagate/{id}` maps 1 citizen submission into SAP S/4HANA FI-CA/IS-U OData v4 (`AUFNR` + `VKONT`), e-Urja CIS Billing, and GUVNL 1912 CRM with `0` re-typed fields, and `GET /v1/erp/reconcile` detects cross-system drift."*

### Role 2 — Utsav (`frontend/src/`) & Role 5 — Arnav (`docs/`)
- **Utsav:** Explains `HttpOnly; SameSite=Strict` cookies + tab-memory `backendSession.ts` (`BroadcastChannel` cross-tab guard), `offlineQueue.ts` `client_uuid` deduplication, and 4-language (`en`/`gu`/`hi`/`mr`) lazy chunk splitting (`index-*.js` `224.8 kB`).
- **Arnav:** Explains the 12-point `PS000125` mapping and vendor-sourced BOM (`docs/INFRASTRUCTURE_BOM_SOURCES.md`: CrazyPi/Element14 RPi4 + Evelta Quectel EC200U-CN `₹980` ex-GST → `₹8,000/unit × 500 = ₹40L`, FortiGate 60F SD-WAN, Dell PowerEdge R650xs).
