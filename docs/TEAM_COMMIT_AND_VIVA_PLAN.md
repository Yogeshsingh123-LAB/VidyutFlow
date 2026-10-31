# 5-Member Rehearsal, "Show Me Where This Happens" Code Map & Deep Viva Guide (`PS000125`)

> **Golden Rule Before 6 Nov Finale — FEATURE FREEZE:** Do **not** add new endpoints or features that expand code size. Spend rehearsal time walking the live core flow (`submit → validate → ML triage → zone route → offline UUID sync → officer approve → hash-chained audit`) and knowing the exact file + line numbers below cold.

---

## 1. "Show Me Where This Happens" — Exact File & Line-Number Map

> **Context if asked about repo size (~96k lines):** The entire Python FastAPI control plane (`backend/app/`) is **`5,815` lines across 26 focused files**. Over 75% of repo line count is 4-language UI translation dictionaries (`en`/`gu`/`hi`/`mr`), OpenAPI JSON, and UI fixtures.

| Live Capability | Exact File Path | Key Function / Line Numbers | Owner |
| :--- | :--- | :--- | :--- |
| **Workflow validation, OOD `>100 kW` cap & least-loaded zone routing** | `backend/app/workflow.py` (`140` lines) | `validate_submission()` (`L17`), `route_and_assign()` (`L72`), `compute_sla_due()` (`L115`) | **Yogesh** |
| **Multipart request submit + citizen queue + audit verify** | `backend/app/routers/requests.py` (`436` lines) | `create_request()` (`L46`), `create_request_with_document()` (`L81`), `field_sync()` (`L162`), `verify_audit()` (`L263`) | **Yogesh** |
| **Simulated SAP OData v4 + 3-system ERP fan-out & reconciliation** | `backend/app/routers/erp.py` (`451` lines) | `sap_odata_metadata()` (`L92`), `sap_odata_service_orders()` (`L135`), `propagate_to_all_erp()` (`L255`), `reconcile_erp_drift()` (`L345`) | **Yogesh** |
| **5 `scikit-learn` training pipelines & unseen-template split** | `backend/app/ml/train.py` (`254` lines) | Unseen template split (`L70–76`), `TfidfVectorizer + LogisticRegression` (`L84`), `RandomForestClassifier` SLA (`L113`), `IsolationForest` billing (`L136`), `GradientBoostingRegressor` 24h load (`L151`) | **Aakash** |
| **Runtime text triage, safety guardrail & SLA risk reasons** | `backend/app/ml/predict.py` (`71` lines) | `SAFETY_CRITICAL_TERMS` (`L6`), `classify_text()` (`L30`), `sla_risk()` (`L48`) | **Aakash** |
| **Local TF-IDF policy RAG & zone-breach SQL Q&A** | `backend/app/assistant/service.py` & `routers/assistant.py` | `chat()` live zone breach ranking (`routers/assistant.py:L30`), `policy_answer()` (`assistant/service.py:L1`) | **Aakash** |
| **Magic-byte upload check & always-on `VFENC1` AES-256-GCM vault** | `backend/app/uploads.py` (`256` lines) | `sanitize_uploaded_filename()` (`L36`), `validate_magic_bytes()` (`L58`), `encrypt_upload_at_rest()` (`L177`), `validate_and_encrypt_upload()` (`L206`) | **Sandip** |
| **Fork-proof SHA-256 hash chain & `CEF:0` SIEM stream** | `backend/app/audit.py` (`225` lines) & `routers/system.py` | `log_action()` serialized `AuditChainHead` (`audit.py:L55`), `verify_chain()` (`audit.py:L135`), `export_siem_events()` (`routers/system.py:L78`) | **Sandip** |
| **Automated SQLite backup, SHA-256 verify & local restore drill** | `backend/scripts/dr_failover_drill.py` & `cold_start_dr_proof.py` | `run_failover_drill()` (`dr_failover_drill.py:L36`), `POST /v1/system/dr-failover-drill` (`routers/system.py:L122`) | **Sandip** |
| **Dual-auth in-memory session bridge (Node BFF ↔ FastAPI JWT)** | `frontend/src/utils/backendSession.ts` & `server/authService.ts` | Dual-store invariant doc (`backendSession.ts:L1–17`), `syncBackendSession()`, `scryptSync` cookie auth (`authService.ts:L20`) | **Utsav** |
| **Offline IndexedDB field queue & `client_uuid` replay de-dup** | `frontend/src/utils/offlineFieldSync.ts` | UUIDv4 queue persistence, reconnect flush to `/v1/requests/field-sync` | **Utsav** |
| **Portal shell & `AppContext.tsx` orientation** | `frontend/src/context/AppContext.tsx` | Static fallback dicts (`L1–1176`), `AppProvider` (`L1177`), `/api/auth/me` portal guard (`L3609`), server login (`L4153`); live widgets in `components/common/Live*.tsx` | **Utsav** |
| **12-point PS000125 mapping, 3-tier BOM & distributor SKUs** | `docs/REQUIREMENT_MAPPING.md` & `INFRASTRUCTURE_BOM_SOURCES.md` | Costed reference proposal (`₹14.80L / ₹1.18Cr / ₹7.45Cr`), RPi4 + Quectel EC200U-CN (`₹980` ex-GST) | **Arnav** |

