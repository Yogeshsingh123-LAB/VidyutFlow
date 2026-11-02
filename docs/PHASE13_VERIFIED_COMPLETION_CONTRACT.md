# Phase 13 Backend API & Additive Verification Contract (For Yogesh's Review)

**Module:** Verified Field Work Completion, Multi-Party Verification & Public Complaint Transparency  
**Backend Branch:** `feature/verified-field-completion`  
**FastAPI Router:** `backend/app/routers/evidence.py` mounted on `/evidence` and `/v1/evidence`  
**SQLAlchemy Model:** `backend/app/models.py:WorkOrderEvidence`  
**Alembic Migration:** `backend/alembic/versions/d7b031e42ba2_002_phase13_work_order_evidence.py`  
**Frontend Service Layer:** `src/services/evidenceService.ts` & `src/utils/offlineFieldSync.ts`  

---

## 1. Architectural Summary & Dual-Layer Consistency

VidyutFlow 2.0 maintains a strictly separated two-layer architecture:
1. **LIVE FastAPI Backend (`backend/`):**
   - Handles canonical customer connection requests (`ConnectionRequest`), audit logs with cryptographic hash-chaining (`AuditLog`), user RBAC sessions (`User`, `UserSession`), and field updates (`FieldUpdate`).
   - **Phase 13 Additions are 100% Additive:** A new database table `work_order_evidence` and router `/evidence` provide durable storage, audit verification, and KPI analytics for field evidence without modifying any existing endpoints or mutating existing connection request statuses.
2. **DEMO Local ERP Layer (`src/context/AppContext.tsx`):**
   - Manages simulated browser-local customer grievances (`ComplaintRecord`) and dispatched field repairs (`WorkOrder`).
   - Stores photos and binary blobs in IndexedDB (`field_evidence_photos`) to strictly protect `localStorage` quotas.
   - Employs non-destructive linked follow-ups (`reopenedFromComplaintId` and `followUpComplaintId`) rather than mutating terminal closed states.

---

## 2. Hard Invariants & Security Rules (Mandatory)

1. **Terminal Status Preservation (No-Mutation Rule):**
   - Completed and closed records in `transitions.py` and canonical demo state are immutable. Reopening a grievance creates an independent follow-up record referencing the parent ID (`reopenedFromComplaintId`).
2. **Dual-Role Authorization Gate:**
   - Field engineers (`role = "engineer"`) can submit evidence (`POST /evidence`) but are forbidden (`HTTP 403 Forbidden`) from approving their own completions.
   - Verification review (`POST /evidence/{id}/verify`) is restricted exclusively to authorized employees (`role = "officer"`) and administrators (`role = "admin"`).
   - Consumers (`role = "consumer"`) cannot submit field evidence or review decisions.
3. **Citizen Privacy & Public Timeline Sanitization:**
   - Public-facing consumer timeline streams (`ConsumerComplaintTimelineModal`) run all events through `sanitizeConsumerTimelineEntry()`.
   - Internal dispatch remarks (e.g. `WO-2026-99881`, staff mobile numbers, internal crew truck registrations) are stripped and replaced with citizen-friendly milestones before display.
4. **Offline Reliability & Idempotent Replay:**
   - Every submission must carry an RFC-4122 v4 `client_uuid`. Re-syncing an existing `client_uuid` returns the existing record idempotently without creating duplicate database rows or throwing server errors.
5. **Safety Exemption Invariant:**
   - Photo submission is never unconditionally mandatory when doing so would endanger personnel. A field engineer may flag `safetyPhotoExemptionReason` (e.g., active thunderstorm, live uninsulated arching, hazardous chemical spill) to close the job with technical observations and category checklists intact.

---

## 3. Database Schema & Migration Specification

