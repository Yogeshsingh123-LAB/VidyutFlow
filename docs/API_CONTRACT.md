# VidyutFlow API contract — review candidate

Status: **demo-path endpoint shapes frozen 21 Oct 2026** (WORK_PLAN 1.3, ahead of the 24 Oct gate) — no breaking changes to the operations below without joint R1/R2 approval and a deliberate snapshot regen. Reviewed 17 Oct 2026; security/alerts hardening (notifications API, tamper-evident audit chain, security headers) folded into this freeze review. Remaining pre-v1.0 gates are listed at the end. Product, repository and API display labels use VidyutFlow; persistent storage identifiers remain unchanged for compatibility. This is the existing prototype API, not a new product scope.

## Addressing and authentication

Direct API paths below are relative to the backend root (local default port 8000). The frontend uses `/api` and Vite strips that prefix when proxying. Browser clients must use same-origin relative paths, not sandbox localhost URLs.

Login accepts **application/x-www-form-urlencoded** `username` (email) and `password`, not JSON. Protected operations require `Authorization: Bearer <access_token>`. Current database role/activity determines permission; changing the role in browser state grants nothing. Tokens default to 1,440 minutes; there is no refresh-token or revocation endpoint. Inactive users are rejected.

The machine-readable [OpenAPI snapshot](api/openapi.json) is generated from `app.openapi()`. Runtime schema and Swagger UI are available at `/openapi.json` and `/docs`. **Most handlers have no typed response model**, so OpenAPI alone does not enforce response fields. The behavioral notes below and regression tests supplement it; introducing full response models remains review work, not something falsely declared complete.

## Access policy

| Role | Request visibility |
|---|---|
| Consumer | Own requests |
| Engineer | Exact assigned engineer, including for single-record access and mutations |
| Officer | Exact current zone; blank zone fails closed |
| Admin | Global |

Officer zone scope is a prototype assumption, pending UGVCL confirmation. Collection/KPI/assistant queries use this policy. Officer audit logs include only request events for visible requests. Existing cross-zone assignments are not migrated automatically. Routing selects active same-zone staff, without cross-zone fallback.

## Operation inventory — 20 operations across 19 paths

| Method and path | Access | Success / response |
|---|---|---|
| GET `/health` | Public | 200: `status`, `service`, `data_notice`; liveness only, not DB readiness |
| POST `/auth/register` | Public, consumer role only | 201: `id,email,name,role,zone` |
| POST `/auth/login` | Public, throttled | 200: `access_token,token_type,role,name,user_id,zone` |
| GET `/auth/me` | Active authenticated user | 200: `id,email,name,role,zone` |
| GET `/auth/users` | Admin | 200: array of `id,email,name,role,zone,is_active`; no hashes |
| GET `/requests` | Authenticated, scoped | 200: request array, newest first; no pagination |
| POST `/requests` | Consumer only | 201: request; submitting user becomes consumer_id |
| POST `/requests/with-document` | Consumer only | 201: request; stores filename only, not file content |
| GET `/requests/{request_id}` | Scoped | 200: request |
| PATCH `/requests/{request_id}/status` | Officer/admin or assigned engineer | 200: updated request |
| GET `/requests/kpis/summary` | Authenticated, scoped | 200: KPI object |
| POST `/requests/field-sync` | Officer/admin or assigned engineer, scoped | 200: sync acknowledgment |
| GET `/requests/audit/verify` | Admin | 200: tamper-check over the audit hash chain (`ok,checked,legacy_skipped,last_entry_hash,broken_at`); read-only |
| GET `/requests/audit/logs` | Officer scoped / admin global | 200: latest 100 audit events |
| GET `/notifications` | Authenticated, own rows (admin: all) | 200: `unread`, `items[]` (max 50, newest first) |
| POST `/notifications/read-all` | Authenticated, own rows | 200: `marked_read` |
| POST `/notifications/{notification_id}/read` | Owner or admin | 200: updated notification; another user's row returns 403 |
| POST `/assistant/chat` | Authenticated | 200: answer plus branch-dependent data/sources |
| GET `/assistant/ml-metrics` | Authenticated | 200: synthetic model metrics; no real-world performance claim |
| GET `/system/status` | Admin only | 200: global technical status/counts |

**System-status boundary:** `/system/status` is admin-only. Officers use their zone-filtered `/requests/kpis/summary`; they cannot access global technical counts.

## Input and output details

### Registration and request creation

Registration JSON requires `email,name,password`; defaults `role=consumer, zone=North`. Other roles are rejected with 403. Duplicate email returns 400. No password strength policy or registration throttle yet. Password hashing currently truncates to bcrypt's 72-byte boundary; explicit validation remains a pre-production security task.