---

## 2. Optional Small Domain Commits (Only Docs/Tests/CI — Zero Feature Bloat)

If teammates push individual GitHub commits from their accounts before finale, restrict strictly to non-destabilizing items:

| Role & Member | GitHub Handle | Safe, Contained Pre-Finale Commits |
| :--- | :--- | :--- |
| **Role 1 — Yogesh** | `@Yogeshsingh123-LAB` | Copy `docs/ci.yml` → `.github/workflows/ci.yml` via GitHub Web UI so Actions ticks turn green |
| **Role 2 — Utsav** | `@utsavmandalia-01` | Screenshot captures for `docs/DEMO_SCRIPT.md` walkthrough |
| **Role 3 — Aakash** | `@1006coder` | Add 6 more hand-labeled CGRF phrasings to `gerc_ugvcl_public_field_benchmark.json` & re-run `evaluate_realworld_benchmark.py` |
| **Role 4 — Sandip** | `@SANDIP29072007` | Run `docker compose up --build` smoke check & log output in `docs/verification/` |
| **Role 5 — Arnav** | `@coderAJ22` | Export PDF backup of `docs/deck/VidyutFlow_PS000125.pptx` & rehearse 2-minute timer |

---

## 3. Deep Hyperparameter & Honesty Viva Answers (Exact Match to `train.py`)

### Role 3 — Aakash Kumar Singh (`backend/app/ml/train.py`)
1. **"Walk me through the exact `GradientBoostingRegressor` hyperparameters in `train.py` (`L151`)."**
   - **Answer:** *"In `backend/app/ml/train.py` (`L151`), we pass `LOAD_FORECAST_FEATURES` into `GradientBoostingRegressor(n_estimators=220, max_depth=4, learning_rate=0.06, random_state=42)`. `max_depth=4` models interaction between afternoon `>40°C` ambient heat and `19:00–21:00` residential peak demand without memorizing synthetic noise, achieving `R² = 0.9790` and `MAE = 8.89 kVA` on the 20% holdout."*
2. **"How did you raise SLA breach recall to `0.8913` (`train.py:L113`)?"**
   - **Answer:** *"Missing a real SLA breach is costlier than early officer review. We trained `RandomForestClassifier(n_estimators=250, class_weight={0: 1, 1: 2.0}, min_samples_leaf=2, random_state=42)` and set `SLA_TRIAGE_THRESHOLD = 0.38` instead of `0.50`, achieving `0.8913` breach recall (`0.8350` accuracy vs `0.5400` majority baseline)."*
3. **"How does `IsolationForest` (`train.py:L136`) work alongside GERC tariff rules?"**
   - **Answer:** *"`IsolationForest(n_estimators=200, contamination=0.06, random_state=42)` is fit strictly on normal synthetic billing rows (`is_anomaly == 0`) to flag consumption spikes/zero-reads, paired with a deterministic GERC RGPU slab calculator (`predictive_services.py`) — achieving `0.9511` accuracy and `1.000` anomaly recall on the 25% stratified holdout."*
4. **"Who labeled the `0.9074` (`49/54`) OOD benchmark?"**
   - **Answer:** *"Our team authored and labeled those 54 items from public GERC Supply Code / CGRF terminology and Gujarati-English phrasings, with automated verification of `0` string overlap against `synthetic.py`. We explicitly call it a **team-authored OOD sanity-check set**, never independent utility data."*

### Role 4 — Sandip (`uploads.py`, `audit.py`, `dr_failover_drill.py`)
1. **"Is your `~3.5 ms` DR drill real high-availability failover?"**
   - **Answer:** *"No — in the local single-node build it is an **automated backup, SHA-256 checksum, tamper-rejection, and local SQLite restore drill** (`0` records lost). Multi-server PostgreSQL 16 streaming HA failover is the Circle (`₹1.18Cr`) and DISCOM (`₹7.45Cr`) deployment architecture."*
2. **"Does magic-byte checking stop polyglot malware inside a PDF?"**
   - **Answer:** *"No — `validate_magic_bytes()` (`uploads.py:L58`) checks `%PDF-`, PNG, JPEG, and UTF-8 `.txt` headers to reject extension-spoofed `MZ`/`ELF` binaries (`400`), paired with `X-Content-Type-Options: nosniff` and non-web-served `VFENC1` AES-256-GCM ciphertext (`uploads_encrypted/`). Full polyglot/malware scanning is an upstream DMZ ClamAV/ICAP CDR layer in production."*
