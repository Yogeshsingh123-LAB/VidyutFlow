"""006_phase11a_persistent_meter_reading_system

Revision ID: b1c2d3e4f5a6
Revises: a7b8c9d0e1f2
Create Date: 2026-11-05 20:25:00.000000

Phase 11A Persistent AI Meter Reading & Intelligent Bill Anomaly Detection schema:
- meter_configurations
- meter_configuration_versions
- meter_private_photos
- meter_reading_submissions
- meter_events
- meter_ocr_results
- meter_ambiguous_digits
- meter_reading_review_history
- meter_anomaly_cases
- meter_anomaly_status_history
- consumer_billing_reviews
- consumer_billing_review_history
- meter_threshold_policy_versions
- financial_adjustment_proposals
- financial_adjustment_history
- meter_notification_dedup
- actor_idempotency_records
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    if "meter_configurations" not in existing_tables:
        op.create_table(
            "meter_configurations",
            sa.Column("connection_no", sa.String(32), primary_key=True),
            sa.Column("serial_number", sa.String(64), nullable=False),
            sa.Column("digit_count", sa.Integer(), server_default="6", nullable=False),
            sa.Column("integral_digits", sa.Integer(), server_default="5", nullable=False),
            sa.Column("fractional_digits", sa.Integer(), server_default="1", nullable=False),
            sa.Column("multiplier", sa.Float(), server_default="1.0", nullable=False),
            sa.Column("allow_rollover", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("max_rollover_value", sa.Float(), server_default="99999.9", nullable=False),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_by_id", sa.String(64), server_default="SYSTEM", nullable=False),
            sa.Column("updated_by_name", sa.String(128), server_default="System Seed", nullable=False),
        )
        op.create_index("ix_meter_configurations_serial", "meter_configurations", ["serial_number"])

    if "meter_configuration_versions" not in existing_tables:
        op.create_table(
            "meter_configuration_versions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("connection_no", sa.String(32), sa.ForeignKey("meter_configurations.connection_no"), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("serial_number", sa.String(64), nullable=False),
            sa.Column("digit_count", sa.Integer(), nullable=False),
            sa.Column("integral_digits", sa.Integer(), nullable=False),
            sa.Column("fractional_digits", sa.Integer(), nullable=False),
            sa.Column("multiplier", sa.Float(), nullable=False),
            sa.Column("allow_rollover", sa.Boolean(), nullable=False),
            sa.Column("max_rollover_value", sa.Float(), nullable=False),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("changed_by_id", sa.String(64), nullable=False),
            sa.Column("changed_by_name", sa.String(128), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_meter_config_versions_conn", "meter_configuration_versions", ["connection_no", "version"])

    if "meter_private_photos" not in existing_tables:
        op.create_table(
            "meter_private_photos",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("owner_type", sa.String(32), nullable=False),
            sa.Column("owner_id", sa.String(64), nullable=True),
            sa.Column("connection_no", sa.String(32), nullable=False),
            sa.Column("consumer_no", sa.String(32), nullable=False),
            sa.Column("uploaded_by_id", sa.String(64), nullable=False),
            sa.Column("uploaded_by_name", sa.String(128), nullable=False),
            sa.Column("uploaded_by_role", sa.String(32), nullable=False),
            sa.Column("storage_key", sa.String(256), nullable=False, unique=True),
            sa.Column("mime_type", sa.String(64), server_default="image/jpeg", nullable=False),
            sa.Column("byte_length", sa.Integer(), server_default="0", nullable=False),
            sa.Column("sha256", sa.String(64), nullable=False),
            sa.Column("encryption_key_id", sa.String(64), server_default="aes-256-gcm-hkdf-v1", nullable=False),
            sa.Column("metadata_stripped", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_meter_private_photos_conn", "meter_private_photos", ["connection_no"])
        op.create_index("ix_meter_private_photos_owner", "meter_private_photos", ["owner_type", "owner_id"])

    if "meter_reading_submissions" not in existing_tables:
        op.create_table(
            "meter_reading_submissions",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("client_uuid", sa.String(128), nullable=False, unique=True),
            sa.Column("connection_no", sa.String(32), nullable=False),
            sa.Column("consumer_no", sa.String(32), nullable=False),
            sa.Column("consumer_name", sa.String(128), nullable=False),
            sa.Column("subdivision", sa.String(64), server_default="Sabarmati Subdivision", nullable=False),
            sa.Column("submitted_by_id", sa.String(64), nullable=False),
            sa.Column("submitted_by_name", sa.String(128), nullable=False),
            sa.Column("submitted_by_role", sa.String(32), nullable=False),
            sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("capture_mode", sa.String(32), server_default="CONSUMER_PHOTO", nullable=False),
            sa.Column("work_order_id", sa.String(64), nullable=True),
            sa.Column("previous_reading", sa.Float(), nullable=False),
            sa.Column("previous_reading_date", sa.String(32), nullable=False),
            sa.Column("submitted_reading", sa.Float(), nullable=False),
            sa.Column("reading_date", sa.String(32), nullable=False),
            sa.Column("cycle_days", sa.Integer(), nullable=False),
            sa.Column("multiplier", sa.Float(), server_default="1.0", nullable=False),
            sa.Column("effective_consumption", sa.Float(), nullable=False),
            sa.Column("ocr_raw_text", sa.Text(), nullable=False),
            sa.Column("ocr_normalized_reading", sa.Float(), nullable=True),
            sa.Column("ocr_confidence", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("ocr_engine_version", sa.String(64), server_default="tesseract.js-7.0.0-local-v1", nullable=False),
            sa.Column("manual_override", sa.Boolean(), server_default="0", nullable=False),
            sa.Column("override_reason", sa.Text(), nullable=True),
            sa.Column("quality_passed", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("quality_warnings_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("photo_id", sa.String(64), sa.ForeignKey("meter_private_photos.id"), nullable=True),
            sa.Column("anomalies_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("status", sa.String(32), server_default="APPROVED", nullable=False),
            sa.Column("provisional_amount", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("provisional_breakdown_json", sa.Text(), server_default="{}", nullable=False),
            sa.Column("meter_config_version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("threshold_version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("reviewed_by_id", sa.String(64), nullable=True),
            sa.Column("reviewed_by_name", sa.String(128), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("review_note", sa.Text(), nullable=True),
            sa.Column("corrected_reading", sa.Float(), nullable=True),
            sa.Column("demo", sa.Boolean(), server_default="1", nullable=False),
        )
        op.create_index("ix_meter_reading_submissions_conn", "meter_reading_submissions", ["connection_no"])
        op.create_index("ix_meter_reading_submissions_status", "meter_reading_submissions", ["status"])

    if "meter_events" not in existing_tables:
        op.create_table(
            "meter_events",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("reading_id", sa.String(64), sa.ForeignKey("meter_reading_submissions.id"), nullable=False),
            sa.Column("connection_no", sa.String(32), nullable=False),
            sa.Column("event_type", sa.String(32), nullable=False),
            sa.Column("old_meter_final_reading", sa.Float(), nullable=True),
            sa.Column("new_meter_start_reading", sa.Float(), nullable=True),
            sa.Column("rollover_max_value", sa.Float(), nullable=True),
            sa.Column("effective_consumption", sa.Float(), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("recorded_by_id", sa.String(64), nullable=False),
            sa.Column("recorded_by_name", sa.String(128), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_meter_events_reading_id", "meter_events", ["reading_id"])
        op.create_index("ix_meter_events_conn", "meter_events", ["connection_no"])

    if "meter_ocr_results" not in existing_tables:
        op.create_table(
            "meter_ocr_results",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("reading_id", sa.String(64), sa.ForeignKey("meter_reading_submissions.id"), nullable=False, unique=True),
            sa.Column("meter_id", sa.String(64), nullable=False),
            sa.Column("engine_version", sa.String(64), nullable=False),
            sa.Column("raw_text", sa.Text(), nullable=False),
            sa.Column("candidate_reading", sa.Float(), nullable=True),
            sa.Column("normalized_reading", sa.Float(), nullable=True),
            sa.Column("confidence", sa.Float(), nullable=False),
            sa.Column("requires_review", sa.Boolean(), server_default="0", nullable=False),
            sa.Column("manual_override", sa.Boolean(), server_default="0", nullable=False),
            sa.Column("override_reason", sa.Text(), nullable=True),
            sa.Column("quality_passed", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("quality_warnings_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("extracted_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_meter_ocr_results_reading", "meter_ocr_results", ["reading_id"])

    if "meter_ambiguous_digits" not in existing_tables:
        op.create_table(
            "meter_ambiguous_digits",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("ocr_result_id", sa.String(36), sa.ForeignKey("meter_ocr_results.id"), nullable=False),
            sa.Column("reading_id", sa.String(64), sa.ForeignKey("meter_reading_submissions.id"), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False),
            sa.Column("char_value", sa.String(8), nullable=False),
            sa.Column("alternatives_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("confidence", sa.Float(), nullable=False),
            sa.Column("reason", sa.Text(), nullable=False),
        )
        op.create_index("ix_meter_ambiguous_digits_reading", "meter_ambiguous_digits", ["reading_id"])

    if "meter_reading_review_history" not in existing_tables:
        op.create_table(
            "meter_reading_review_history",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("reading_id", sa.String(64), sa.ForeignKey("meter_reading_submissions.id"), nullable=False),
            sa.Column("action", sa.String(32), nullable=False),
            sa.Column("previous_status", sa.String(32), nullable=False),
            sa.Column("new_status", sa.String(32), nullable=False),
            sa.Column("actor_id", sa.String(64), nullable=False),
            sa.Column("actor_name", sa.String(128), nullable=False),
            sa.Column("actor_role", sa.String(32), nullable=False),
            sa.Column("note", sa.Text(), nullable=False),
            sa.Column("corrected_reading", sa.Float(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_meter_reading_review_history_reading", "meter_reading_review_history", ["reading_id"])

    if "meter_anomaly_cases" not in existing_tables:
        op.create_table(
            "meter_anomaly_cases",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("reading_id", sa.String(64), sa.ForeignKey("meter_reading_submissions.id"), nullable=False),
            sa.Column("connection_no", sa.String(32), nullable=False),
            sa.Column("consumer_no", sa.String(32), nullable=False),
            sa.Column("consumer_name", sa.String(128), nullable=False),
            sa.Column("subdivision", sa.String(64), server_default="Sabarmati Subdivision", nullable=False),
            sa.Column("category", sa.String(64), nullable=False),
            sa.Column("severity", sa.String(16), nullable=False),
            sa.Column("status", sa.String(32), server_default="PENDING_REVIEW", nullable=False),
            sa.Column("summary", sa.Text(), nullable=False),
            sa.Column("reasons_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("evidence_json", sa.Text(), server_default="{}", nullable=False),
            sa.Column("expected_value", sa.Float(), nullable=True),
            sa.Column("recorded_value", sa.Float(), nullable=True),
            sa.Column("review_action", sa.Text(), nullable=True),
            sa.Column("threshold_version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("recommended_action", sa.Text(), nullable=False),
            sa.Column("assigned_role", sa.String(32), server_default="EMPLOYEE", nullable=False),
            sa.Column("resolution_note", sa.Text(), nullable=True),
            sa.Column("adjusted_units", sa.Float(), nullable=True),
            sa.Column("adjusted_amount", sa.Float(), nullable=True),
            sa.Column("resolved_by_id", sa.String(64), nullable=True),
            sa.Column("resolved_by_name", sa.String(128), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("demo", sa.Boolean(), server_default="1", nullable=False),
        )
        op.create_index("ix_meter_anomaly_cases_conn", "meter_anomaly_cases", ["connection_no"])
        op.create_index("ix_meter_anomaly_cases_status", "meter_anomaly_cases", ["status"])

    if "meter_anomaly_status_history" not in existing_tables:
        op.create_table(
            "meter_anomaly_status_history",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("anomaly_id", sa.String(64), sa.ForeignKey("meter_anomaly_cases.id"), nullable=False),
            sa.Column("from_status", sa.String(32), nullable=True),
            sa.Column("to_status", sa.String(32), nullable=False),
            sa.Column("actor_id", sa.String(64), nullable=False),
            sa.Column("actor_name", sa.String(128), nullable=False),
            sa.Column("actor_role", sa.String(32), nullable=False),
            sa.Column("note", sa.Text(), nullable=False),
            sa.Column("adjusted_units", sa.Float(), nullable=True),
            sa.Column("adjusted_amount", sa.Float(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_meter_anomaly_status_history_case", "meter_anomaly_status_history", ["anomaly_id"])

    if "consumer_billing_reviews" not in existing_tables:
        op.create_table(
            "consumer_billing_reviews",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("client_uuid", sa.String(128), nullable=False, unique=True),
            sa.Column("bill_no", sa.String(64), nullable=False),
            sa.Column("connection_no", sa.String(32), nullable=False),
            sa.Column("consumer_no", sa.String(32), nullable=False),
            sa.Column("consumer_name", sa.String(128), nullable=False),
            sa.Column("subdivision", sa.String(64), server_default="Sabarmati Subdivision", nullable=False),
            sa.Column("category", sa.String(64), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("preferred_reading", sa.Float(), nullable=True),
            sa.Column("evidence_photo_id", sa.String(64), sa.ForeignKey("meter_private_photos.id"), nullable=True),
            sa.Column("status", sa.String(32), server_default="PENDING_REVIEW", nullable=False),
            sa.Column("linked_reading_id", sa.String(64), nullable=True),
            sa.Column("linked_anomaly_case_id", sa.String(64), nullable=True),
            sa.Column("validation_snapshot_json", sa.Text(), server_default="{}", nullable=False),
            sa.Column("resolution_note", sa.Text(), nullable=True),
            sa.Column("resolved_by_id", sa.String(64), nullable=True),
            sa.Column("resolved_by_name", sa.String(128), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("demo", sa.Boolean(), server_default="1", nullable=False),
        )
        op.create_index("ix_consumer_billing_reviews_conn", "consumer_billing_reviews", ["connection_no"])
        op.create_index("ix_consumer_billing_reviews_bill", "consumer_billing_reviews", ["bill_no"])

    if "consumer_billing_review_history" not in existing_tables:
        op.create_table(
            "consumer_billing_review_history",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("review_id", sa.String(64), sa.ForeignKey("consumer_billing_reviews.id"), nullable=False),
            sa.Column("status", sa.String(32), nullable=False),
            sa.Column("actor_id", sa.String(64), nullable=False),
            sa.Column("actor_name", sa.String(128), nullable=False),
            sa.Column("actor_role", sa.String(32), nullable=False),
            sa.Column("note", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_consumer_billing_review_history_rev", "consumer_billing_review_history", ["review_id"])

    if "meter_threshold_policy_versions" not in existing_tables:
        op.create_table(
            "meter_threshold_policy_versions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("version", sa.Integer(), nullable=False, unique=True),
            sa.Column("minimum_history", sa.Integer(), server_default="2", nullable=False),
            sa.Column("high_daily_ratio", sa.Float(), server_default="2.5", nullable=False),
            sa.Column("low_daily_ratio", sa.Float(), server_default="0.35", nullable=False),
            sa.Column("high_daily_units", sa.Float(), server_default="80.0", nullable=False),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("changed_by_id", sa.String(64), nullable=False),
            sa.Column("changed_by_name", sa.String(128), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    if "financial_adjustment_proposals" not in existing_tables:
        op.create_table(
            "financial_adjustment_proposals",
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("anomaly_case_id", sa.String(64), nullable=True),
            sa.Column("billing_review_id", sa.String(64), nullable=True),
            sa.Column("bill_no", sa.String(64), nullable=False),
            sa.Column("connection_no", sa.String(32), nullable=False),
            sa.Column("consumer_no", sa.String(32), nullable=False),
            sa.Column("consumer_name", sa.String(128), nullable=False),
            sa.Column("subdivision", sa.String(64), server_default="Sabarmati Subdivision", nullable=False),
            sa.Column("original_units", sa.Float(), nullable=False),
            sa.Column("original_billed_amount", sa.Float(), nullable=False),
            sa.Column("proposed_adjusted_units", sa.Float(), nullable=False),
            sa.Column("proposed_adjustment_amount", sa.Float(), nullable=False),
            sa.Column("proposed_revised_amount", sa.Float(), nullable=False),
            sa.Column("adjustment_type", sa.String(32), nullable=False),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("calculation_basis", sa.Text(), nullable=False),
            sa.Column("status", sa.String(32), server_default="PENDING_APPROVAL", nullable=False),
            sa.Column("ledger_application_status", sa.String(32), server_default="PENDING_AUTHORIZATION", nullable=False),
            sa.Column("ledger_reference_id", sa.String(64), nullable=True),
            sa.Column("ledger_applied_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("proposed_by_id", sa.String(64), nullable=False),
            sa.Column("proposed_by_name", sa.String(128), nullable=False),
            sa.Column("proposed_by_role", sa.String(32), nullable=False),
            sa.Column("proposed_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("approved_by_id", sa.String(64), nullable=True),
            sa.Column("approved_by_name", sa.String(128), nullable=True),
            sa.Column("approved_by_role", sa.String(32), nullable=True),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("approval_note", sa.Text(), nullable=True),
            sa.Column("demo", sa.Boolean(), server_default="1", nullable=False),
        )
        op.create_index("ix_financial_adjustment_proposals_bill", "financial_adjustment_proposals", ["bill_no"])
        op.create_index("ix_financial_adjustment_proposals_status", "financial_adjustment_proposals", ["status"])

    if "financial_adjustment_history" not in existing_tables:
        op.create_table(
            "financial_adjustment_history",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("adjustment_id", sa.String(64), sa.ForeignKey("financial_adjustment_proposals.id"), nullable=False),
            sa.Column("from_status", sa.String(32), nullable=True),
            sa.Column("to_status", sa.String(32), nullable=False),
            sa.Column("ledger_application_status", sa.String(32), nullable=False),
            sa.Column("actor_id", sa.String(64), nullable=False),
            sa.Column("actor_name", sa.String(128), nullable=False),
            sa.Column("actor_role", sa.String(32), nullable=False),
            sa.Column("note", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_financial_adjustment_history_adj", "financial_adjustment_history", ["adjustment_id"])

    if "meter_notification_dedup" not in existing_tables:
        op.create_table(
            "meter_notification_dedup",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("dedupe_key", sa.String(256), nullable=False, unique=True),
            sa.Column("recipient_key", sa.String(128), nullable=False),
            sa.Column("category", sa.String(64), nullable=False),
            sa.Column("reference_id", sa.String(64), nullable=False),
            sa.Column("notification_id", sa.String(64), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_meter_notification_dedup_key", "meter_notification_dedup", ["dedupe_key"])

    if "actor_idempotency_records" not in existing_tables:
        op.create_table(
            "actor_idempotency_records",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("client_uuid", sa.String(128), nullable=False),
            sa.Column("endpoint", sa.String(128), nullable=False),
            sa.Column("actor_id", sa.String(64), nullable=False),
            sa.Column("payload_hash", sa.String(64), nullable=False),
            sa.Column("resource_type", sa.String(64), nullable=False),
            sa.Column("resource_id", sa.String(64), nullable=False),
            sa.Column("response_status", sa.Integer(), server_default="201", nullable=False),
            sa.Column("response_body_json", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index(
            "ix_actor_idempotency_uuid_endpoint",
            "actor_idempotency_records",
            ["client_uuid", "endpoint"],
            unique=True,
        )


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    for table in [
        "actor_idempotency_records",
        "meter_notification_dedup",
        "financial_adjustment_history",
        "financial_adjustment_proposals",
        "meter_threshold_policy_versions",
        "consumer_billing_review_history",
        "consumer_billing_reviews",
        "meter_anomaly_status_history",
        "meter_anomaly_cases",
        "meter_reading_review_history",
        "meter_ambiguous_digits",
        "meter_ocr_results",
        "meter_events",
        "meter_reading_submissions",
        "meter_private_photos",
        "meter_configuration_versions",
        "meter_configurations",
    ]:
        if table in existing_tables:
            op.drop_table(table)
