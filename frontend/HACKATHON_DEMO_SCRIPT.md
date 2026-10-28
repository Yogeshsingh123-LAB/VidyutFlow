# VidyutFlow — UGVCL Intelligent Utility ERP (PS000125)
## Hackathon Live Presentation & Judge Demonstration Script

**Deterministic Demo Flow:** `Welcome Hub → Consumer → Employee → Field Engineer → Management → Admin → AI Governance`  
**Target Duration:** 6 Minutes Total (30s Intro + 5m Live Walkthrough + 30s Closing)

---

## Pre-Demo Preparation (30 Seconds Before Entering Stage)
1. Ensure the application is running (`npm run dev` on port `3000`).
2. Click **Help & Info → Reset Demo Data** (or press `Cmd/Ctrl + K` → **Reset Demo Data**) so all 7 deterministic ERP scenarios are in their initial state.
3. Verify the top header operating badge displays **`DEMO`** mode and the audio alarm toggle is **Unmuted** (click anywhere on the page once so browser Web Audio API is unlocked).
4. Log out to start on the **UGVCL Welcome Hub**.

---

## 1. 30-Second Problem Introduction

> **"Distribution utilities like Uttar Gujarat Vij Company Limited (UGVCL) serve millions of consumers across residential, agricultural, and industrial feeders, yet critical workflows—connection applications, consumer grievances, field line inspections, SCADA feeder overloads, and executive sanctions—still operate across fragmented portals."**
>
> **"Even worse, adding generic AI chatbots to utility systems creates unacceptable operational risk if an AI can hallucinate billing data or autonomously alter grid load sanctions."**
>
> **"Today we present VidyutFlow (PS000125): an integrated five-portal Intelligent Utility ERP for UGVCL. Every role—Consumer, Employee, Field Engineer, Management, and System Admin—operates on a single canonical ERP state machine, paired with five role-isolated Gemini Agentic Co-Pilots governed by strict read-only tools and mandatory Human-in-the-Loop approvals."**

---

## 2. 5-Minute Deterministic Live Demo Sequence

### Step 1: Welcome Hub & Institutional Heritage (0:00 – 0:35)
- **Action on Screen:**
  - Point to the official **UGVCL emblem** in the top navigation bar and hero section.
  - Scroll smoothly through the **9 Historical Milestones (1960–2026)** in the UGVCL Distribution Journey timeline.
  - Click **Sign In / Switch Role** to open the Authentication Modal.
- **Talking Points:**
  - Preserve UGVCL's institutional identity from the 1960 Gujarat Electricity Board era to 2026 AI-governed smart grid operations.
  - Notice the explicit **Demo Mode (`DEMO`)** vs **Server Auth / Live Backend (`LIVE`)** architecture indicators.

---

### Step 2: Consumer Portal — Smt. Meenaben Patel (0:35 – 1:25)
- **Action on Screen:**
  - Select **Consumer Portal** (`Smt. Meenaben Patel` — Consumer No. `04281-99231`).
  - Show the multi-connection switcher (`04281-99231` Residential RGPU vs `04281-77190` LTMD Industrial).
  - Open **Applications** to highlight **`APP-2026-0843`** (`Document Verification`) and **`APP-2026-0844`** (`Sanction Approval`, 45 kW industrial load).
  - Open **Complaints** to show **`CMP-8822`** (`In Review` — smart meter optical port fault).
- **Agentic AI Demonstration (Vidyut Mitra):**
  - Click the floating **Vidyut Mitra AI** button in the bottom-right corner.
  - Click the suggested prompt: *"Analyze my latest electricity bill and tariff slabs"* (or ask about `04281-99231`).
  - Point out the **`EXECUTED TOOLS`** pill (`getConsumerConnections`, `getConsumerBills`) and the response grounded strictly in Smt. Meenaben Patel's real ERP records—with zero access to other consumers' data.

---

### Step 3: Employee Portal — Rajesh V. Trivedi, AE Operations (1:25 – 2:20)
- **Action on Screen:**
  - Switch role to **Employee Portal** (`Rajesh V. Trivedi`).
  - In **Applications Queue**, locate **`APP-2026-0843`** (`Document Verification`) and advance it to **`Site Inspection`** (which automatically links Field Work Order **`WO-4402`**).
  - Switch to **Complaints & SLA Queue**, locate **`CMP-8822`**, and click **Dispatch Field Engineer** to assign `Vikramaditya Solanki (JE Field)`.
