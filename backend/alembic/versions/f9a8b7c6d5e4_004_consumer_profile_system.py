"""004_consumer_profile_system

Revision ID: f9a8b7c6d5e4
Revises: e8c12a34b567
Create Date: 2026-11-04 08:50:00.000000

Adds citizen unified consumer account, addresses, preferences, connections and audit tables:
- consumer_profiles
- user_contacts
- consumer_addresses
- consumer_preferences
- consumer_connections
- consumer_connection_otps
- consumer_audit_logs
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f9a8b7c6d5e4'
down_revision: Union[str, Sequence[str], None] = 'e8c12a34b567'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    # 1. consumer_profiles
    if "consumer_profiles" not in existing_tables:
        op.create_table(
            "consumer_profiles",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("full_name", sa.String(), nullable=False),
            sa.Column("date_of_birth", sa.String(), nullable=True),
            sa.Column("profile_photo_url", sa.String(), nullable=True),
            sa.Column("profile_completion_percentage", sa.Integer(), nullable=False, server_default="40"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_consumer_profiles_user", "consumer_profiles", ["user_id"], unique=True)

    # 2. user_contacts
    if "user_contacts" not in existing_tables:
        op.create_table(
            "user_contacts",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("mobile_number", sa.String(), nullable=True),
            sa.Column("mobile_verified", sa.Boolean(), server_default=sa.text("0"), nullable=False),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("email_verified", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("mobile_otp_hash", sa.String(), nullable=True),
            sa.Column("mobile_otp_expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("mobile_otp_attempts", sa.Integer(), server_default="0", nullable=False),
            sa.Column("email_otp_hash", sa.String(), nullable=True),
            sa.Column("email_otp_expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("email_otp_attempts", sa.Integer(), server_default="0", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_user_contacts_user", "user_contacts", ["user_id"], unique=True)
        op.create_index("ix_user_contacts_mobile", "user_contacts", ["mobile_number"])
        op.create_index("ix_user_contacts_email", "user_contacts", ["email"])

    # 3. consumer_addresses
    if "consumer_addresses" not in existing_tables:
        op.create_table(
            "consumer_addresses",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("address_type", sa.String(), server_default="RESIDENTIAL", nullable=False),
            sa.Column("is_primary", sa.Boolean(), server_default=sa.text("0"), nullable=False),
            sa.Column("house_flat_no", sa.String(), nullable=False),
            sa.Column("street", sa.String(), nullable=False),
            sa.Column("area", sa.String(), nullable=False),
            sa.Column("city_village", sa.String(), nullable=False),
            sa.Column("taluka", sa.String(), nullable=False),
            sa.Column("district", sa.String(), nullable=False),
            sa.Column("state", sa.String(), server_default="Gujarat", nullable=False),
            sa.Column("pin_code", sa.String(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_consumer_addresses_user", "consumer_addresses", ["user_id"])
        op.create_index("ix_consumer_addresses_pincode", "consumer_addresses", ["pin_code"])

    # 4. consumer_preferences
    if "consumer_preferences" not in existing_tables:
        op.create_table(
            "consumer_preferences",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("preferred_language", sa.String(), server_default="en", nullable=False),
            sa.Column("sms_notifications", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("email_notifications", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("bill_reminders", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("outage_alerts", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("application_status_alerts", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_consumer_preferences_user", "consumer_preferences", ["user_id"], unique=True)

    # 5. consumer_connections
    if "consumer_connections" not in existing_tables:
        op.create_table(
            "consumer_connections",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("consumer_no", sa.String(), nullable=False),
            sa.Column("discom", sa.String(), server_default="UGVCL", nullable=False),
            sa.Column("connection_type", sa.String(), server_default="RGP", nullable=False),
            sa.Column("sanctioned_load_kw", sa.Float(), server_default="4.0", nullable=False),
            sa.Column("official_address", sa.Text(), nullable=False),
            sa.Column("subdivision", sa.String(), nullable=False),
            sa.Column("feeder_name", sa.String(), nullable=True),
            sa.Column("status", sa.String(), server_default="ACTIVE", nullable=False),
            sa.Column("is_primary", sa.Boolean(), server_default=sa.text("0"), nullable=False),
            sa.Column("linked_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("source", sa.String(), server_default="SELF_LINKED", nullable=False),
            sa.Column("application_id", sa.String(), nullable=True),
        )
        op.create_index("ix_consumer_connections_user", "consumer_connections", ["user_id"])
        op.create_index("ix_consumer_connections_no", "consumer_connections", ["consumer_no"])
        op.create_index("ix_consumer_connections_user_no", "consumer_connections", ["user_id", "consumer_no"], unique=True)

    # 6. consumer_connection_otps
    if "consumer_connection_otps" not in existing_tables:
        op.create_table(
            "consumer_connection_otps",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("consumer_no", sa.String(), nullable=False),
            sa.Column("masked_mobile", sa.String(), nullable=False),
            sa.Column("otp_hash", sa.String(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
            sa.Column("is_verified", sa.Boolean(), server_default=sa.text("0"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_connection_otps_user_no", "consumer_connection_otps", ["user_id", "consumer_no"])

    # 7. consumer_audit_logs
    if "consumer_audit_logs" not in existing_tables:
        op.create_table(
            "consumer_audit_logs",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("event_type", sa.String(), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("ip_address", sa.String(), server_default="", nullable=False),
            sa.Column("user_agent", sa.String(), server_default="", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_consumer_audit_user_created", "consumer_audit_logs", ["user_id", "created_at"])
        op.create_index("ix_consumer_audit_event", "consumer_audit_logs", ["event_type"])


def downgrade() -> None:
    op.drop_table("consumer_audit_logs")
    op.drop_table("consumer_connection_otps")
    op.drop_table("consumer_connections")
    op.drop_table("consumer_preferences")
    op.drop_table("consumer_addresses")
    op.drop_table("user_contacts")
    op.drop_table("consumer_profiles")

