# Phase 11: Meter Reading and Bill Review (Consolidated Persistent Architecture)

This document describes the Phase 11 meter reading and intelligent bill anomaly detection workflow in VidyutFlow 2.0, including the **Phase 11A Backend Consolidation** onto the authoritative FastAPI + SQLAlchemy + SQLite/PostgreSQL persistence layer.

## Workflow

1. A consumer or assigned field engineer selects a connection, records the displayed reading and date, and may capture or choose a meter photo.
2. OCR runs locally in the browser with Tesseract.js (`src/services/meterOcr.ts`). No meter photograph is ever transmitted to an external AI service. The user sees and can correct the detected digits (including flagged ambiguous characters `0/8`, `1/7`, `5/6`, `B/8`) before submission. OCR output is advisory and is not an approval.
3. The server checks meter identity, date ordering, configured meter multiplier and precision, duplicate readings, previous approved reading, rollover or replacement events, and consumption anomalies.
4. The server persists an append-only `PENDING_REVIEW` record (`meter_reading_submissions`), optional OCR and ambiguous-digit records (`meter_ocr_extractions`, `meter_ambiguous_digits`), and an `AES-256-GCM` encrypted private photo record (`meter_private_photos`). It never overwrites or deletes the connection snapshot, existing bill, payment, or receipt.
5. An employee or administrator reviews the reading and its flags, then approves, rejects, or requests a re-read. Every decision is recorded in `meter_reading_review_history`. Self-review is blocked (`403 SELF_REVIEW_FORBIDDEN`).
6. The bill checker compares existing bills with the authoritative Phase 9 billing engine (`backend/app/billing_engine.py` / `calculateDetailedUgvclBill`) and existing payment/receipt references. It is strictly read-only. Financial corrections are proposed and approved as append-only credit/debit adjustment records (`financial_adjustment_proposals`) with separation of duties (`proposer != approver`).

## Authoritative FastAPI (`/v1/meter-readings/*`) & Same-Origin (`/api/meter-readings/*`) API

All Phase 11 endpoints are served persistently by FastAPI (`backend/app/routers/meter_readings.py`) under `/v1/meter-readings/*` and `/api/meter-readings/*`, and mirrored by the Node compatibility layer (`src/server/meterReadingRoutes.ts`):

