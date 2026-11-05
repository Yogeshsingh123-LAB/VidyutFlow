# VidyutFlow 2.0 — Scope Exclusions and Boundary Rules

**Date:** 05 November 2026  
**Reference Commit:** `77d2572230f0bc7685518673e40554de441f75e6`  
**Branch:** `backend-integration/phase9-step4d`  
**Integration Scope Boundary:** Locked strictly to Phases 1 through 9 (including Step 4A, 4B, 4C, 4D).

---

## 1. Scope Lock: Approved In-Scope Deliverables

The backend integration scope is strictly bounded by features implemented through **Phases 1 through 9**:

1. **Five Portals**:
   - Consumer Portal (Applications, Bill history, Live bills, Payments, Smart Calendar, Profile & Saved Premises).
   - Employee Portal (Intake queues, Sanction review, Division assignments, Document verification).
   - Field Engineer Portal (Assigned work orders, Offline sync queue, Meter installation updates, Field evidence).
   - Management Portal (Executive KPIs, SLA breach watchlists, Delinquency aging, Revenue realization).
   - Admin Portal (User management, Role assignment, Workflow template editor, Audit log verification, Disaster recovery backup/restore).

2. **Four Official Languages**:
   - English (`en`), Gujarati (`gu`), Hindi (`hi`), Marathi (`mr`). Complete i18n parity across labels, notifications, calendar entries, and PDF documents.

3. **Core Workflow & Operations**:
   - Connection request submission, validation issues snapshot, automated zone routing, and SLA due date calculation.
   - Assignment-level authorization and role-based access control (RBAC).
   - Offline field sync with deterministic UUID deduplication and conflict detection.
   - Monotonic, tamper-evident SHA-256 audit hash chain (`_AUDIT_TX_LOCK` serialized).

4. **Phase 9 Complete Billing Lifecycle**:
   - Bi-monthly billing cycles and progressive slab calculations (RGPU, NRGP, LTMD, AG tariffs).
   - Smart payment calendar derivation and RFC 5545 `.ics` export.
   - Disconnection Penalty Surcharge (DPS) daily accrual in `Asia/Kolkata` business timezone.
   - Formal Section 56 statutory notice tracking and lifecycle countdown.
   - Business date rollover synchronization.
   - Two-page A4 multilingual PDF bill generation with Code 128 barcodes and verification QR codes.
   - Partial installment settlements, receipt financial trails, and executive 5-bucket delinquency aging.

---

## 2. Explicit Scope Exclusions (Out of Scope)

The following areas are strictly out of scope for this backend integration:

### 1. Phase 10 Backend Integration (Outage Map GIS)
- **Status**: Checked into repository as frontend GIS module (`src/outageMap/`).
- **Rule**: Do not create backend GIS tables, spatial database endpoints, or live GeoJSON stream bridges. The existing client-side mock and offline map caching must remain untouched and unextended.

### 2. Phase 11 Client OCR Expansion
- **Status**: Client-side asset (`tesseract.js` worker and language data in `public/tesseract-assets`).
- **Rule**: Do not build backend optical character recognition endpoints, microservices, or Tesseract Python bindings. Document KYC validation remains client-assisted with backend AES-256-GCM vault encryption.

### 3. Phase 12 Smart Transformer Telemetry & Overload Rules
- **Status**: Future phase.
- **Rule**: Telemetry ingestion endpoints (`/telemetry/transformers`), overload rule triggers, and predictive maintenance ML pipelines are excluded. Do not create transformer tables or background telemetry schedulers.

### 4. Phase 13 Predictive Next-Bill & Evidence Expansion
- **Status**: Future phase / Next-bill predictor.
- **Rule**: No predictive billing estimation models, simulated future debt forecasts, or speculative work order evidence expansions. Historical `test_phase13_work_order_evidence.py` remains locked as-is.

### 5. Automatic Physical Disconnection
- **Status**: Strictly prohibited by regulatory invariants.
- **Rule**: Zero-countdown on formal notices or unpaid bills must **never** trigger automatic physical disconnection in the backend or database. Disconnection remains an audited, manual field inspection workflow.

### 6. Speculative Features & Tariff Mutations
- **Status**: Banned.
- **Rule**: No unapproved tariff schedules, speculative machine learning models beyond the existing 5 scikit-learn models, or synthetic UI modifications.

### 7. Deletion or Alteration of DEMO Fixtures
- **Status**: Non-negotiable invariant.
- **Rule**: All DEMO data fixtures (`INITIAL_CONNECTIONS`, `INITIAL_BILLS`, `INITIAL_PAYMENTS`, `DEFAULT_DEMO_ACCOUNTS`) and explicit DEMO modes must remain 100% operational alongside the authoritative LIVE backend.

---

## 3. Existing Later-Scope Code Handling

Any code or test files present in the checkout that reference Phase 10, 11, 12, or 13 must be preserved intact:
- **Do not delete** them.
- **Do not refactor** them.
- **Do not extend** them.
- They remain in their exact checked-out state to ensure complete source compatibility without scope creep.

