# VidyutFlow UGVCL ERP — Backend Developer Integration & Database Handoff Guide (Phase 5)

**Project ID:** PS000125  
**Document Version:** 5.0.0  
**Frontend Contract Files:**
- `src/services/erpApiContracts.ts` — Request/Response DTOs, Error Codes, RBAC Matrix
- `src/services/apiClient.ts` — Centralized HTTP Client, CSRF, Timeouts, Retries, Request IDs
- `src/services/repositories.ts` — 9 Database-Ready Repository Interfaces & Live/Demo Adapters

---

## 1. Existing vs. Proposed Backend Endpoints

The VidyutFlow frontend strictly separates **existing mounted endpoints** from **proposed persistent ERP endpoints** being developed by the backend engineering team.

### 1.1 Existing Mounted Server Endpoints (Implemented in `src/server/authRoutes.ts` & `vite.config.ts`)
| HTTP Method | Endpoint Path | Status | Purpose & Security Controls |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/me` | **EXISTING (Mounted)** | Verifies `HttpOnly; SameSite=Lax` session cookie (`vidyutflow_session`); returns `{ authenticated, user, role, loginTime, expiresAt }`. |
| `POST` | `/api/auth/login` | **EXISTING (Mounted)** | Authenticates credentials via `crypto.scrypt` + `timingSafeEqual`; requires `X-VidyutFlow-CSRF: 1`; rate-limited (`10 req/min/IP`); sets `HttpOnly` cookie. |
| `POST` | `/api/auth/signup` | **EXISTING (Mounted)** | Registers new `consumer` account; enforces CSRF & rate limit; issues `HttpOnly` session cookie. |
| `POST` | `/api/auth/logout` | **EXISTING (Mounted)** | Revokes server-side session token and clears `HttpOnly` session cookie. |
| `POST` | `/api/ai-chat` | **EXISTING (Mounted)** | Executes role-scoped Gemini Agentic AI queries using server-side `GEMINI_API_KEY`, per-user rate limiting, circuit-breaker cooldown, and read-only tool calls against `ServerDataStore`. |

### 1.2 Proposed Persistent ERP REST Endpoints (To Be Implemented by Backend Team)
All `/api/v1/*` routes below are wired in `LiveErpRepositoryBundle` (`src/services/repositories.ts`) and must be backed by PostgreSQL:

| Domain | Method & Path | Status | Allowed Roles (`BACKEND_RBAC_RULES`) | Request DTO / Headers |
| :--- | :--- | :--- | :--- | :--- |
| **Consumers & Connections** | `GET /api/v1/consumers` | **PROPOSED** | `employee`, `management`, `admin` | Session Cookie |
| **Consumers & Connections** | `GET /api/v1/connections` | **PROPOSED** | `consumer` (own only), `employee`, `field`, `management`, `admin` | Optional `?consumerNo=` |
| **Consumers & Connections** | `GET /api/v1/connections/:consumerNo` | **PROPOSED** | `consumer` (own only), `employee`, `field`, `management`, `admin` | Ownership check required |
| **Consumers & Connections** | `POST /api/v1/connections/link` | **PROPOSED** | `consumer`, `employee`, `admin` | `LinkConnectionDto`, `Idempotency-Key` |
| **Applications** | `GET /api/v1/applications` | **PROPOSED** | `consumer` (own only), `employee`, `field`, `management`, `admin` | Session Cookie |
| **Applications** | `GET /api/v1/applications/:id` | **PROPOSED** | `consumer` (own only), `employee`, `field`, `management`, `admin` | Session Cookie |
| **Applications** | `POST /api/v1/applications` | **PROPOSED** | `consumer`, `employee`, `admin` | `SubmitApplicationDto`, `Idempotency-Key` |
| **Applications** | `PATCH /api/v1/applications/:id/status` | **PROPOSED** | `employee`, `management`, `admin` | `UpdateApplicationStatusDto`, `If-Match` / `X-Expected-Version` |
| **Complaints** | `GET /api/v1/complaints` | **PROPOSED** | `consumer` (own only), `employee`, `field`, `management`, `admin` | Session Cookie |
| **Complaints** | `GET /api/v1/complaints/:id` | **PROPOSED** | `consumer` (own only), `employee`, `field`, `management`, `admin` | Session Cookie |
| **Complaints** | `POST /api/v1/complaints` | **PROPOSED** | `consumer`, `employee`, `admin` | `SubmitComplaintDto`, `Idempotency-Key` |
| **Complaints** | `POST /api/v1/complaints/:id/assign` | **PROPOSED** | `employee`, `management`, `admin` | `AssignComplaintDto`, `If-Match` |
| **Complaints** | `PATCH /api/v1/complaints/:id/status` | **PROPOSED** | `employee`, `field`, `management`, `admin` | `UpdateComplaintStatusDto`, `If-Match` |
| **Work Orders** | `GET /api/v1/workorders` | **PROPOSED** | `field`, `employee`, `management`, `admin` | `403` for `consumer` |
| **Work Orders** | `GET /api/v1/workorders/:id` | **PROPOSED** | `field`, `employee`, `management`, `admin` | `403` for `consumer` |
| **Work Orders** | `PATCH /api/v1/workorders/:id/status` | **PROPOSED** | `field`, `employee`, `admin` | `UpdateWorkOrderStatusDto`, `If-Match` |
| **Feeder Telemetry** | `POST /api/v1/telemetry/faults` | **PROPOSED** | `field`, `employee`, `management`, `admin` | `ReportFeederFaultDto`, `Idempotency-Key` |
| **Billing & Payments** | `GET /api/v1/billing/bills` | **PROPOSED** | `consumer` (own only), `employee`, `management`, `admin` | `403` for `field` |
| **Billing & Payments** | `GET /api/v1/billing/payments` | **PROPOSED** | `consumer` (own only), `employee`, `management`, `admin` | `403` for `field` |
| **Billing & Payments** | `POST /api/v1/billing/pay` | **PROPOSED** | `consumer` (own only), `employee`, `admin` | `ProcessBillPaymentDto`, `Idempotency-Key` |
| **Critical Incidents** | `GET /api/v1/incidents` | **PROPOSED** | `consumer` (scoped), `employee`, `field`, `management`, `admin` | Filtered by `responsibleRoles` |
| **Critical Incidents** | `PATCH /api/v1/incidents/:id/acknowledge` | **PROPOSED** | `employee`, `field`, `management`, `admin` | `AcknowledgeIncidentDto`, `If-Match` |
| **Critical Incidents** | `POST /api/v1/incidents/:id/escalate` | **PROPOSED** | `employee`, `field`, `management`, `admin` | `EscalateIncidentDto`, `If-Match` |
| **Critical Incidents** | `PATCH /api/v1/incidents/:id/resolve` | **PROPOSED** | `employee`, `field`, `management`, `admin` | `ResolveIncidentDto`, `If-Match` |
| **AI Approvals (HITL)** | `GET /api/v1/approvals` | **PROPOSED** | `employee`, `field`, `management`, `admin` | `403` for `consumer` |
| **AI Approvals (HITL)** | `POST /api/v1/approvals` | **PROPOSED** | `employee`, `field`, `management`, `admin` | `ProposeRecommendationDto`, `Idempotency-Key` |
| **AI Approvals (HITL)** | `POST /api/v1/approvals/:id/review` | **PROPOSED** | `employee`, `field`, `management`, `admin` | `ReviewRecommendationDto`, `If-Match` |
| **AI Approvals (HITL)** | `POST /api/v1/approvals/:id/execute` | **PROPOSED** | `employee`, `field`, `management`, `admin` | `ExecuteRecommendationDto`, `Idempotency-Key`, `If-Match` |
| **Notifications** | `GET /api/v1/notifications` | **PROPOSED** | All authenticated roles | Scoped by role & account |
| **Notifications** | `PATCH /api/v1/notifications/:id/read` | **PROPOSED** | All authenticated roles | Marks single notification read |
| **Notifications** | `POST /api/v1/notifications/read-all` | **PROPOSED** | All authenticated roles | Marks all caller notifications read |
| **System Audit Logs** | `GET /api/v1/admin/audit-logs` | **PROPOSED** | `admin` ONLY (`403` for all others) | Paginated server audit stream |
| **System Audit Logs** | `POST /api/v1/admin/audit-logs` | **PROPOSED** | All authenticated roles | `CreateAuditEventDto` |

---

## 2. Standard Request & Response Envelope

Every `/api/v1/*` endpoint must return JSON matching `ApiResponse<T>` (`src/services/erpApiContracts.ts`):

```json
{
  "success": true,
  "data": { ... },
  "statusCode": 200,
  "timestamp": "2026-10-24T17:20:00.000Z",
  "requestId": "REQ-1761326400000-A9F21C",
  "meta": {
    "source": "backend-live",
    "mode": "LIVE",
    "version": 3,
    "processingTimeMs": 18
  }
}
```

### Standard Error Response (`ApiErrorResponse`)
```json
{
  "success": false,
  "error": "Optimistic concurrency conflict: expected version v2, current record is v3.",
  "code": "CONFLICT_VERSION_MISMATCH",
  "statusCode": 409,
  "timestamp": "2026-10-24T17:20:00.000Z",
  "requestId": "REQ-1761326400000-A9F21C"
}
```

---

## 3. Authentication, CSRF, Idempotency & Concurrency Headers

1. **Session Authentication (`HttpOnly` Cookie):**
   - All requests from `ErpApiClient` include `credentials: 'same-origin'` (or `'include'` when `VITE_API_BASE_URL` is cross-origin).
   - The backend **MUST** resolve `userId` and `role` exclusively from the verified `vidyutflow_session` cookie and **NEVER** trust any client-supplied role parameter.
2. **CSRF Protection:**
   - All non-`GET` requests automatically send `X-VidyutFlow-CSRF: 1` and `X-Requested-With: VidyutFlow-ERP`.
   - Backend must reject state-changing requests missing this header or failing `Origin`/`Host` validation with `403 CSRF_VIOLATION`.
3. **Distributed Tracing (`X-Request-Id`):**
   - `ErpApiClient` generates a unique `X-Request-Id` (`REQ-<epoch>-<rand>`) per call. Echo this value in the response JSON `requestId` and server logs.
4. **Idempotency (`Idempotency-Key`):**
   - Sent on payment processing, application/complaint submission, and AI approval execution.
   - Store executed keys in `idempotency_keys` (`key VARCHAR(128) PRIMARY KEY, user_id VARCHAR(64), response_status INT, response_body JSONB, created_at TIMESTAMPTZ`). Return `409 IDEMPOTENCY_CONFLICT` if a duplicate execution is attempted.
5. **Optimistic Concurrency Control (`If-Match` / `X-Expected-Version`):**
   - Mutable tables carry an integer `version NOT NULL DEFAULT 1` column.
   - Update statements must execute `UPDATE ... SET ..., version = version + 1 WHERE id = $1 AND version = $2`. If 0 rows are updated while the record exists, return `409 CONFLICT_VERSION_MISMATCH`.

---

## 4. Relational Database Entities & Relationships (PostgreSQL DDL Blueprint)

1. **`users`** (`id PK`, `email UNIQUE`, `password_hash`, `name`, `role`, `designation`, `division`, `mobile_number`, `status`, `created_at`)
2. **`consumers`** (`consumer_no PK`, `name`, `phone`, `email`, `address`, `subdivision`, `aadhaar_masked`, `pan_masked`, `created_at`)
3. **`electricity_connections`** (`consumer_no PK FK -> consumers`, `connection_id UNIQUE`, `account_user_id FK -> users.id`, `meter_no UNIQUE`, `sanctioned_load_kw`, `phase`, `tariff_category`, `subdivision`, `feeder_name`, `status`, `version INT DEFAULT 1`)
4. **`connection_applications`** (`id PK`, `account_user_id FK -> users.id`, `applicant_name`, `phone`, `email`, `address`, `subdivision`, `category`, `requested_load_kw`, `phase`, `premises_type`, `status`, `workflow_step`, `assigned_work_order_id`, `version INT DEFAULT 1`)
5. **`complaints`** (`id PK`, `consumer_no FK -> electricity_connections`, `account_user_id FK -> users.id`, `category`, `description`, `priority`, `status`, `subdivision`, `feeder_name`, `sla_target_hours`, `sla_due_time`, `assigned_technician`, `assigned_work_order_id`, `version INT DEFAULT 1`)
6. **`work_orders`** (`id PK`, `title`, `type`, `priority`, `status`, `subdivision`, `feeder_name`, `assigned_to`, `application_id FK`, `complaint_id FK`, `inspection_report JSONB`, `version INT DEFAULT 1`)
7. **`electricity_bills`** (`bill_no PK`, `consumer_no FK`, `account_user_id FK`, `bill_month`, `total_amount`, `status`, `paid_date`, `transaction_ref`, `version INT DEFAULT 1`)
8. **`payment_transactions`** (`tx_id PK`, `bill_no FK -> electricity_bills`, `consumer_no FK`, `account_user_id FK`, `amount`, `payment_method`, `status`, `bank_reference`, `created_at`)
9. **`critical_incidents`** (`id PK`, `title`, `description`, `severity`, `module`, `entity_id`, `entity_type`, `status`, `responsible_roles TEXT[]`, `history JSONB`, `version INT DEFAULT 1`)
10. **`ai_action_recommendations`** (`id PK`, `agent_role`, `proposed_action`, `affected_record JSONB`, `reasoning_summary`, `supporting_references TEXT[]`, `risk_level`, `required_approving_role`, `status`, `previous_value`, `proposed_value`, `reviewed_by`, `reviewed_at`, `decision_remarks`, `execution_result JSONB`, `idempotency_key UNIQUE`, `version INT DEFAULT 1`)
11. **`audit_logs`** (`id PK`, `timestamp TIMESTAMPTZ`, `actor`, `role`, `action`, `resource`, `ip_address`, `status`, `meta_detail`) — **Append-only table (REVOKE UPDATE, DELETE from application DB user).**
12. **`notifications`** (`id PK`, `target_role`, `target_user_id FK`, `title`, `message`, `type`, `category`, `read BOOLEAN DEFAULT FALSE`, `created_at`)

---

## 5. Incident & Human-in-the-Loop Approval Lifecycle Contracts

### 5.1 Critical Incident Lifecycle (`CriticalIncident['status']`)
- Valid progression: `DETECTED` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `ESCALATED` $\rightarrow$ `RESOLVED`.
- Every transition appends an entry to `history[]` recording `{ timestamp, stage, actor, notes }`.

### 5.2 AI Recommendation & Human Approval Lifecycle (`AIActionRecommendation['status']`)
- Valid progression: `PROPOSED` $\rightarrow$ `PENDING_APPROVAL` $\rightarrow$ `APPROVED` / `REJECTED` $\rightarrow$ `EXECUTED` / `FAILED`.
- **Mandatory Server-Side Enforcement on `/api/v1/approvals/:id/execute`:**
  1. Verify caller's authenticated server session role against `ROLE_APPROVAL_AUTHORITY` (`consumer` has 0 permissions; `APPROVE_HIGH_RISK_SANCTION` requires `management`; `REVOKE_SUSPICIOUS_SESSION` requires `admin`).
  2. Reject if `status === 'REJECTED'` (`422 INVALID_STATUS_TRANSITION`) or `status === 'EXECUTED'` (`409 IDEMPOTENCY_CONFLICT`).
  3. Re-read the target entity (`application`, `complaint`, `work_order`, `incident`) inside a database transaction (`SELECT ... FOR UPDATE`) and verify its current status matches `recommendation.previousValue`. If changed, abort and mark `FAILED` (`409 CONFLICT_VERSION_MISMATCH`).
  4. Execute the mutation, update recommendation to `EXECUTED`, and insert an append-only row into `audit_logs` within the same database transaction.

---

## 6. Environment Variables & Integration Testing Checklist

### Required Environment Variables
| Variable | Scope | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Server-only | PostgreSQL connection string (`postgresql://...`) |
| `SESSION_SECRET` | Server-only | 32+ byte HMAC key for signing `HttpOnly` session tokens |
| `GEMINI_API_KEY` | Server-only | Google Gemini API key for `/api/ai-chat` (Never prefix with `VITE_`) |
| `VITE_API_BASE_URL` | Client/Build | Optional base URL when `/api` is hosted on a separate origin (defaults to `""` same-origin) |

### Integration Test Requirements
Run `npm test` (or `npm run test:backend`) to verify:
- Strict separation between `DEMO` and `LIVE` modes (no silent fallback to demo data on `503`/`404`/timeout).
- Request timeout enforcement via `AbortController`.
- Safe retry rules (retries idempotent `GET` on `503`, never retries un-keyed `POST` or `4xx`).
- Optimistic concurrency (`409 CONFLICT_VERSION_MISMATCH`) and duplicate mutation rejection (`409 IDEMPOTENCY_CONFLICT`).
- Cross-portal state synchronization and RBAC enforcement across all 9 repositories.