| Route | Purpose | Access |
| --- | --- | --- |
| `GET /v1/meter-readings` (`/api/meter-readings`) | Read permitted reading history | Connection owner, assigned field engineer, employee, administrator |
| `POST /v1/meter-readings/photos` (`/api/meter-readings/photos`) | Upload private meter photo encrypted at rest (`AES-256-GCM`) | Connection owner, assigned field engineer, employee, administrator |
| `POST /v1/meter-readings` (`/api/meter-readings`) | Append a reading for review with actor+endpoint+payload-hash idempotency | Connection owner, assigned field engineer, employee, administrator |
| `PATCH /v1/meter-readings/{id}/review` | Approve, reject, or request re-read (append-only review history) | Employee, administrator (non-submitter) |
| `GET /v1/meter-readings/{id}/photo` | Decrypt and fetch a private submitted photo | Owner, assigned field engineer, employee, administrator |
| `GET /v1/meter-readings/metrics` | Aggregate quality & anomaly counts (zero PII) | Management, administrator |
| `GET/PATCH /v1/meter-readings/config` | Read or administer versioned per-meter multiplier, precision, and rollover limit | Authenticated; update is administrator-only |
| `GET/PATCH /v1/meter-readings/thresholds` | Read or version anomaly thresholds (`meter_threshold_policy_versions`) | Employee, administrator; update is administrator-only |
| `GET/POST /v1/meter-readings/validate-bill` | Read-only bill validation against Phase 9 tariff engine | Owner, employee, administrator |
| `GET /v1/meter-readings/anomalies` | List structured 7-status anomaly cases | Owner, assigned field engineer, employee, management, administrator |
| `PATCH /v1/meter-readings/anomalies/{id}/transition` | Transition anomaly case across 7-status lifecycle | Employee, administrator |
| `GET/POST /v1/meter-readings/billing-reviews` | Submit or inspect consumer billing review requests | Owner, employee, administrator |
| `PATCH /v1/meter-readings/billing-reviews/{id}/transition` | Transition billing review with separated internal vs public notes | Employee, administrator |
| `GET /v1/meter-readings/billing-reviews/{id}/photo` (`/api/meter-readings/billing-reviews/{id}/photo`) | Decrypt and fetch private billing-review evidence photo | Owner, authorized subdivision employee, administrator |
| `POST /v1/meter-readings/{id}/issue-bill` (`/api/meter-readings/{id}/issue-bill`) | Hand off an `APPROVED` reading to the authoritative Phase 9 bi-monthly billing engine | Employee, administrator |
| `GET/POST /v1/meter-readings/adjustments` | Propose or inspect append-only financial adjustments | Owner (read), employee, administrator |
| `PATCH /v1/meter-readings/adjustments/{id}/review` | Approve or reject proposed adjustment (enforces separation of duties) | Administrator (non-proposer) |
| `POST /v1/meter-readings/adjustments/{id}/apply` (`/api/meter-readings/adjustments/{id}/apply`) | Apply an `APPROVED` adjustment to the append-only ledger (`APPLIED_TO_LEDGER`) | Employee, administrator |
| `GET /v1/meter-readings/ocr-health` (`/api/meter-readings/ocr-health`, `/api/meter-ocr-health`) | Genuine on-disk self-hosted Tesseract asset & encrypted vault telemetry | Management, administrator |
| `GET /v1/meter-readings/notifications` | Read deduplicated meter workflow notifications | Target role; consumer notices are connection scoped |

## Security, Privacy, and Offline Storage Controls

- **Local Browser OCR Only**: OCR executes strictly inside the browser Web Worker using self-hosted assets in `public/vendor/tesseract/` (`worker.min.js`, `tesseract-core-lstm.wasm.js`, `tesseract-core-simd-lstm.wasm.js`, `eng.traineddata`). No meter or evidence photograph is ever transmitted to an external AI or cloud OCR service.
- **Encrypted Private Photo Storage**: Photographs are validated for JPEG/PNG/WebP magic bytes (max 5 MiB), stripped of EXIF/GPS metadata via HTML5 Canvas re-encoding in the browser, and encrypted at rest using `AES-256-GCM` (`backend/app/uploads.py` and `src/server/dataStore.ts`). Photos are never exposed via public URLs.
- **Offline Field Queue & IndexedDB Photo Persistence**: Field Engineers queue meter reading metadata in `localStorage` (`vidyutflow_field_offline_queue`) and store binary photo blobs separately in browser `IndexedDB` (`vidyutflow_offline_db` v3, object store `meter_reading_photos`) to avoid `localStorage` quota exhaustion. Reconnection replays queued readings chronologically using their stable `client_uuid` and deletes the local photo blob once `SYNCED`.
- **Actor-Scoped Idempotency (`actor_idempotency_records`)**: Every mutating submission with a `clientUuid` is scoped by `(client_uuid, actor_id, endpoint, payload_hash)`. Retrying the identical request returns the original record (`201`). Reusing a `clientUuid` with a different actor or modified payload returns `409 Conflict` (`IDEMPOTENCY_CONFLICT`).
- **Role & BOLA Enforcement**: Consumers can access only their owned connections and never receive `internalStaffNotes`; Field Engineers can access only connections linked to their assigned work orders; Management receives aggregate metrics only (zero consumer names, consumer numbers, photos, or case notes) and is denied access to individual readings and photos (`403`).

## Deterministic Synthetic DEMO Scenarios (`PHASE11_DEMO_SCENARIOS`)

