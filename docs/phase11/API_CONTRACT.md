# VidyutFlow 2.0 — Phase 11A Persistent API Contract & Data Boundary

## 1. Authoritative Backend Boundary

Phase 11A consolidates the Phase 11 AI Meter Reading & Intelligent Bill Anomaly Detection domain onto the authoritative FastAPI + SQLAlchemy + SQLite/PostgreSQL backend (`backend/app/routers/meter_readings.py` and `backend/app/models.py`), with Alembic migration `b1c2d3e4f5a6_006_phase11a_persistent_meter_reading_system.py`.

All endpoints are served under `/v1/meter-readings/*` (as well as `/api/v1/meter-readings/*` and `/api/meter-readings/*` for seamless frontend compatibility). When the Express compatibility middleware (`src/server/meterReadingRoutes.ts`) runs with `FASTAPI_BACKEND_URL` configured, it proxies `/api/meter-readings/*` directly to `/v1/meter-readings/*`.

---

## 2. Persistent SQLAlchemy Model Families (Append-Only & Versioned)

| # | Requirement | SQLAlchemy Model(s) | Table Name(s) | Mutability Rule |
|---|---|---|---|---|
| 1 | Meter configuration & versions | `MeterConfigurationModel`, `MeterConfigurationVersionModel` | `meter_configurations`, `meter_configuration_versions` | Versioned; every update appends an immutable row to `meter_configuration_versions`. |
| 2 | Meter replacement / rollover events | `MeterEventRecord` | `meter_events` | Append-only ledger of rollover and meter-replacement events. |
| 3 | Meter reading submissions | `MeterReadingSubmissionRecord` | `meter_reading_submissions` | Append-only submission record; historical readings are never overwritten or deleted. |
| 4 | OCR extraction results & ambiguous digits | `MeterOcrExtractionRecord`, `MeterAmbiguousDigitRecord` | `meter_ocr_extractions`, `meter_ambiguous_digits` | Immutable OCR metadata and per-digit ambiguity records (`0/8`, `1/7`, `5/6`, `B/8`). |
| 5 | Private encrypted photo references | `MeterPrivatePhotoRecord` | `meter_private_photos` | Encrypted at rest via `AES-256-GCM` (`VFENC1` envelope in `backend/app/uploads.py`); never exposed via public URLs. |
| 6 | Reading review history | `MeterReadingReviewHistoryRecord` | `meter_reading_review_history` | Append-only audit log of staff review transitions (`APPROVE`, `REJECT`, `REREAD`). |
| 7 | Anomaly cases & status history | `MeterAnomalyCaseRecord`, `MeterAnomalyStatusHistoryRecord` | `meter_anomaly_cases`, `meter_anomaly_status_history` | 7-status lifecycle with append-only transition history. |
| 8 | Consumer billing review requests | `ConsumerBillingReviewRecord`, `ConsumerBillingReviewHistoryRecord` | `consumer_billing_reviews`, `consumer_billing_review_history` | Append-only status history; internal staff notes stripped from consumer responses. |
| 9 | Anomaly-threshold policy versions | `MeterThresholdPolicyVersionRecord` | `meter_threshold_policy_versions` | Append-only versioned threshold snapshots. |
| 10 | Financial adjustment proposals & ledger status | `FinancialAdjustmentProposalRecord`, `FinancialAdjustmentHistoryRecord` | `financial_adjustment_proposals`, `financial_adjustment_history` | Append-only proposals with `ledger_application_status` (`NOT_APPLIED`, `READY_FOR_NEXT_CYCLE`, `APPLIED_IN_CYCLE`, `REJECTED`). Original `electricity_bills` rows are never mutated. |
| 11 | Notification deduplication | `MeterNotificationDedupRecord` | `meter_notification_dedup` | Keyed by `event_key` to guarantee idempotent notification emission. |
| 12 | Actor-scoped idempotency records | `ActorIdempotencyRecord` | `actor_idempotency_records` | Scoped by `(client_uuid, actor_id, endpoint, payload_hash)`. Identical retries return the original record; UUID reuse with a different actor or payload returns `409 IDEMPOTENCY_CONFLICT`. |

---

## 3. REST Endpoint Reference

