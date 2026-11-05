# Phase 12 — Role-Based Access Control (RBAC) Matrix
## Endpoint × Role × Zone Scoping Specification

### 1. Authentication and Identity Context
All Phase 12 API endpoints require an authenticated JWT session (via `vidyutflow_access_token` HttpOnly cookie or `Authorization: Bearer <token>` header).
The active user identity is resolved by FastAPI's `get_current_user` dependency.

The four authorized VidyutFlow roles are:
- `consumer`: External retail power consumer (strictly isolated from internal distribution grid operations).
- `engineer`: Field Engineer / Line Inspector (assigned to physical substation/feeder operations).
- `officer`: Subdivision Officer / Junior Engineer (supervising subdivision reliability and maintenance).
- `admin`: System Administrator / Chief Distribution Engineer (full utility-wide configuration privileges).

---

### 2. Complete Endpoint Access Matrix

| Method | Endpoint Path | Consumer | Field Engineer (`engineer`) | Subdivision Officer (`officer`) | System Admin (`admin`) | Zone Scoped? |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `GET` | `/transformers` | 403 Forbidden (Audited) | Read (Zone-scoped) | Read (Zone-scoped) | Read (Global) | Yes |
| `POST` | `/transformers` | 403 Forbidden (Audited) | 403 Forbidden | 403 Forbidden | Allowed | No |
| `GET` | `/transformers/{id}` | 403 Forbidden (Audited) | Read (Zone-scoped) | Read (Zone-scoped) | Read (Global) | Yes |
| `PATCH`| `/transformers/{id}` | 403 Forbidden (Audited) | 403 Forbidden | 403 Forbidden | Allowed | No |
| `GET` | `/transformers/{id}/sensors` | 403 Forbidden (Audited) | Read (Zone-scoped) | Read (Zone-scoped) | Read (Global) | Yes |
| `GET` | `/transformers/{id}/telemetry` | 403 Forbidden (Audited) | Read (Zone-scoped) | Read (Zone-scoped) | Read (Global) | Yes |
| `POST` | `/transformers/telemetry` | 403 Forbidden (Audited) | Ingest (Zone-scoped) | Ingest (Zone-scoped) | Ingest (Global) | Yes |
| `GET` | `/transformers/{id}/alerts` | 403 Forbidden (Audited) | Read (Zone-scoped) | Read (Zone-scoped) | Read (Global) | Yes |
| `GET` | `/transformers/alerts` | 403 Forbidden (Audited) | Read (Zone-scoped) | Read (Zone-scoped) | Read (Global) | Yes |
| `POST` | `/transformers/alerts/{id}/acknowledge` | 403 Forbidden (Audited) | 403 Forbidden | Allowed (Zone-scoped) | Allowed (Global) | Yes |
| `POST` | `/transformers/alerts/{id}/resolve` | 403 Forbidden (Audited) | 403 Forbidden | Allowed (Zone-scoped) | Allowed (Global) | Yes |
| `POST` | `/transformers/{id}/evaluate-alerts` | 403 Forbidden (Audited) | 403 Forbidden | Allowed (Zone-scoped) | Allowed (Global) | Yes |
| `GET` | `/transformers/{id}/assessments` | 403 Forbidden (Audited) | Read (Zone-scoped) | Read (Zone-scoped) | Read (Global) | Yes |
| `POST` | `/transformers/{id}/assessments` | 403 Forbidden (Audited) | 403 Forbidden | Allowed (Zone-scoped) | Allowed (Global) | Yes |
| `POST` | `/transformers/{id}/assessments/{id}/decision` | 403 Forbidden (Audited) | 403 Forbidden | Allowed (Zone-scoped) | Allowed (Global) | Yes |
| `GET` | `/transformers/{id}/health` | 403 Forbidden (Audited) | Read (Zone-scoped) | Read (Zone-scoped) | Read (Global) | Yes |
| `GET` | `/transformers/{id}/maintenance-history` | 403 Forbidden (Audited) | Read (Zone-scoped) | Read (Zone-scoped) | Read (Global) | Yes |
| `GET` | `/transformers/{id}/inspections` | 403 Forbidden (Audited) | Read (Assigned/Zone) | Read (Zone-scoped) | Read (Global) | Yes |
| `POST` | `/transformers/{id}/inspections` | 403 Forbidden (Audited) | Create (Zone-scoped) | Create (Zone-scoped) | Allowed (Global) | Yes |
| `POST` | `/transformers/{id}/maintenance-work-orders` | 403 Forbidden (Audited) | 403 Forbidden | Allowed (Zone-scoped) | Allowed (Global) | Yes |
| `GET` | `/transformers/telemetry/dead-letters` | 403 Forbidden (Audited) | 403 Forbidden | 403 Forbidden | Allowed (Global) | No |
| `GET` | `/transformer-policies` | 403 Forbidden (Audited) | Read-only | Read-only | Full Access | No |
| `POST` | `/transformer-policies` | 403 Forbidden (Audited) | 403 Forbidden | 403 Forbidden | Allowed | No |
| `GET` | `/transformer-policies/risk-model-mode` | 403 Forbidden (Audited) | Read-only | Read-only | Read-only | No |
| `POST` | `/transformer-policies/risk-model-mode` | 403 Forbidden (Audited) | 403 Forbidden | 403 Forbidden | Allowed | No |
| `GET` | `/transformers/stream` (SSE) | 403 Forbidden (Audited) | Stream (Zone-scoped) | Stream (Zone-scoped) | Stream (Global) | Yes |
| `GET` | `/transformer-analytics/summary` | 403 Forbidden (Audited) | 403 Forbidden | Read (Zone-scoped) | Read (Global) | Yes |

---

### 3. Security Isolation Invariants
1. **Consumer Isolation**: Any HTTP request from a `consumer` token to `/transformers*` or `/transformer-*` produces a `403 Forbidden` response and records a security incident log in `AuditLog` with action `UNAUTHORIZED_TRANSFORMER_ACCESS_ATTEMPT`.
2. **Subdivision Boundary**: `engineer` and `officer` accounts can only view and modify transformers situated in their assigned `User.zone`. Querying assets from foreign zones yields a `404 Not Found` (to avoid information disclosure).
3. **Admin Exemption**: Users with role `admin` bypass geographic zone filtering to conduct system-wide oversight, cross-zone load-balancing, and utility emergency management.