All seeded Phase 11 records carry `demo: true` and `synthetic: true` and are explicitly labeled as **DEMO / synthetic local OCR data — not connected to production UGVCL systems**:

1. **Scenario 1 (`DEMO-P11-SCEN-01` / `MR-20261028-99231`)**: Clear photo showing `015180` with successful local OCR (`96.4%` confidence, leading zero preserved `015180` -> `15180 kWh`) and immediate approval (`APPROVED`).
2. **Scenario 2 (`DEMO-P11-SCEN-02` / `MR-20261102-BLUR01`)**: Blurry/glare photo (`015B2O`, `58.2%` confidence) flagging ambiguous characters (`B->8`, `O->0`) and `OCR_LOW_CONFIDENCE` for manual human confirmation.
3. **Scenario 3 (`DEMO-P11-SCEN-03` / `MR-20261102-ROLL01`)**: Reading below the previous verified reading (`12000 < 14820 kWh`) flagging a `HIGH` severity `DECREASING_READING` rollover/anomaly check.
4. **Scenario 4 (`DEMO-P11-SCEN-04` / `MR-20261101-77190`)**: Unexpected bi-monthly consumption increase (`940 kWh` over 60 days = `15.67 kWh/day` vs `5.40 kWh/day` baseline) flagging `HIGH_CONSUMPTION` without accusing the consumer of fraud or theft.
5. **Scenario 5 (`DEMO-P11-SCEN-05`)**: Duplicate submission blocked (`409 DUPLICATE_READING`) and actor-scoped idempotent retry returning the original reading.
6. **Scenario 6 (`DEMO-P11-SCEN-06`)**: Meter identity mismatch (`IDENTITY_MISMATCH`, `HIGH` severity) between photographed meter serial and connection record.
7. **Scenario 7 (`DEMO-P11-SCEN-07`)**: Employee maker-checker approval with immutable `reviewHistory` audit entry.
8. **Scenario 8 (`DEMO-P11-SCEN-08`)**: Employee rejection and re-reading request (`REREAD_REQUESTED`) dispatching a deduplicated notification to the assigned Field Engineer.
9. **Scenario 9 (`DEMO-P11-SCEN-09`)**: Offline Field Engineer submission queued in IndexedDB (`meter_reading_photos`) and duplicate-safe synchronization on reconnect.
10. **Scenario 10 (`DEMO-P11-SCEN-10`)**: Canonical Phase 9 bi-monthly bill generation (`issueBillFromApprovedReading`) after authorized reading approval.
11. **Scenario 11 (`DEMO-P11-SCEN-11`)**: Read-only bill calculation discrepancy detection (`validateExistingBill` / `detectBillingAnomalies`) against Phase 9 tariff slabs, fixed charges, FPPPA, and electricity duty.
12. **Scenario 12 (`DEMO-P11-SCEN-12`)**: Consumer billing review completed with an append-only financial adjustment (`SLAB_CORRECTION` -> `APPROVED` -> `APPLIED_TO_LEDGER`) under strict separation of duties while preserving the historical bill immutably.

## Validation Suites & Final Verification

- **Backend Persistence Suite**: `pytest backend/tests/test_phase11a_persistence.py` verifies SQLAlchemy model persistence, Alembic schema parity, `AES-256-GCM` encrypted photo storage at rest, `409 IDEMPOTENCY_CONFLICT` enforcement, BOLA/role restrictions, and Phase 9 bill immutability.
- **Root Test Command (`npm test`)**: Runs Phase 9 Step 1 (`phase9-step1-bimonthly-billing.test.ts`), Phase 9 Step 2 (`phase9-step2-multilingual-bimonthly-pdf.test.ts`), Phase 9 Step 3 (`phase9-step3-payments-calendar-consistency.test.ts`), billing-consistency repair (`billing-consistency-repair.test.ts`), Phase 11A–11F (`meter-reading.test.ts`), offline field sync (`offline-field-sync.test.ts`), and all security/multilingual/portal regression suites.