| Method & Canonical Path | Compatibility Alias | Allowed Roles | Description |
|---|---|---|---|
| `GET /v1/meter-readings` | `GET /api/meter-readings` | `consumer`, `field_engineer`, `officer`, `admin` | Lists meter readings scoped by BOLA ownership or field work-order assignment. Management (`management`) is denied (`403`). |
| `POST /v1/meter-readings/photos` | `POST /api/meter-readings/photos` | `consumer`, `field_engineer`, `officer`, `admin` | Validates JPEG/PNG/WebP magic bytes, encrypts photo at rest with `AES-256-GCM`, and persists a `MeterPrivatePhotoRecord`. |
| `POST /v1/meter-readings` | `POST /api/meter-readings` | `consumer`, `field_engineer`, `officer`, `admin` | Submits a meter reading with optional OCR extraction, ambiguous digits, and encrypted photo. Enforces actor+endpoint+payload-hash idempotency. |
| `PATCH /v1/meter-readings/{reading_id}/review` | `PATCH /api/meter-readings/{reading_id}/review` | `officer`, `admin` | Reviews a reading (`APPROVE`, `REJECT`, `REREAD`). Blocks self-review (`403 SELF_REVIEW_FORBIDDEN`) and appends to `meter_reading_review_history`. |
| `GET /v1/meter-readings/{reading_id}/photo` | `GET /api/meter-readings/{reading_id}/photo` | `consumer` (owner), `field_engineer` (assigned), `officer`, `admin` | Decrypts and returns the private meter photo data URL after BOLA/assignment verification. |
| `GET /v1/meter-readings/config` | `GET /api/meter-readings/config` | `consumer` (owner), `field_engineer` (assigned), `officer`, `admin` | Returns active meter configuration and version history for `consumerNo`. |
| `PATCH /v1/meter-readings/config` | `PATCH /api/meter-readings/config` | `admin` | Increments meter configuration version and appends to `meter_configuration_versions`. |
| `GET /v1/meter-readings/thresholds` | `GET /api/meter-readings/thresholds` | `officer`, `admin` | Returns active anomaly threshold policy and version history. |
| `PATCH /v1/meter-readings/thresholds` | `PATCH /api/meter-readings/thresholds` | `admin` | Appends a new `MeterThresholdPolicyVersionRecord`. |
| `GET /v1/meter-readings/validate-bill` | `GET /api/meter-readings/validate-bill` | `consumer` (owner), `officer`, `admin` | Re-computes expected bill breakdown using the authoritative Phase 9 engine (`calculate_configurable_cycle_tariff_breakdown`) without mutating historical bills. |
| `GET /v1/meter-readings/anomalies` | `GET /api/meter-readings/anomalies` | `consumer`, `field_engineer`, `officer`, `management`, `admin` | Lists structured anomaly cases (sanitized for consumers). |
| `PATCH /v1/meter-readings/anomalies/{id}/transition` | `PATCH /api/meter-readings/anomalies/{id}/transition` | `officer`, `admin` | Transitions anomaly status across the 7-status lifecycle and appends to `meter_anomaly_status_history`. |
| `POST /v1/meter-readings/billing-reviews` | `POST /api/meter-readings/billing-reviews` | `consumer` (owner), `officer`, `admin` | Creates a consumer billing review request with actor+endpoint+payload-hash idempotency. |
| `PATCH /v1/meter-readings/billing-reviews/{id}/transition` | `PATCH /api/meter-readings/billing-reviews/{id}/transition` | `officer`, `admin` | Updates billing review status, separating confidential `internalStaffNotes` from `consumerVisibleNote`. |
| `POST /v1/meter-readings/adjustments` | `POST /api/meter-readings/adjustments` | `officer`, `admin` | Proposes an append-only financial adjustment using the Phase 9 tariff engine. |
| `PATCH /v1/meter-readings/adjustments/{id}/review` | `PATCH /api/meter-readings/adjustments/{id}/review` | `admin` | Approves or rejects a financial adjustment proposal. Enforces separation of duties (`proposer != approver`). |
| `GET /v1/meter-readings/metrics` | `GET /api/meter-readings/metrics` | `management`, `admin` | Returns aggregate-only operational and anomaly metrics with zero PII, zero photos, and zero internal notes. |
| `GET /v1/meter-readings/notifications` | `GET /api/meter-readings/notifications` | All authenticated roles | Returns role- and ownership-scoped Phase 11 notifications deduplicated via `meter_notification_dedup`. |