Request JSON requires `applicant_name,phone,address`. Defaults: `zone=North`, `pin_code=""`, `request_type=new_connection`, `description=""`, `requested_load_kw=1.0`, `document_name=""`, `tariff_category="Residential (RGPU)"`, `phase="1-Phase"`, `premises_type=Owned`.

Multipart creation takes the same applicable fields as form values, with optional `document` file instead of `document_name`. No document-download endpoint exists. Workflow validation failures create a request with `NEEDS_CORRECTION` and explanatory `validation_notes`; this is a **201**, not a failed transport response. Zone taxonomy and routing settings are prototype assumptions.

Request responses serialize database columns: `id,consumer_id,applicant_name,phone,address,zone,pin_code,request_type,description,requested_load_kw,tariff_category,phase,premises_type,document_name,meter_serial,category,severity,priority,sla_breach_risk,sla_risk_reasons,status,assigned_officer_id,assigned_engineer_id,validation_notes,sla_due_at,created_at,updated_at`. `sla_risk_reasons` is an array, not JSON text. Dates are JSON date-time strings; `sla_due_at` can be null. SQLite may serialize naive dates; clients should not assume timezone normalization is enforced. Unassigned IDs are empty strings.

### Status and sync

Status PATCH JSON: required `status`, optional `notes=""`. Accepted values: `ASSIGNED,FIELD_VERIFIED,APPROVED,COMPLETED,REJECTED,NEEDS_CORRECTION,IN_PROGRESS`. Engineers may use only `IN_PROGRESS,FIELD_VERIFIED,COMPLETED`; other accepted values return 403. Unknown values return 400. A [transition graph](STATUS_TRANSITIONS.md) is enforced. COMPLETED/REJECTED are terminal, including same-status writes; invalid transitions and stale database snapshots return 409. ASSIGNED → COMPLETED remains allowed in the demo (approval is not a mandatory prerequisite).

Sync JSON: required strings `client_uuid,request_id,task_status`; optional `notes,meter_serial,created_offline_at` default to empty strings. `client_uuid` is currently a string deduplication key, not UUID-format validated. Only `FIELD_VERIFIED,COMPLETED,BLOCKED` are accepted. A fresh sync returns `duplicate:false,synced:true,field_update_id,request_status`. An authorized same-actor/same-request retry returns `duplicate:true,synced:false,field_update_id,message`. Cross-actor/request UUID reuse returns 409. Authorization is checked first. Retry semantics are **first write wins**: changed notes/status using the same UUID are ignored, not merged. For changed work, generate a new UUID.

### Reporting and assistant

KPI fields: `total_requests,completed,pending,high_sla_risk,needs_correction,avg_sla_risk,risk_buckets,by_status,by_zone,by_category,by_severity`. Risk buckets: `low_<0.4,watch_0.4-0.7,high_>=0.7`. `pending` counts requests whose status is neither COMPLETED nor REJECTED, matching assistant pending counts and the open set used for risk calculations. `total_requests` still includes all statuses; rejected is available in `by_status`.

Audit rows: `id,actor_id,actor_role,action,entity_id,detail,prev_hash,entry_hash,created_at`. Each row's `entry_hash` is a sha256 hash chain over its fields plus the previous row's hash (tamper-evident; rows from before the upgrade have empty hashes and are reported as `legacy_skipped`, never counted as verified). `GET /requests/audit/verify` walks the chain read-only and returns `ok,checked,legacy_skipped,last_entry_hash,broken_at`; pin `last_entry_hash` externally if stronger evidence is needed. Editing, deleting or reordering any chained row makes `ok:false` with `broken_at` naming the first bad row.

### Notifications (alert centre)

Workflow events create rows: submit (consumer confirmation, zone officers, assigned engineer), status change and field sync (all attached parties except the actor). Notification items: `id,title,message,kind,request_id,read,created_at`; `kind` is `info|warning|success|alert`. Listing is strictly per-user (admin sees all for support); mark-read is owner-or-admin. Rows never cross user scope in responses. `request_id` is a plain string, not a foreign key.

### Frozen request shapes for R2 wiring (examples)

`GET /requests` (array of requests, newest first):

