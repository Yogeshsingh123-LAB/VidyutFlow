# Phase 10 Backend API & Streaming Contract (For Backend Integration)

**Module:** Smart Outage Map & Live Utility Operations Timeline  
**Frontend Adapter:** `frontend/src/outageMap/permissionsAndAdapter.ts` (`BackendOutageMapAdapter` & `OutageMapDataSource`)  
**Canonical Types:** `frontend/src/outageMap/types.ts`

---

## 1. Current Mode vs. Backend Live Mode

- **Current Default (`DemoOutageMapAdapter`):** Operates reactively over VidyutFlow's existing canonical `CriticalIncident[]`, `ComplaintRecord[]`, `WorkOrder[]`, `FEEDER_METRICS`, and `OfflineFieldQueueItem[]` state. Clearly displays `DEMO Reactive Mode (Local State · Simulated)` in the UI and marks all feeder service-area geometries `isSimulated: true`.
- **Backend Ready (`BackendOutageMapAdapter`):** Implements the identical `OutageMapDataSource` TypeScript interface over `/api/v1/outages/*` with `credentials: 'include'`, `AbortController` cancellation on rapid filter changes, and `EventSource` SSE streaming with automatic `RECONNECTING` state handling and deterministic listener cleanup.

---

## 2. Server-Side Authorization & Privacy Invariants (Mandatory)

When implementing `/api/v1/outages/*` in FastAPI, the server **must** enforce the exact role boundaries already enforced in `permissionsAndAdapter.ts`:

