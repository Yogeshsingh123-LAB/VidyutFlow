# VidyutFlow – Production Configuration & Operational Guide

**Document Version:** 1.0.0  
**Authority:** DevOps & Security Operations Lead  
**Target Environment:** UGVCL / GUVNL Cloud Deployment

---

## 1. Port Allocation Strategy

To avoid port conflicts on shared developer workstations and production clusters (e.g. host IncrediBuild, IIS, local proxies), VidyutFlow employs a standardized port strategy:

| Service | Dev Port | Prod Port | Protocol | Notes |
|---|---|---|---|---|
| **Frontend UI (Vite)** | 3000 / 5173 | 443 / 80 | HTTPS / HTTP | Proxies `/api/*` to backend |
| **FastAPI Backend** | 8008 | 8000 / 8008 | HTTP (internal) | Fallback from 8000 if occupied |
| **PostgreSQL** | 5432 | 5432 | TCP | Dedicated database instance |
| **Redis** | 6379 | 6379 | TCP | Distributed rate limiting & cache |

---

## 2. Environment Variables Specification

### Core Application Settings (`backend/.env`)

```ini
APP_NAME=VidyutFlow
APP_ENV=production
# Must be at least 32 cryptographically random characters in production
SECRET_KEY=9f82c4e1b7a6d5f0e3c2b1a8d7e6f5c4b3a2e1d0f9c8b7a6e5d4c3b2a1f0e9d8
ALGORITHM=HS256
ACCESS_TOKEN_MINUTES=15
REFRESH_TOKEN_DAYS=7

# Production Database (PostgreSQL required)
DATABASE_URL=postgresql+psycopg://vidyut_user:StrongPassword123@postgres:5432/vidyutflow_db

# Distributed Rate Limiting (Redis required in production)
REDIS_URL=redis://redis:6379/0
TRUSTED_PROXY=true

# Allowed Origins (Never wildcard * with credentials in production)
CORS_ORIGINS=https://vidyutflow.ugvcl.com,https://admin.vidyutflow.ugvcl.com

# Shared Encrypted Document Storage
STORAGE_PROVIDER=s3
S3_ENDPOINT_URL=https://s3.ap-south-1.amazonaws.com
S3_BUCKET_NAME=ugvcl-vidyutflow-documents
S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_REGION=ap-south-1
UPLOAD_VAULT_DIR=uploads_encrypted

# Limits and Throttling
LOGIN_MAX_ATTEMPTS=20
LOGIN_WINDOW_SECONDS=60
LOGIN_ACCOUNT_MAX_ATTEMPTS=5
LOGIN_ACCOUNT_LOCKOUT_SECONDS=300
MAX_UPLOAD_BYTES=5242880
MAX_JSON_BODY_BYTES=2097152
```

---

## 3. Production Health Monitoring Endpoints

| Endpoint | Method | Expected Output | Purpose |
|---|---|---|---|
| `/health` | `GET` | `{"status":"ok","service":"VidyutFlow"}` | Liveness probe |
| `/health/db` | `GET` | `{"status":"healthy","read_latency_ms":1.2,...}` | Database readiness probe |
| `/system/status` | `GET` | Admin overview and service health telemetry | Metrics & operational telemetry |

