# Phase 12 — Standard Operating Procedures (SOP), Alert Runbook & Rollback Plan

## 1. Alert Triage and Operational Runbooks

### 1.1 Overload Alert Runbook (`DTR_OVERLOAD_WARNING` / `DTR_OVERLOAD_CRITICAL`)
- **Condition**: Continuous transformer loading exceeding 85% (`WARNING`) or 100% (`CRITICAL`) of rated kVA over the configured sustained window.
- **Immediate Operator Actions**:
  1. **Acknowledge Alert**: Click "Acknowledge" in the Employee Transformer Cockpit or invoke `POST /transformers/alerts/{id}/acknowledge`. This silences escalation timers for 60 minutes.
  2. **Inspect Load Balancing**: Review the 3-phase current balance in the dossier telemetry chart. If neutral or phase unbalance > 20%, initiate phase redistribution work order on secondary LT lines.
  3. **Critical Overload Protocol (>100%)**:
     - Contact the Substation Control Room to review 11kV feeder interconnections.
     - If oil temperature exceeds 85°C, execute emergency feeder load-transfer via adjacent ring main unit (RMU).
     - Dispatch Field Engineer via "Dispatch Work Order" button (`POST /transformers/{id}/maintenance-work-orders`).

### 1.2 Thermal Runaway Runbook (`TEMP_RUNAWAY_CRITICAL`)
- **Condition**: Top oil temperature > 90°C or winding temperature > 105°C with a rate-of-rise > 5°C/hr.
- **Immediate Operator Actions**:
  1. Trigger immediate high-priority emergency alert to the Executive Engineer and Subdivision Officer.
  2. Direct substation attendant to verify cooling fins and check for physical oil leakage around conservator tank and radiator valves.
  3. Prepare for controlled manual trip if temperatures do not stabilize within 15 minutes of load shed.

### 1.3 High Vibration Runbook (`VIBRATION_CRITICAL`)
- **Condition**: Tri-axial vibration sensor reporting sustained velocity > 7.1 mm/s.
- **Immediate Operator Actions**:
  1. Schedule physical DTR inspection within 24 hours.
  2. Check for loose foundation anchor bolts, internal core lamination degradation, or failing bushings.
  3. Commission Dissolved Gas Analysis (DGA) oil sampling.

---

## 2. Risk Model Rollback & Downgrade Procedures

### 2.1 Live Admin Rollback (Instantaneous — Zero Downtime)
If the machine learning model demonstrates unexpected drift, high false positive rates, or uncalibrated probabilities in a production zone:
```bash
curl -X POST "https://vidyutflow.internal/api/transformer-policies/risk-model-mode" \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "rules_baseline"}'
```
- **System Response**: Immediately switches the model version to `rules-baseline-v1`.
- **Audit Record**: Automatically logs an immutable security entry in `AuditLog` recording the admin identity, old mode (`ml_advisory`), new mode (`rules_baseline`), and timestamp.

### 2.2 Environment Variable Fallback
To lock the system into deterministic rules across service restarts:
```bash
export TRANSFORMER_RISK_MODE="rules_baseline"
```

---

## 3. Database Restore and Disaster Recovery

### 3.1 Backup Verification
Verify daily encrypted snapshot integrity before initiating restore:
```bash
# Verify SHA-256 checksum of the target backup
sha256sum -c /var/backups/vidyutflow/vidyutflow-db-latest.sql.gz.sha256
```

### 3.2 Point-In-Time Restoration Procedure
1. Stop incoming API traffic:
   ```bash
   docker-compose stop backend
   ```
2. Restore database state to PostgreSQL:
   ```bash
   gunzip -c /var/backups/vidyutflow/vidyutflow-db-latest.sql.gz | psql -U vidyut -d vidyutflow
   ```
3. Run Alembic migration check:
   ```bash
   alembic upgrade head
   ```
4. Restart backend and verify health endpoint:
   ```bash
   docker-compose start backend
   curl -f http://localhost:8000/health
   ```

---

## 4. Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+psycopg2://vidyut:...@db:5432/vidyutflow` | Production PostgreSQL connection string |
| `SECRET_KEY` | *(Must be configured)* | Cryptographic HMAC key for JWT and session signing |
| `TRANSFORMER_RISK_MODE` | `ml_advisory` | Risk engine mode (`ml_advisory` or `rules_baseline`) |
| `TRANSFORMER_SSE_HEARTBEAT` | `15` | SSE keep-alive heartbeat interval in seconds |
| `TRANSFORMER_DLQ_RETENTION_DAYS` | `30` | Retention window for unparsed telemetry dead-letter queue |
| `TRANSFORMER_MAX_STREAM_CLIENTS` | `250` | Maximum concurrent SSE streaming connections |

