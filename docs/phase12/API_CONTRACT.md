# Phase 12 — Distribution Transformer Telemetry & Predictive Maintenance API Contract

Status: **Operational & Verified (100% Endpoint Test Coverage)**.  
All 17 transformer paths (22 operations) are dual-routed at both root (`/`) and `/v1/*` with `X-API-Version: v1`.

---

## 1. Addressing & Authentication

- **Base URL**: `http://127.0.0.1:8008` (Direct FastAPI) or `http://127.0.0.1:3000/api` (Node runtime gateway reverse-proxy).
- **Authentication**:
  - **Portal Staff / Consumer Endpoints**: Authenticated via standard `HttpOnly; SameSite=Lax` cookie (`vidyutflow_access_token`) or `Authorization: Bearer <token>`.
  - **Sensor Telemetry Ingestion (`POST /transformers/telemetry`)**: Authenticated exclusively via edge HMAC header `X-Telemetry-Ingest-Key` compared in constant-time against `TELEMETRY_INGEST_SECRET`. User bearer/cookie tokens are explicitly rejected with HTTP 403.
- **Role-Based Access Control (RBAC)**:
  - `consumer`: Blocked on all transformer endpoints with HTTP 403; writes a tamper-evident `SECURITY_VIOLATION` entry to the sequential SHA-256 `AuditLog` chain.
  - `engineer`: Scoped to assigned zone transformers; can view assets, telemetry, sensors, alerts, inspections, and create field inspections (`POST /transformers/{id}/inspections`). Cross-zone access yields HTTP 403 with `SECURITY_VIOLATION`.
  - `officer`: Scoped to subdivision zone; full visibility into assets, alerts, telemetry, inspections, predictive assessments, analytics, and policy thresholds. Can acknowledge/resolve alerts and issue maintenance work orders.
  - `admin`: Global access; asset registration (`POST`), asset metadata patching (`PATCH`), dead-letter inspection, threshold policy configuration (`POST /transformer-policies`), and manual predictive assessments.

---

## 2. Complete Operation Inventory