```json
[{"id": "3f2…", "consumer_id": "9a1…", "applicant_name": "Demo Consumer", "phone": "9876543210",
  "address": "North Zone, Gujarat", "zone": "North", "pin_code": "", "request_type": "new_connection",
  "description": "need new electricity connection for my home", "requested_load_kw": 3.0,
  "tariff_category": "Residential (RGPU)", "phase": "1-Phase", "premises_type": "Owned",
  "document_name": "id_proof.pdf", "meter_serial": "", "category": "NEW_CONNECTION", "severity": "LOW",
  "priority": "P4-LOW", "sla_breach_risk": 0.12, "sla_risk_reasons": [], "status": "ASSIGNED",
  "assigned_officer_id": "…", "assigned_engineer_id": "…", "validation_notes": "",
  "sla_due_at": "2026-10-24T10:00:00", "created_at": "2026-10-21T10:00:00", "updated_at": "2026-10-21T10:00:00"}]
```

`GET /requests/kpis/summary` (object):

```json
{"total_requests": 6, "completed": 1, "pending": 5, "high_sla_risk": 1, "needs_correction": 1,
 "avg_sla_risk": 0.31, "risk_buckets": {"low_<0.4": 3, "watch_0.4-0.7": 1, "high_>=0.7": 1},
 "by_status": {"ASSIGNED": 4, "NEEDS_CORRECTION": 1, "COMPLETED": 1}, "by_zone": {"North": 5, "South": 1},
 "by_category": {"NEW_CONNECTION": 6}, "by_severity": {"LOW": 3, "MEDIUM": 2, "HIGH": 1}}
```

`POST /requests/with-document` (multipart form fields `applicant_name,phone,address` required; `zone,pin_code,request_type,description,requested_load_kw,tariff_category,phase,premises_type` optional; file field `document` optional) returns a single request object (201) with the same keys as `GET /requests` items. Workflow validation failures still return **201** with `status: "NEEDS_CORRECTION"` and `validation_notes` filled.

Assistant input: `{"question":"Which requests have SLA breach risk?"}`. Every branch includes `answer,data`. Risk rows include `id,applicant,zone,status,sla_breach_risk,reasons`; counts have empty data. Policy answers may include `sources,excerpts`. This is keyword dispatch plus TF-IDF retrieval, not an external LLM. Model metric fields come from the synthetic-training artifact and can change when evaluation changes.

System status fields: `service,status,database,counts,ml,assistant,process_uptime_seconds,services`. Static service labels are not independent readiness probes; database failures can still result in a server error when subsequent count queries fail.

## Error contract

Most deliberate errors use `{"detail":"message"}`. Schema validation failures use 422 with an array under `detail`; clients must handle both types. Missing bearer authentication can use FastAPI's standard authentication response.

- 400: invalid status / sync task status; duplicate registration email.
- 401: bad credentials, inactive user, invalid/expired token.
- 403: role or request-scope denial; public non-consumer registration.
- 404: request ID not found (known-but-inaccessible records return 403).
- 409: sync key owned by another actor/request; forbidden lifecycle transition; terminal-state update; stale database snapshot. Existing authorized UUID retries remain successful acknowledgments.
- 422: malformed/missing schema fields.
- 429: login budget exhausted, with `Retry-After` seconds. Default 20 attempts per observed IP per 60s per process; counts success and failure. Counters reset on restart. Configure trusted proxies carefully.

Unexpected DB/application failures can still produce 500. Do not blindly retry writes except field-sync with the same key. Registration/create-request operations have no idempotency key.

## Review gates before freeze

- [x] Inventory and current input schemas captured.
- [x] Auth/scope/error semantics and known limitations documented.
- [x] OpenAPI drift check added; this detects schema changes, not all behavioral changes.
- [x] Implemented review decisions: admin-only system status, open-only pending counts, consumer-only JSON/multipart creation; frontend calls and regression coverage updated.
- [ ] R1/R2 final acceptance of these behavior changes (not implied by local implementation).
- [x] Terminal-state transition rules implemented with regression coverage; see STATUS_TRANSITIONS.md.
- [ ] Decide and implement required response models before freeze.
- [x] Docker Compose end-to-end, scripted browser conflict and restart persistence evidence recorded in verification/README.md.
- [ ] Team manual acceptance on target hardware.
- [x] Demo-path endpoint shapes frozen 21 Oct 2026 (this revision: +notifications, +audit verify, security headers); changelog updated. Full v1.0 freeze still requires the open gates above.

Regenerate snapshot deliberately after a reviewed API change:

```sh
cd backend
python scripts/export_openapi.py
python -m pytest -q
```

### Compatibility note — 17 Oct 2026

Previously accepted staff/admin create calls and officer system-status reads now return 403. KPI pending excludes rejected requests. Successful response keys are unchanged. OpenAPI drift alone cannot detect these policy/meaning changes; `test_freeze_review_role_boundaries_and_pending_semantics` tests them. Staff-assisted intake is deferred until explicit consumer ownership and audit requirements are designed.