- **Talking Points:**
  - Every transition is validated by deterministic ERP state-machine guards (`isValidApplicationTransition`, `isValidComplaintTransition`). Invalid stage jumps are blocked.

---

### Step 4: Field Engineer Portal — Vikramaditya Solanki, JE Field (2:20 – 3:15)
- **Action on Screen:**
  - Switch role to **Field Engineer Portal** (`Vikramaditya Solanki`).
  - Point out the mobile-first layout, GPS feeder coordinates, and the **Simulated Offline Queue** toggle in the header.
  - Locate Work Order **`WO-4402`** (`New Connection Verification`), progress status **`Pending` → `En Route` → `On Site` → `Completed`** with site inspection remarks.
- **Critical Alert Demonstration (Emergency Feeder Hazard):**
  - Click **Report Feeder / DTR Hazard**, select **`11kV Kadi GIDC Express Feeder`**, enter a critical thermal/insulator fault, and submit.
  - Immediately showcase the **Critical Incident Modal** and **Web Audio Synthesized Alarm** firing with severity **`CRITICAL`**.

---

### Step 5: Management Executive Cockpit — Dr. H. M. Desai, SE Operations (3:15 – 4:10)
- **Action on Screen:**
  - Switch role to **Management Portal** (`Dr. H. M. Desai`).
  - Show Executive KPIs, AT&C loss metrics, and the **Feeder Analytics** table highlighting **`11kV Kadi GIDC Express Feeder` at `108.2%` critical overload**.
  - In the **Critical Incident Command Center**, click **Acknowledge**, then **Escalate**, and **Resolve** with executive engineering remarks.
- **Human-in-the-Loop AI Approval Demonstration:**
  - Scroll to the **AI Governance & Approval Queue** (or click the **AI Approvals** badge in the top bar).
  - Open the AI Recommendation **`APPROVE_HIGH_RISK_SANCTION`** for **`APP-2026-0844`** (`45.0 kW` LTMD industrial connection).
  - In the **Human Approval Modal**, show the AI's grounded reasoning, confidence score, and proposed state diff (`Sanction Approval → Meter Installed`).
  - Enter mandatory executive remarks and click **Approve & Execute Action**.
  - Show that **`APP-2026-0844`** immediately transitions to **`Meter Installed`** across the entire ERP.

---

### Step 6: Admin & Governance Portal — Siddharth Jadeja, CISO (4:10 – 5:00)
- **Action on Screen:**
  - Switch role to **Admin Portal** (`Siddharth Jadeja`).
  - Show the **Security Anomaly Alert (`AUD-88216`)** flagging repeated failed login attempts (`FAILED_PORTAL_LOGIN_ATTEMPT`).
  - Open the AI Recommendation **`REVOKE_SUSPICIOUS_SESSION`** and approve it as Admin.
  - Inspect the **Immutable Audit Log Table** showing the newly recorded `AI_RECOMMENDATION_EXECUTED`, `INCIDENT_RESOLVED`, and `APPLICATION_STAGE_UPDATED` entries.
  - Point to the **Operating Mode Panel (`DEMO` vs `LIVE`)**: demonstrate that switching to `LIVE` when no external database server is attached explicitly displays **`LIVE BACKEND UNAVAILABLE`**—never silently faking live data with demo records.

---

## 3. Portal-by-Portal Talking Points Summary

| Portal | Persona | Key ERP Capability | AI Agent Persona |
| :--- | :--- | :--- | :--- |
| **Consumer** | Smt. Meenaben Patel | Multi-connection bills, tariff slab breakdown, application & complaint tracking | **Vidyut Mitra** (Consumer Service & Billing Assistant) |
| **Employee** | Rajesh V. Trivedi (AE) | Subdivision application verification, complaint SLA dispatch, work order creation | **Operations Co-Pilot** (Subdivision Desk Assistant) |
| **Field Engineer** | Vikramaditya Solanki (JE) | GPS work orders, site inspection checklist, offline queue sync, emergency feeder hazard | **Field Line Assistant** (Technical Safety & Line Guide) |
| **Management** | Dr. H. M. Desai (SE) | Circle revenue KPIs, 11kV feeder load analytics, critical incident command, LTMD sanctions | **Executive Intelligence Agent** (Circle Strategy & Grid Analyst) |
| **Admin** | Siddharth Jadeja (CISO) | RBAC permission matrix, immutable audit logs, security anomaly response, DEMO/LIVE control | **Security & Governance Agent** (Audit & Compliance Sentinel) |

