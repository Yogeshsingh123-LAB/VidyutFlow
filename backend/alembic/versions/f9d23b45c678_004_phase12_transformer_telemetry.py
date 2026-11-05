"""004_phase12_transformer_telemetry

Revision ID: f9d23b45c678
Revises: e8c12a34b567
Create Date: 2026-11-04 16:30:00.000000

Phase 12 Transformer Asset, Sensor Telemetry & Predictive Maintenance schema:
- transformers_asset
- transformer_sensors
- telemetry_readings (TimescaleDB optional; composite index used as fallback)
- transformer_alerts
- maintenance_assessments
- inspection_records
- alert_policy_versions
- telemetry_dead_letters
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f9d23b45c678'
down_revision: Union[str, Sequence[str], None] = 'e8c12a34b567'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    # 1. transformers_asset
    if "transformers_asset" not in existing_tables:
        op.create_table(
            "transformers_asset",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("utility_asset_code", sa.String(64), nullable=False, unique=True),
            sa.Column("feeder_id", sa.String(64), nullable=False),
            sa.Column("substation_id", sa.String(64), nullable=False),
            sa.Column("zone", sa.String(32), nullable=False),
            sa.Column("rated_kva", sa.Float(), nullable=False),
            sa.Column("phases", sa.Integer(), nullable=False),
            sa.Column("voltage_class", sa.String(16), nullable=False),
            sa.Column("commissioning_date", sa.Date(), nullable=True),
            sa.Column("manufacturer", sa.String(128), nullable=True),
            sa.Column("serial_number", sa.String(64), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("coordinate_source", sa.String(32), nullable=True),
            sa.Column("coordinate_verified_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("status", sa.String(16), server_default="IN_SERVICE", nullable=False),
            sa.Column("metadata_version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_transformers_asset_zone", "transformers_asset", ["zone"])
        op.create_index("ix_transformers_asset_feeder", "transformers_asset", ["feeder_id"])
        op.create_index("ix_transformers_asset_substation", "transformers_asset", ["substation_id"])
        op.create_index("ix_transformers_asset_code", "transformers_asset", ["utility_asset_code"])

    # 2. transformer_sensors
    if "transformer_sensors" not in existing_tables:
        op.create_table(
            "transformer_sensors",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("transformer_id", sa.String(36), sa.ForeignKey("transformers_asset.id"), nullable=False),
            sa.Column("sensor_type", sa.String(24), nullable=False),
            sa.Column("unit", sa.String(16), nullable=False),
            sa.Column("channel_phase", sa.String(8), nullable=False),
            sa.Column("calibration_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("source_system", sa.String(24), nullable=False),
            sa.Column("quality_state", sa.String(16), nullable=False),
            sa.Column("active", sa.Boolean(), server_default="1", nullable=False),
        )
        op.create_index("ix_transformer_sensors_transformer_id", "transformer_sensors", ["transformer_id"])

    # 3. telemetry_readings
    # TimescaleDB optional; composite index used as fallback.
    if "telemetry_readings" not in existing_tables:
        op.create_table(
            "telemetry_readings",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("transformer_id", sa.String(36), sa.ForeignKey("transformers_asset.id"), nullable=False),
            sa.Column("sensor_id", sa.String(36), sa.ForeignKey("transformer_sensors.id"), nullable=False),
            sa.Column("measured_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("value", sa.Float(), nullable=False),
            sa.Column("unit", sa.String(16), nullable=False),
            sa.Column("quality", sa.String(8), nullable=False),
            sa.Column("source", sa.String(24), nullable=False),
            sa.Column("ingestion_id", sa.String(64), nullable=False, unique=True),
            sa.Column("raw_payload_ref", sa.String(128), nullable=True),
        )
        op.create_index("ix_telemetry_transformer_measured", "telemetry_readings", ["transformer_id", "measured_at"])
        op.create_index("ix_telemetry_readings_sensor_id", "telemetry_readings", ["sensor_id"])
        op.create_index("ix_telemetry_readings_measured_at", "telemetry_readings", ["measured_at"])
        op.create_index("ix_telemetry_readings_ingestion_id", "telemetry_readings", ["ingestion_id"])

    # 4. transformer_alerts
    if "transformer_alerts" not in existing_tables:
        op.create_table(
            "transformer_alerts",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("transformer_id", sa.String(36), sa.ForeignKey("transformers_asset.id"), nullable=False),
            sa.Column("alert_type", sa.String(32), nullable=False),
            sa.Column("severity", sa.String(8), nullable=False),
            sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("status", sa.String(24), nullable=False),
            sa.Column("threshold_version", sa.String(32), nullable=False),
            sa.Column("evidence_refs", sa.Text(), nullable=False),
            sa.Column("dedupe_key", sa.String(128), nullable=False, unique=True),
            sa.Column("acknowledged_by", sa.String(36), nullable=True),
            sa.Column("escalation_state", sa.String(24), nullable=True),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_transformer_alerts_transformer_id", "transformer_alerts", ["transformer_id"])
        op.create_index("ix_transformer_alerts_dedupe_key", "transformer_alerts", ["dedupe_key"])

    # 5. maintenance_assessments
    if "maintenance_assessments" not in existing_tables:
        op.create_table(
            "maintenance_assessments",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("transformer_id", sa.String(36), sa.ForeignKey("transformers_asset.id"), nullable=False),
            sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("prediction_horizon", sa.String(8), nullable=False),
            sa.Column("risk_probability", sa.Float(), nullable=True),
            sa.Column("uncertainty", sa.Float(), nullable=True),
            sa.Column("model_version", sa.String(32), nullable=False),
            sa.Column("features", sa.Text(), nullable=False),
            sa.Column("explanation", sa.Text(), nullable=False),
            sa.Column("recommended_review", sa.Text(), nullable=False),
            sa.Column("human_decision", sa.String(16), server_default="PENDING", nullable=False),
        )
        op.create_index("ix_maintenance_assessments_transformer_id", "maintenance_assessments", ["transformer_id"])

    # 6. inspection_records
    if "inspection_records" not in existing_tables:
        op.create_table(
            "inspection_records",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("transformer_id", sa.String(36), sa.ForeignKey("transformers_asset.id"), nullable=False),
            sa.Column("work_order_id", sa.String(64), nullable=True),
            sa.Column("assigned_to", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("checklist", sa.Text(), nullable=False),
            sa.Column("observations", sa.Text(), nullable=True),
            sa.Column("photo_refs", sa.Text(), nullable=True),
            sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("gps_accuracy", sa.Float(), nullable=True),
            sa.Column("signature", sa.String(256), nullable=True),
            sa.Column("review_status", sa.String(16), server_default="PENDING", nullable=False),
        )
        op.create_index("ix_inspection_records_transformer_id", "inspection_records", ["transformer_id"])
        op.create_index("ix_inspection_records_work_order_id", "inspection_records", ["work_order_id"])
        op.create_index("ix_inspection_records_assigned_to", "inspection_records", ["assigned_to"])

    # 7. alert_policy_versions
    if "alert_policy_versions" not in existing_tables:
        op.create_table(
            "alert_policy_versions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("transformer_class", sa.String(32), nullable=False),
            sa.Column("thresholds", sa.Text(), nullable=False),
            sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False),
            sa.Column("approved_by", sa.String(36), nullable=True),
            sa.Column("version", sa.String(32), nullable=False),
            sa.Column("source_evidence", sa.String(64), nullable=False),
        )
        op.create_index("ix_alert_policy_versions_class", "alert_policy_versions", ["transformer_class"])

    # 8. telemetry_dead_letters
    if "telemetry_dead_letters" not in existing_tables:
        op.create_table(
            "telemetry_dead_letters",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("ingestion_id", sa.String(64), nullable=False),
            sa.Column("raw_payload", sa.Text(), nullable=False),
            sa.Column("error_reason", sa.String(128), nullable=False),
            sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("replayed_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_telemetry_dead_letters_ingestion_id", "telemetry_dead_letters", ["ingestion_id"])


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    for table in [
        "telemetry_dead_letters",
        "alert_policy_versions",
        "inspection_records",
        "maintenance_assessments",
        "transformer_alerts",
        "telemetry_readings",
        "transformer_sensors",
        "transformers_asset",
    ]:
        if table in existing_tables:
            op.drop_table(table)