| Method | Path | Required Role / Auth | Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/transformers` | `engineer`, `officer`, `admin` | `200 OK` | List assets (zone-scoped for engineer/officer). Supports `?zone=`, `?substation_id=`, `?search=`. |
| `POST` | `/transformers` | `admin` | `201 Created` | Register a new distribution transformer asset. Audited with `TRANSFORMER_REGISTERED`. |
| `GET` | `/transformers/{id}` | `engineer`, `officer`, `admin` | `200 OK` | Retrieve single asset record by UUID or asset code. |
| `PATCH` | `/transformers/{id}` | `admin` | `200 OK` | Update asset metadata (rated kVA, oil capacity, manufacturer, health index). Audited. |
| `GET` | `/transformers/{id}/sensors` | `engineer`, `officer`, `admin` | `200 OK` | List instrumented telemetry sensors attached to asset. |
| `GET` | `/transformers/{id}/telemetry` | `engineer`, `officer`, `admin` | `200 OK` | Retrieve recent sensor telemetry readings (`?limit=50`). |
| `POST` | `/transformers/telemetry` | `X-Telemetry-Ingest-Key` (HMAC) | `201 Created` | Ingest batch telemetry readings from edge concentrators. Deduplicated on `(transformer_id, timestamp)`. |
| `GET` | `/transformers/telemetry/dead-letters` | `admin` | `200 OK` | Inspect quarantined telemetry dead-letters (`?limit=50`). |
| `GET` | `/transformers/alerts` | `engineer`, `officer`, `admin` | `200 OK` | List fleet operational alerts (zone-scoped). Supports `?status=`, `?severity=`, `?transformer_id=`. |
| `GET` | `/transformers/{id}/alerts` | `engineer`, `officer`, `admin` | `200 OK` | List operational alerts for a specific transformer asset. |
| `POST` | `/transformers/alerts/{alert_id}/acknowledge` | `engineer`, `officer`, `admin` | `200 OK` | Transition alert status to `ACKNOWLEDGED`. Audited with `TRANSFORMER_ALERT_ACKNOWLEDGED`. |
| `POST` | `/transformers/alerts/{alert_id}/resolve` | `officer`, `admin` | `200 OK` | Transition alert status to `RESOLVED` with mandatory resolution notes. Audited with `TRANSFORMER_ALERT_RESOLVED`. |
| `POST` | `/transformers/{id}/evaluate-alerts` | `officer`, `admin` | `200 OK` | Trigger deterministic rules engine evaluation on latest sensor readings. |
| `POST` | `/transformers/{id}/inspections` | `engineer`, `admin` | `201 Created` | Submit field engineer inspection checklist & physical findings. Idempotent on `client_uuid`. Audited. |
| `GET` | `/transformers/{id}/inspections` | `engineer`, `officer`, `admin` | `200 OK` | List historical field engineer inspections for an asset. |
| `POST` | `/transformers/{id}/assessments` | `officer`, `admin` | `201 Created` | Trigger or record an XGBoost + SHAP predictive failure risk assessment. Audited. |
| `GET` | `/transformers/{id}/assessments` | `officer`, `admin` | `200 OK` | List historical predictive failure risk assessments for an asset. |
| `POST` | `/transformers/{id}/maintenance-work-orders` | `officer`, `admin` | `201 Created` | Dispatch a preventive maintenance work order linked to risk assessment findings. Audited. |
| `GET` | `/transformer-analytics/summary` | `officer`, `admin` | `200 OK` | Aggregate fleet health index, status distribution, risk breakdown, and active alert counts. |
| `GET` | `/transformer-policies` | `officer`, `admin` | `200 OK` | Retrieve current operational threshold policy definitions (warning/critical limits). |
| `POST` | `/transformer-policies` | `admin` | `201 Created` | Update operational threshold policy limits. Audited with `TRANSFORMER_POLICY_UPDATED`. |
| `GET` | `/transformers/stream` | `engineer`, `officer`, `admin` | `200 OK (SSE)` | Real-time Server-Sent Events stream emitting `telemetry`, `alert`, and `heartbeat` events. |

---

## 3. Schema & Payload Specifications

### 3.1 Telemetry Ingestion (`POST /transformers/telemetry`)
**Header**: `X-Telemetry-Ingest-Key: <TELEMETRY_INGEST_SECRET>`

```json
{
  "readings": [
    {
      "transformer_id": "DEMO-TR-NORTH-01",
      "timestamp": "2026-11-05T01:30:00Z",
      "oil_temperature_c": 74.5,
      "winding_temperature_c": 82.1,
      "ambient_temperature_c": 31.0,
      "current_r": 180.2,
      "current_y": 178.5,
      "current_b": 182.0,
      "voltage_ry": 11050.0,
      "voltage_yb": 11040.0,
      "voltage_br": 11020.0,
      "loading_pct": 72.4,
      "vibration_velocity_rms_mms": 2.8,
      "oil_level_pct": 92.0,
      "voltage_thd_pct": 2.1
    }
  ]
}
```

**Response (`201 Created`)**:
```json
{
  "status": "success",
  "ingested_count": 1,
  "dead_letter_count": 0,
  "alerts_triggered": 0
}
```

---

### 3.2 Field Inspection (`POST /transformers/{id}/inspections`)
**Header**: `Authorization: Bearer <engineer_token>` or Cookie

```json
{
  "client_uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "inspection_date": "2026-11-05T01:30:00Z",
  "physical_condition": "GOOD",
  "oil_leakage_detected": false,
  "silica_gel_color": "BLUE",
  "earthing_resistance_ohms": 2.4,
  "bushing_condition": "CLEAN",
  "abnormal_noise_detected": false,
  "overall_recommendation": "OPERATIONAL_NOMINAL",
  "notes": "Quarterly physical inspection completed. No visible weeping or hot spots."
}
```

**Response (`201 Created`)**:
```json
{
  "id": "e8123456-789a-bcde-f012-3456789abcde",
  "client_uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "transformer_id": "DEMO-TR-NORTH-01",
  "engineer_id": "eng-uuid-001",
  "inspection_date": "2026-11-05T01:30:00Z",
  "physical_condition": "GOOD",
  "oil_leakage_detected": false,
  "silica_gel_color": "BLUE",
  "earthing_resistance_ohms": 2.4,
  "overall_recommendation": "OPERATIONAL_NOMINAL",
  "created_at": "2026-11-05T01:30:05Z"
}
```

---

### 3.3 Predictive Risk Assessment (`POST /transformers/{id}/assessments`)
**Header**: `Authorization: Bearer <officer_token>` or Cookie

```json
{
  "prediction_horizon_days": 30
}
```

**Response (`201 Created`)**:
```json
{
  "id": "a9876543-210f-edcb-a987-6543210fedcb",
  "transformer_id": "DEMO-TR-NORTH-01",
  "prediction_horizon_days": 30,
  "risk_score": 18.5,
  "risk_level": "LOW",
  "failure_probability": 0.042,
  "primary_driver": "winding_temp_c",
  "feature_attributions": {
    "winding_temp_c": 0.082,
    "oil_temp_c": 0.041,
    "utilization_pct": 0.015,
    "vibration_mms": 0.005,
    "active_critical_alerts": 0.0,
    "active_warning_alerts": 0.0,
    "age_years": 0.012,
    "voltage_thd_pct": 0.003,
    "ambient_temp_c": 0.004
  },
  "shap_summary": "Top risk factor: Winding Temperature (wt=82.1°C)",
  "recommended_review": "Routine inspection schedule maintains safe operating baseline.",
  "created_at": "2026-11-05T01:30:10Z"
}
```

---

### 3.4 Real-Time Server-Sent Events (`GET /transformers/stream`)
**Header**: `Authorization: Bearer <officer_token>` or Cookie  
**Query Parameters**:
- `zone`: Optional zone filter (`North`, `South`, `Central`).
- `max_events`: Optional integer limit for bounded test execution.
- `heartbeat_seconds`: Ping frequency (default 15s).

**Response Headers**:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `X-Accel-Buffering: no`
- `Connection: keep-alive`

**Event Stream Payloads**:
```text
event: connected
data: {"status":"connected","user_role":"officer","zone":"North","active_transformers":12}

event: telemetry
data: {"type":"TELEMETRY_INGESTED","transformer_id":"DEMO-TR-NORTH-01","loading_pct":72.4,"oil_temp_c":74.5,"winding_temp_c":82.1}

event: alert
data: {"type":"ALERT_TRIGGERED","alert_id":"al-123","severity":"CRITICAL","rule_name":"HIGH_WINDING_TEMPERATURE","current_value":106.2,"threshold":105.0}

: ping - 1730768400
```

