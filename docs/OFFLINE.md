# Offline Sync — What's Real, What's Not

> **Code Verification Scope:** Verified directly against [`frontend/src/utils/offlineFieldSync.ts`](../frontend/src/utils/offlineFieldSync.ts) (`L1–397`) and [`backend/app/routers/requests.py`](../backend/app/routers/requests.py) (`POST /requests/field-sync` at `L371–420`, dual-mounted at `/v1/requests/field-sync`). Note: there is no `frontend/src/offline/` directory; all client queue logic lives in `frontend/src/utils/offlineFieldSync.ts` and `FieldPortal.tsx`.

---

## Implemented

- **Dual-persisted on-device queue (`IndexedDB` + `localStorage` fallback):**
  - Queued field updates are written to IndexedDB database `vidyutflow_offline_db` (object store `field_sync_queue`) and mirrored synchronously to `localStorage` (`vidyutflow_field_offline_queue`) so queued inspections survive page reloads and tab restarts (`enqueueOfflineFieldUpdate` in `offlineFieldSync.ts`).
  - Queue items are partitioned by `actor_email` (`listOfflineFieldQueueForActor`) so two engineers sharing a browser profile only view and flush their own queued updates.
- **`client_uuid` idempotency and server-side deduplication:**
  - Every offline submission generates an RFC-4122 v4 UUID (`generateClientUuid`) stored on the queue record before any network attempt.
  - On `POST /v1/requests/field-sync`, the server checks `FieldUpdate.client_uuid` (`UNIQUE` column in SQLAlchemy). Replaying an already-processed UUID for the same engineer and request returns `{ "duplicate": true, "status": r.status }` with zero duplicate `AuditLog` entries or state mutations; concurrent duplicate arrivals catch `IntegrityError` and roll back cleanly (`requests.py:L376–417`). Reusing a `client_uuid` across a different engineer or `request_id` is rejected with HTTP `409`.
- **Automatic chronological replay on reconnect + manual flush:**
  - `FieldPortal` listens for browser `online` events and invokes `flushOfflineFieldQueue(actorEmail)` (plus an explicit "Sync Now" button), replaying `PENDING` items in chronological `queued_at` order once an authenticated `FIELD_ENGINEER` FastAPI session is active.
- **Duplicate-safe field outcome restriction & arrival-time ownership check:**
  - `POST /v1/requests/field-sync` only accepts `FIELD_VERIFIED`, `COMPLETED`, or `BLOCKED` (`requests.py:L386–387`) — field sync can never sanction (`APPROVED`) or reject (`REJECTED`) a request.
  - The server verifies `r.assigned_engineer_id == u.id` (`L384–385`) and `can_transition(r.status, body.outcome)` (`L395–396`) at sync arrival time.
- **Local hard-error `CONFLICT` parking (`409` / `403` / `404` / `400`):**
  - When the server rejects a replay with HTTP `409` (invalid state transition or UUID collision), `403` (reassigned away from engineer), `404`, or `400`, `flushOfflineFieldQueue` marks that item `sync_state = 'CONFLICT'` with `conflict_status` and `conflict_reason` instead of silently dropping it or blocking subsequent unrelated items (`offlineFieldSync.ts:L320–347`). The engineer can locally dismiss the item (`dismissFieldQueueConflict`) or switch its outcome and re-queue with a fresh `client_uuid` (`resolveConflictWithUpdatedOutcome`).

---

## Not implemented (acknowledged gap)

- **Scheduled exponential backoff timer:**
  - Contrary to naive "retry with backoff" assumptions, `offlineFieldSync.ts` does **not** schedule `setTimeout` exponential backoff retries or register the Service Worker Background Sync API. When a network error (`status === 0`) or `5xx` occurs during flush, `attempts` increments and `sync_state` stays `PENDING` (`L348–359`), waiting passively until the next browser `online` event or manual sync click.
- **Concurrent-edit conflict resolution / base-version check (silent last-writer-wins on compatible states):**
  - `FieldSync` (`backend/app/schemas.py`) carries `{ client_uuid, request_id, outcome, notes, meter_serial, latitude, longitude }` — it sends **no `expected_updated_at` timestamp, `etag`, or version vector**.
  - If a request is still in a transition-compatible state (`ROUTED` or `IN_PROGRESS`), a delayed offline sync unconditionally overwrites `r.meter_serial` and appends/updates field state without detecting concurrent metadata edits made while the engineer was offline.
  - Conversely, if an officer transitioned the request to an incompatible terminal state (`APPROVED` / `REJECTED`), the server returns `409`, parking the item only inside the engineer's local browser storage — the subdivision officer has zero server-side visibility into stranded field conflicts, and there is no field-by-field diff/merge UI.
- **Stale-assignment race protection (no assignment epoch / version vector):**
  - Ownership is checked only against current `r.assigned_engineer_id` at HTTP arrival time. If Engineer A queues an offline update, an officer reassigns the ticket to Engineer B (who records partial notes), and the ticket is later reassigned back to Engineer A before Engineer A reconnects, Engineer A's stale offline payload is accepted because no assignment epoch or version vector is tracked.
- **Partial-failure transaction recovery across multi-record field updates:**
  - `flushOfflineFieldQueue` replays one `POST /v1/requests/field-sync` call per item in a sequential loop (`L299–361`). There is no batch transaction envelope or compensating rollback if step 1 of a multi-part site visit succeeds and step 2 hits a `409` conflict.

---

## Why this matters

Consider a realistic UGVCL rural subdivision scenario in Sabarkantha or Banaskantha:

1. **09:30 AM (2G dead zone):** Junior Engineer Patel visits an agricultural pump-set site for `REQ-2041` (`IN_PROGRESS`), installs meter `UGV-MTR-99201`, and submits `FIELD_VERIFIED` offline. `offlineFieldSync.ts` persists the update locally with `client_uuid = 7f3c...`.
2. **11:15 AM (Subdivision office):** Before JE Patel regains cellular signal, the Subdivision Officer learns from the consumer at the counter that the borewell survey number on `REQ-2041` was disputed and transitions `REQ-2041` to `REJECTED` (or reassigns `REQ-2041` to another engineer).
3. **02:00 PM (Signal restored):** JE Patel's browser fires `online` and replays `POST /v1/requests/field-sync`:
   - **What VidyutFlow does today:** The server rejects the replay with HTTP `409` (`Invalid transition REJECTED -> FIELD_VERIFIED`) or `403` (`Not assigned to you`) and marks the item `CONFLICT` **only inside JE Patel's local IndexedDB**. Crucially, the physical meter `UGV-MTR-99201` is already bolted to the wall in the field, yet the Subdivision Officer's dashboard shows zero server-side alert that an offline physical meter installation collided with an office rejection. And if the officer had instead left `REQ-2041` in `IN_PROGRESS` while recording a different pre-allocated `meter_serial`, JE Patel's delayed sync would silently overwrite `r.meter_serial` (last-writer-wins) with no `expected_updated_at` check.
   - **What a production UGVCL field system requires:** Server-persisted conflict inbox rows visible to the Subdivision Officer, `expected_updated_at` / assignment-epoch preconditions on every `FieldSync` payload, jittered exponential backoff retries for intermittent rural 2G links, and an explicit officer reconciliation workflow whenever physical field work (`meter_serial` installed) collides with back-office state changes.
