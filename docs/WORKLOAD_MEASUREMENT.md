# Empirical Before-and-After Workload Measurement — PS000125 (Outcomes 3, 6 & 13)

> **Evidence Standard:** Rather than quoting unverified percentage assumptions ("70% faster"), this document reports **exact, reproducible counts of fields typed, manual routing handoffs, staff screens visited, and ERP fields auto-populated** for a standard 4 kW Residential (`RGPU`) New Connection lifecycle, measured directly by running `backend/scripts/measure_workload.py` against the VidyutFlow API (`docs/verification/r5-workload-measurement.txt`).

---

## 1. Before vs. After Comparison (1 New-Connection Lifecycle)

| Operational Metric | Assumed Disconnected Legacy Baseline *(Not Measured — Pilot Baseline Target)* | VidyutFlow "Enter Once, Use Everywhere" (Measured in Code) | Structural Delta |
| :--- | :--- | :--- | :--- |
| **Applicant / Premise Fields Entered by Consumer** | 12 fields (paper / standalone portal form) | **12 fields** (`POST /v1/requests`, entered once) | Same consumer intake |
| **Applicant / Premise Fields Re-Typed by Staff** | **23 field re-entries** *(9 at subdivision inward register + 6 on JE survey sheet + 8 into billing/ERP sanction screen)* | **0 fields re-typed** *(Officer, Field Engineer, and ERP adapter read the single `ConnectionRequest` record)* | **−23 re-entries (100% duplicate entry eliminated)** |
| **New Technical Fields Entered by Staff** | Meter serial + feasibility notes written on paper, then re-keyed at office | **1 required field** (`meter_serial` entered once on Field PWA, synced offline/online via `client_uuid`) | Entered once at source |
| **Manual Triage & Routing Handoffs** | **4 manual handoffs** *(Inward clerk → Subdivision Officer → Field JE → Officer → ERP Data-Entry Clerk)* | **0 manual routing handoffs** *(Validation, ML category/severity, SLA-risk scoring, zone officer + engineer assignment, consumer alerts & ERP payload generation run automatically)* | **−4 manual handoffs** |
| **Staff Screens / Portals Visited** | **6–8 disconnected screens / registers** *(Portal export, Excel/inward book, WhatsApp/phone follow-up, ERP T-code)* | **2 staff workspace views** *(Field Engineer Task Card + Subdivision Officer Live Queue)* | **Unified single-login workspace** |
| **Staff Actions to Complete Lifecycle** | Multiple register updates, file lookups & manual status calls | **3 clicks / transitions** *(1. Field Verify → 2. Officer Approve → 3. Field Meter Commission)* | **"Click-and-Get-Work-Done"** |
| **ERP Billing/Sanction Fields Populated** | 10 fields manually keyed into SAP IS-U / billing | **10 canonical SAP IS-U target fields (`11` payload keys incl. `SYNC_EVENT`) auto-mapped** (`backend/app/erp_adapter.py`) with retryable dead-letter queue | **Zero manual ERP re-keying** |

---

## 2. Step-by-Step Trace Verified by `backend/scripts/measure_workload.py`

1. **Consumer Intake (`POST /v1/requests`):**
   - Applicant submits `12` fields once (`applicant_name`, `phone`, `address`, `zone`, `pin_code`, `request_type`, `description`, `requested_load_kw`, `document_name`, `tariff_category`, `phase`, `premises_type`).
   - In the same transaction, `run_workflow()` validates inputs, runs synthetic-trained advisory triage + SLA-risk explainability, sets `sla_due_at`, assigns the active `North` officer and field engineer (`status = ASSIGNED`), and dispatches in-app notifications (`0` staff routing clicks).
2. **Field Site Survey (`POST /v1/requests/field-sync` — Action #1):**
   - Assigned Field Engineer opens the pre-populated task card on the offline-capable Field Portal (`0` applicant fields re-typed) and submits `FIELD_VERIFIED` with an idempotent `client_uuid`.
3. **Human Officer Sanction (`PATCH /v1/requests/{id}/status` — Action #2):**
   - Subdivision Officer reviews the field-verified dossier + ML SLA reasons (`0` applicant fields re-typed) and clicks `APPROVED`.
   - `record_erp_sync()` automatically transforms and logs all `10` canonical SAP IS-U target fields (`EXT_SERVICE_ORDER_ID`, `BP_PARTNER_FULL_NAME`, `BP_PRIMARY_MOBILE_IN`, `DISCOM_CIRCLE_CODE`, `ISU_RATE_CATEGORY`, `SUPPLY_PHASE_CODE`, `CONTRACTED_LOAD_KW`, `ISU_WORKFLOW_STAGE`, `ISU_DEVICE_SERIAL_NO`, `EVENT_UTC_TIMESTAMP`) and appends a hash-chained audit record.
4. **Field Meter Commissioning (`POST /v1/requests/field-sync` — Action #3):**
   - Field Engineer installs the meter, enters **1 new technical field** (`meter_serial = UGV-MTR-2026-9941`), and marks `COMPLETED`, automatically triggering the `METER_COMMISSIONED` ERP sync event and notifying the consumer.

---

## 3. Pilot Stopwatch Protocol (Tier 1 Subdivision Rollout)

While code-level field and click counts above are exact today, **wall-clock staff minutes saved** must be measured with real UGVCL officers during the 90-day Tier 1 pilot:
1. Log median officer desk time and end-to-end calendar turnaround across 50 pre-pilot connections in the selected subdivision.
2. Compare against 50 post-go-live connections using VidyutFlow's `created_at` → `FIELD_VERIFIED` → `APPROVED` → `COMPLETED` audit timestamps (`GET /requests/kpis/executive-analytics`).
3. Publish real before/after median turnaround hours only after subdivision officer sign-off.
