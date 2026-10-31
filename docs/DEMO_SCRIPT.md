# Live 4-Minute Judge Demo Script — VidyutFlow (`PS000125`)

0. **Launch (`15s`)**: Backend (`uvicorn app.main:app --port 8000`) + Frontend (`npm run dev` on `:3000`). Point out the 4-language switcher (`English · ગુજરાતી · हिन्दी · मराठी`).
1. **Citizen Submission & AES-256-GCM KYC Vault (`45s` — Role 2: Utsav)**:
   - Sign in as `consumer@vidyut.local` / `Consumer@123`, submit a New Connection / Solar Net-Metering request with a PDF KYC proof (`POST /v1/requests/with-document`).
   - Show instant ML triage (`category`, `severity`, calibrated `sla_breach_risk` + explainable reasons), auto-zone assignment (`0` manual handoffs), and `VFENC1` AES-256-GCM encrypted vault receipt.
2. **Non-Invasive Multi-System ERP Fan-Out & Offline Field Sync (`60s` — Role 1: Yogesh)**:
   - Sign in as `officer@vidyut.local` / `Officer@123` → approve for inspection → switch to `engineer@vidyut.local` / `Engineer@123`, toggle **Offline Mode**, record meter serial, sync twice to prove `client_uuid` idempotency (`0` duplicates).
   - Trigger **Propagate: SAP + Billing + 1912 CRM** (`POST /v1/erp/gateway/propagate/{id}`) and **Master Data Reconciliation** (`GET /v1/erp/reconcile`) — proving *"Enter Once, Propagate Everywhere"* across SAP S/4HANA FI-CA/IS-U (`AUFNR`), e-Urja CIS Billing, and GUVNL 1912 CRM without replacing any legacy system.
3. **5-Model Predictive AI: Billing Anomaly, 24h Feeder Forecast & Zone Breach Q&A (`60s` — Role 3: Aakash)**:
   - Open `ManagementPortal` (`admin@vidyut.local` / `Admin@123`) → **AI Insights** → `LivePredictiveDecisionPanel`.
   - Click **4.5x Spike + Slab Error** (`IsolationForest` + GERC RGPU slab verifier flags anomaly at `94%+`) vs **Normal Household**; adjust **Ambient Temp (`41°C`)** on the **24h 11kV Feeder kVA Forecast** (`GradientBoostingRegressor`, `R² = 0.979`); click **Ask AI: Highest Breach-Risk Zone?**.
4. **Live `<60s` Database Kill-Switch Failover & SIEM Security Proof (`60s` — Role 4: Sandip & Role 5: Arnav)**:
   - Click **Live DR Drill: Kill DB & Failover** (`POST /v1/system/dr-failover-drill`): Primary DB destroyed → SHA-256 verified hot-standby promoted in **`<1s` (`<60s` SLA)** → **`0` records lost** → `PRAGMA integrity_check = ok`.
   - Click **Inspect SIEM Hash-Chained Events** (`/v1/system/siem-events`) and close on [`docs/INFRASTRUCTURE.md`](INFRASTRUCTURE.md) (`₹8,000 × 500` Raspberry Pi 4 + Dual-SIM 4G substation edge concentrators + 3-tier UGVCL rollout).
