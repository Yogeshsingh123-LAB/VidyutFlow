# VidyutFlow – Database Migration & Schema Management

**Document Version:** 1.0.0  
**Authority:** Database Architect & DevOps Lead  
**Engine:** PostgreSQL (Production) / SQLite (Local Test)  
**Migration Tool:** Alembic

---

## 1. Migration Strategy Overview

VidyutFlow enforces strict separation between application code execution and database schema evolution. Runtime DDL statements (`CREATE TABLE`, `ALTER TABLE`) have been decoupled from the application lifespan when running in production (`APP_ENV=production`), eliminating race conditions in multi-worker environments.

---

## 2. Migration History & Revisions

```
c6af20b4dbc1 (001_phase1_auth_session_security)
       │
       ▼
d7b031e42ba2 (002_phase13_work_order_evidence)
       │
       ▼
e8c12a34b567 (003_geo_validation_and_directory) [HEAD]
```

### Revision Breakdown

#### 1. `c6af20b4dbc1`: Auth & Session Hardening
- Created `user_sessions` with token hash indexing.
- Created `password_reset_tokens`.
- Added MFA secret and recovery hashes columns to `users`.

#### 2. `d7b031e42ba2`: Work Order Evidence
- Created `work_order_evidence` with UUID idempotency index, verification status index, and submission tracking.

#### 3. `e8c12a34b567`: Geo Validation & UGVCL Directory (Current Head)
- Added `latitude`, `longitude`, and `validation_issues_json` to `connection_requests`.
- Created official UGVCL organizational hierarchy tables:
  - `utilities` (Corporate office details, CIN, HQ, helpline)
  - `circles` (Mehsana, Sabarmati, Himatnagar, Palanpur)
  - `divisions` (22 operational divisions with Executive Engineers)
  - `subdivisions` (148 regular + 3 REC subdivisions)
  - `section_offices` (Localized O&M and junior engineers)
  - `service_areas` (Village mapping, consumer prefix patterns)
  - `substations` (66kV/11kV substations with capacity and feeder counts)
  - `office_data_sources` (Audit provenance and RTI disclosure links)

---

## 3. Migration Commands & Execution

### Applying Migrations (Deployment Pipeline)
```bash
cd backend
alembic upgrade head
```

### Checking Current Migration State
```bash
alembic current
```

### Rollback (Downgrade One Revision)
```bash
alembic downgrade -1
```

### Rollback to Base
```bash
alembic downgrade base
```

---

## 4. Production Database Enforcement (`backend/app/db.py`)

- **PostgreSQL Requirement:** When `APP_ENV=production`, the application immediately raises `RuntimeError` at startup if `DATABASE_URL` uses SQLite.
- **Connection Pooling:**
  - `pool_size`: 20 connections
  - `max_overflow`: 10 connections
  - `pool_recycle`: 3600 seconds (1 hour)
  - `pool_pre_ping`: True (detects severed sockets proactively)
- **Database Health Check Endpoint:**
  - `GET /health/db` and `GET /api/health/db` return live pool telemetry, read latency, and write readiness.