### Table `work_order_evidence`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR` | Primary Key, default UUID | Unique record identifier |
| `client_uuid` | `VARCHAR` | Unique, Indexed, NOT NULL | Cryptographic RFC-4122 idempotency key |
| `work_order_id` | `VARCHAR` | Indexed, NOT NULL | Linked work order or task reference |
| `complaint_id` | `VARCHAR` | Indexed, Nullable | Optional linked consumer grievance ID |
| `evidence_type` | `VARCHAR` | NOT NULL | `photo_before` \| `photo_after` \| `checklist` \| `technical_report` \| `safety_exemption` |
| `storage_ref` | `VARCHAR` | NOT NULL | IndexedDB key or asset storage URI |
| `file_size_bytes` | `INTEGER` | NOT NULL, default 0 | Payload size (max 5 MiB enforced) |
| `mime_type` | `VARCHAR` | NOT NULL, default `image/jpeg` | Verified MIME type (`image/jpeg`, `image/png`, `image/webp`) |
| `sha256_hash` | `VARCHAR` | Nullable | Content SHA-256 for audit verification |
| `submitted_by` | `VARCHAR` | Indexed, NOT NULL | User ID of submitting engineer |
| `latitude` | `FLOAT` | Nullable | Geotagged latitude coordinate (WGS84) |
| `longitude` | `FLOAT` | Nullable | Geotagged longitude coordinate (WGS84) |
| `metadata_json` | `TEXT` | Nullable | Serialized observations and checklist answers |
| `verification_status` | `VARCHAR` | Indexed, default `pending_verification` | `pending_verification` \| `approved` \| `rejected` \| `more_info_needed` |
| `reviewed_by` | `VARCHAR` | Nullable | User ID of reviewing officer |
| `reviewed_at` | `TIMESTAMP WITH TIME ZONE` | Nullable | Review timestamp |
| `review_remarks` | `TEXT` | Nullable | Verification remarks or rejection reasoning |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, default UTC now | Insertion timestamp |

---

## 4. REST Endpoints Specification

### 4.1 Submit Field Evidence
- **Endpoint:** `POST /v1/evidence` (or `/evidence`)
- **Authorization:** `require("engineer", "officer", "admin")`
- **Request Body:**
  ```json
  {
    "client_uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "work_order_id": "WO-2026-0012",
    "complaint_id": "CMP-2026-0042",
    "evidence_type": "photo_after",
    "storage_ref": "field_evidence_f47ac10b",
    "file_size_bytes": 1048576,
    "mime_type": "image/jpeg",
    "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "latitude": 23.5880,
    "longitude": 72.3693,
    "metadata_json": "{\"repairAction\":\"Replaced damaged LT insulator bushing\"}"
  }
  ```
- **Responses:**
  - `201 Created`: Successfully recorded with audit log entry.
  - `200 OK`: Idempotent replay; returns existing record.
  - `403 Forbidden`: Authenticated user is not an engineer or officer.
  - `422 Unprocessable Entity`: Invalid coordinates or missing mandatory fields.

### 4.2 Query Work Order Evidence
- **Endpoint:** `GET /v1/evidence/work-order/{work_order_id}`
- **Authorization:** `current_user`
- **Response:** `200 OK` array of evidence objects.

### 4.3 Review and Verify Evidence
- **Endpoint:** `POST /v1/evidence/{evidence_id}/verify`
- **Authorization:** `require("officer", "admin")`
- **Request Body:**
  ```json
  {
    "verification_status": "approved",
    "review_remarks": "Photo clearly verifies proper jumper crimping and terminal grounding."
  }
  ```
- **Responses:**
  - `200 OK`: Status updated and audit event `EVIDENCE_APPROVED` appended.
  - `403 Forbidden`: Authenticated user does not possess review clearance.
  - `404 Not Found`: Evidence ID does not exist.
  - `422 Unprocessable Entity`: Status not in `{"approved", "rejected", "more_info_needed"}`.

### 4.4 Get Verification KPI Summary
- **Endpoint:** `GET /v1/evidence/kpis/summary`
- **Authorization:** `require("officer", "admin")`
- **Response:**
  ```json
  {
    "total_evidence_items": 142,
    "pending_verification": 18,
    "approved": 118,
    "rejected": 4,
    "more_info_needed": 2,
    "approval_rate_pct": 83.1
  }
  ```

---

## 5. Verification Gates & Test Evidence

All components have been verified through automated test suites:
- **Frontend Automated Suite:** `tests/phase13-verified-field-completion.test.ts` (7/7 passed: photo type/size validation, 5 category checklists, RFC-4122 UUID generation, timeline sanitization, 13 multilingual stages in EN/GU/HI/MR, non-destructive reopen, safety photo exemption).
- **Backend Automated Suite:** `backend/tests/test_phase13_work_order_evidence.py` (Passed: submission RBAC, idempotent replay, officer approval, evidence query, KPI aggregation).
- **TypeScript Gate:** `npm run lint` (`tsc --noEmit`) passes with 0 errors.
- **Production Build:** `npm run build` passes with 0 bundling errors.