1. **Consumer (`role = "consumer"`):**
   - Return only confirmed outages in the consumer's linked service subdivision/feeder and the consumer's own outage-related complaints (`isConsumerOwnReport: true`).
   - **Strict PII Redaction:** `location` (exact GPS), `internalTitle`, `severity`, `assignedTeam`, `assignedEngineerId`, citizen phone numbers, residential street addresses, and internal staff notes **must be omitted (`null` / absent)** before serialization. Populate only coarse `publicLocation` (feeder/subdivision centroid).
   - Timeline endpoint must emit only `visibility = "public"` events (plus safe status milestones on the consumer's own complaint) with staff names redacted to `"UGVCL Service Desk"`.
2. **Employee (`role = "employee"`):**
   - Receives newly created **Employee-first** critical incidents and outage complaints within the employee's authorized subdivision scope (`All` / matching subdivision).
3. **Field Engineer (`role = "field"`):**
   - Receives **only** outages/work orders explicitly assigned to the authenticated engineer (`assignedEngineerId == current_user.id`), plus confirmed immediate life-safety hazards. Unassigned critical incidents **must not** be returned (`HTTP 403` on direct ID lookup).
4. **Management (`role = "management"`):**
   - Receives aggregate KPIs via `GET /api/v1/outages/summary` and individual outage records **only** when `status == "ESCALATED"` or `escalated_to == "management"` (plus life-safety emergencies). Un-escalated critical incidents remain Employee-first.
5. **Admin (`role = "admin"`):**
   - Receives operational outage and timeline records across subdivisions for system supervision while still omitting raw citizen phone numbers and residential billing addresses from map payloads.

---

## 3. REST & SSE Endpoints

### 3.1 `GET /api/v1/outages`
Returns role-scoped `OutageMapRecord[]`.

**Query Parameters (all optional):**
- `status`: `REPORTED` | `UNDER_EMPLOYEE_REVIEW` | `CONFIRMED_OUTAGE` | `ASSIGNED` | `ENGINEER_EN_ROUTE` | `WORK_IN_PROGRESS` | `RESTORATION_REPORTED` | `RESOLVED_CLOSED` | `CANCELLED_FALSE_ALARM`
- `severity`: `CRITICAL` | `HIGH` | `MEDIUM` | `LOW` (ignored for `consumer`)
- `subdivision`: Subdivision identifier/name
- `feeder`: Feeder ID or name
- `q`: Search substring matched against `id`, `incidentId`, `feederId`, `subdivisionId`, `affectedAreaLabel`

**Response `200 OK` (`OutageMapRecord[]`):**
```json
[
  {
    "id": "OUT-INC-FDR-11-KADI-04",
    "incidentId": "INC-FDR-11-KADI-04",
    "feederId": "FDR-11-KADI-04",
    "feederName": "11kV Kadi-Rural Ag Feeder (Jyotigram)",
    "subdivisionId": "Kadi Division",
    "affectedAreaLabel": "Kadi Division · 11kV Kadi-Rural Ag Feeder (Jyotigram)",
    "publicTitle": "Power Service Disruption — Kadi Division",
    "internalTitle": "Critical Overload on 11kV Kadi-Rural Ag Feeder (108.2%)",
    "location": { "latitude": 23.2991, "longitude": 72.3338 },
    "publicLocation": { "latitude": 23.2991, "longitude": 72.3338 },
    "impactAreaGeoJSON": {
      "isSimulated": false,
      "labelKey": "feederPolygonKadiAg",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [72.315, 23.285],
            [72.352, 23.285],
            [72.352, 23.314],
            [72.315, 23.314],
            [72.315, 23.285]
          ]
        ]
      }
    },
    "status": "CONFIRMED_OUTAGE",
    "isConfirmedOutage": true,
    "severity": "CRITICAL",
    "reportedAt": "2026-11-02T07:45:00Z",
    "updatedAt": "2026-11-02T08:10:00Z",
    "estimatedRestorationAt": "2026-11-02T11:30:00Z",
    "estimateConfidence": "provisional",
    "assignedTeam": "Kadi Line Patrol Unit",
    "source": "backend",
    "sourceLabel": "UGVCL Outage Service API",
    "freshnessLabel": "Live Backend Stream",
    "isSimulated": false,
    "versionSeq": 3
  }
]
```

### 3.2 `GET /api/v1/outages/{outage_or_incident_id}`
Returns a single role-scoped `OutageMapRecord` (`200 OK`), or `404 Not Found` / `403 Forbidden` when outside the caller's role scope.

### 3.3 `GET /api/v1/outages/events` & `GET /api/v1/outages/{id}/events`
Returns chronologically ordered `OperationsTimelineEvent[]` authorized for the caller's session.

**Offline Synchronization & Idempotency Contract:**
- Every field/lifecycle mutation carries a deterministic `correlationId` (or `client_uuid` from `POST /api/v1/requests/field-sync`).
- Re-submitting an already processed `correlationId` **must** be idempotent (no duplicate timeline row).
- Offline field updates **must** store both:
  - `occurredAt`: ISO-8601 timestamp captured on the engineer's device when offline (`created_offline_at`).
  - `receivedAt`: ISO-8601 server ingestion timestamp (`synced_at`).
- Out-of-order updates with `versionSeq < current.versionSeq` must be rejected with `409 Conflict` (or ignored in stream projections) so stale payloads never overwrite newer operational status.

### 3.4 `GET /api/v1/outages/summary`
Authorized for `management` and `admin` (`403` for other roles). Returns `ManagementOutageSummary`:
```json
{
  "totalVisibleOutages": 6,
  "activeOutages": 4,
  "resolvedOutages": 2,
  "escalatedCount": 1,
  "confirmedOutages": 3,
  "bySubdivision": {
    "Mehsana City North": 2,
    "Kadi Division": 1,
    "Gandhinagar Sub-Division 2": 2,
    "Mehsana Industrial GIDC": 1
  }
}
```

### 3.5 `GET /api/v1/outages/stream` (Server-Sent Events)
Emits lightweight change notifications (`text/event-stream`) scoped to the authenticated session cookie:
```text
data: {"reason":"STATE_UPDATED","timestamp":"2026-11-02T08:30:00Z","incidentId":"INC-CMP-8819"}
```
Upon receiving an event, `BackendOutageMapAdapter` triggers registered subscribers and refreshes authorized slices cleanly.
