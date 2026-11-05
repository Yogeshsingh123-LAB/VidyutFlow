# Phase 12 — Smart Transformer Health, Telemetry & Overload Rules
## Entity-Relationship Diagram (ERD) & Database Specification

### 1. Architectural Overview
Phase 12 introduces 8 core relational entities into the VidyutFlow PostgreSQL/SQLite operational schema, maintaining strict foreign-key integrity, spatial indexing, composite time-series telemetry indexing, and audit trail linkability across the existing ERP and Work Order ecosystem.

```mermaid
erDiagram
    subdivision_zones ||--o{ transformers_asset : "zones"
    users ||--o{ inspection_records : "assigned_to"
    transformers_asset ||--o{ transformer_sensors : "monitors"
    transformers_asset ||--o{ telemetry_readings : "telemetry"
    transformers_asset ||--o{ transformer_alerts : "generates"
    transformers_asset ||--o{ maintenance_assessments : "evaluated_by"
    transformers_asset ||--o{ inspection_records : "inspected_by"
    transformer_sensors ||--o{ telemetry_readings : "captures"

    transformers_asset {
        string id PK "UUIDv4"
        string utility_asset_code UK "Unique asset barcode/code"
        string feeder_id FK "11kV Feeder reference"
        string substation_id FK "66/11kV Substation reference"
        string zone "Matches subdivision_zones.name"
        float rated_kva "Rated transformer capacity (kVA)"
        int phases "Phase configuration (1 or 3)"
        string voltage_class "Primary/Secondary voltage class (e.g. 11kV/433V)"
        date commissioning_date "Date installed and energized"
        string manufacturer "OEM equipment manufacturer"
        string serial_number "OEM serial number"
        float latitude "WGS-84 Decimal Latitude"
        float longitude "WGS-84 Decimal Longitude"
        string coordinate_source "GPS_SURVEY | GIS_IMPORT | MANUAL"
        datetime coordinate_verified_at "Verification timestamp"
        string status "IN_SERVICE | MAINTENANCE | FAULT | RETIRED"
        int metadata_version "Optimistic concurrency counter"
        datetime created_at "Record creation timestamp"
        datetime updated_at "Record last updated timestamp"
    }

    transformer_sensors {
        string id PK "UUIDv4"
        string transformer_id FK "transformers_asset.id"
        string sensor_type "CURRENT | VOLTAGE | OIL_TEMP | WINDING_TEMP | AMBIENT_TEMP"
        string unit "A | V | C | kVA | kvar | kW"
        string channel_phase "R | Y | B | 3P | AMBIENT"
        datetime calibration_at "Last calibration date"
        datetime last_seen_at "Last telemetry ingest date"
        string source_system "SCADA | AMI | IOT | SIMULATED_DEMO"
        string quality_state "GOOD | DEGRADED | UNRELIABLE | OFFLINE"
        boolean active "Sensor enabled flag"
    }

    telemetry_readings {
        string id PK "UUIDv4"
        string transformer_id FK "transformers_asset.id"
        string sensor_id FK "transformer_sensors.id"
        datetime measured_at "Sensor timestamp (UTC ISO-8601)"
        datetime received_at "Ingestion receiver timestamp"
        float value "Floating-point reading value"
        string unit "Physical unit"
        string quality "GOOD | SUSPECT | BAD"
        string source "SCADA | AMI | IOT | DEMO"
        string ingestion_id UK "Idempotency hash"
        string raw_payload_ref "Hash / cold-storage reference"
    }

    transformer_alerts {
        string id PK "UUIDv4"
        string transformer_id FK "transformers_asset.id"
        string alert_type "DTR_OVERLOAD_WARNING | DTR_OVERLOAD_CRITICAL | TEMP_RUNAWAY_CRITICAL | DTR_UNDERLOAD | UNBALANCE_WARNING"
        string severity "WARNING | CRITICAL | INFO"
        datetime first_seen_at "Initial threshold breach timestamp"
        datetime last_seen_at "Most recent breached reading timestamp"
        string status "ACTIVE | ACKNOWLEDGED | RESOLVED | SUPPRESSED"
        string threshold_version "Policy version applied"
        text evidence_refs "JSON-encoded telemetry reading IDs"
        string dedupe_key UK "Alert deduplication hash"
        string acknowledged_by FK "users.id (nullable)"
        string escalation_state "LOCAL_OFFICER | EE_DISPATCH | ERP_WORK_ORDER"
        datetime resolved_at "Resolution timestamp"
    }

    maintenance_assessments {
        string id PK "UUIDv4"
        string transformer_id FK "transformers_asset.id"
        datetime generated_at "Assessment generation timestamp"
        string prediction_horizon "24H | 7D | 30D | 90D"
        float risk_probability "Failure probability [0.00, 1.00]"
        float uncertainty "Model uncertainty / standard deviation"
        string model_version "xgboost-tree-explainer | rules-baseline-v1"
        text features "JSON key-value feature vector"
        text explanation "JSON array of SHAP attributions and drivers"
        text recommended_review "Actionable operational recommendations"
        string human_decision "PENDING | ACCEPTED | REJECTED | MODIFIED"
    }

    inspection_records {
        string id PK "UUIDv4"
        string transformer_id FK "transformers_asset.id"
        string work_order_id FK "Referenced ERP work order ID"
        string assigned_to FK "users.id"
        text checklist "JSON checklist items and scores"
        text observations "Field engineer notes"
        text photo_refs "JSON array of signed photo URIs"
        datetime verified_at "Verification completion timestamp"
        float gps_accuracy "Device GPS accuracy in meters"
        string signature "Inspector HMAC-SHA256 digital signature"
        string review_status "PENDING | APPROVED | REJECTED"
    }

    alert_policy_versions {
        string id PK "UUIDv4"
        string transformer_class "11KV_DTR_100KVA | 11KV_DTR_250KVA | 11KV_DTR_500KVA"
        text thresholds "JSON rule definitions and limits"
        datetime effective_from "Activation timestamp"
        string approved_by FK "users.id"
        string version "Policy version identifier (e.g. 2026.1)"
        string source_evidence "IEC60076-7 | DISCOM_CIRCULAR_2026"
    }

    telemetry_dead_letters {
        string id PK "UUIDv4"
        string ingestion_id "Idempotency hash of failed payload"
        text raw_payload "Malformed or unroutable JSON body"
        string error_reason "Validation error code / message"
        datetime received_at "Ingestion receipt timestamp"
        datetime replayed_at "Replay completion timestamp (nullable)"
    }
```

---

### 2. Indexes and Performance Strategy
1. **Time-Series Telemetry**: `ix_telemetry_transformer_measured` (`transformer_id`, `measured_at DESC`). Enables sub-5ms telemetry lookups over the sliding 24-hour window.
2. **Alert Deduplication**: `transformer_alerts.dedupe_key` (Unique constraint) prevents redundant notifications during sustained threshold violations.
3. **Idempotency**: `telemetry_readings.ingestion_id` prevents duplicate readings from retry bursts or poor network conditions in field gateways.
4. **Subdivision Scoping**: `transformers_asset.zone` indexed to support fast tenant/subdivision partitioning.