---

## 4. Technical Architecture Explanation (For Judge Q&A)

1. **Five Role-Isolated Gemini Agents (`src/server/agenticPersonas.ts` & `src/server/agenticTools.ts`):**
   - Each role has a dedicated system instruction and a strictly scoped declaration of **read-only** tools (`getConsumerBills`, `queryPendingApplications`, `getAssignedWorkOrders`, `getFeederLoadAnalytics`, `querySystemAuditLogs`).
   - Tools execute server-side in `vite.config.ts` (`/api/ai-chat`) and enforce role and consumer-number ownership before returning data to Gemini.
2. **Human-in-the-Loop Governance (`src/utils/aiRecommendationEngine.ts`):**
   - AI agents **cannot** directly mutate ERP records. High-impact operational actions are synthesized as structured `AIRecommendation` proposals (`PENDING_APPROVAL`).
   - Before execution, `validateApprovalPermission()` verifies the human reviewer's role (`employee`, `management`, or `admin`), and `validateCurrentRecordState()` verifies the target ERP record has not drifted since the recommendation was generated.
3. **Resilience & Quota Protection (`src/utils/aiCacheManager.ts`):**
   - Bounded 8.5s server timeouts, exponential backoff with jitter on `HTTP 429 / RESOURCE_EXHAUSTED`, request coalescing, user+role isolated response caching, and a deterministic ERP-grounded fallback engine (`src/utils/utilityAiEngine.ts`) clearly badged in the UI as **`[Deterministic ERP Fallback]`**.

---

## 5. Honest Answers for Known Limitations (Judge Q&A)

- **Q: "Is this connected to UGVCL's live production SAP/Oracle billing database right now?"**
  - **Honest Answer:** *"No. For hackathon demonstration safety and repeatability, the app runs in `DEMO` mode using deterministic UGVCL-modeled seed records in browser state and `localStorage`. However, we built the complete typed REST client (`ErpApiClient`), repository interfaces (`erpRepositories.ts`), and `/api/v1` OpenAPI contracts (`BACKEND_INTEGRATION_GUIDE.md`). When switched to `LIVE` mode without a live database server running, the UI explicitly blocks silent fallback and alerts the operator."*
- **Q: "Are the role checks enforced on the client or the server?"**
  - **Honest Answer:** *"Both, with explicit labeling. In instant `DEMO` mode, role switching happens in-browser and audit entries are explicitly tagged `[Demo Client Audit Trail]`. When using Server Auth Mode (`/api/auth/*`) and the `/api/ai-chat` Gemini proxy, sessions are validated server-side via HMAC-signed HTTP-only cookies, PBKDF2 password hashes, CSRF origin checks, and server-side tool RBAC."*
- **Q: "What happens if the Gemini API key runs out of quota during judging?"**
  - **Honest Answer:** *"The server-side circuit breaker catches `HTTP 429` or timeout errors and automatically routes the query to our deterministic local ERP fallback engine (`utilityAiEngine.ts`), which answers using the exact same canonical ERP records and displays a transparent `Deterministic Fallback` badge so judges always know whether Gemini or the fallback engine generated the reply."*

---

## 6. 30-Second Closing Statement

> **"VidyutFlow demonstrates how a public power utility like UGVCL can modernize its entire operational lifecycle—from a consumer's new connection request to a field engineer's mobile inspection and an executive engineer's feeder overload response—within one cohesive platform."**
>
> **"By combining deterministic ERP state machines, real-time critical incident alerting, and five role-specific Gemini agents governed by mandatory Human-in-the-Loop approval, VidyutFlow delivers the speed of agentic AI with the safety, auditability, and resilience required by critical public infrastructure. Thank you—we welcome your questions."**
