"""005_phase9_billing_surcharge_system

Revision ID: a7b8c9d0e1f2
Revises: f9a8b7c6d5e4
Create Date: 2026-11-05 10:00:00.000000

Adds authoritative Phase 9 billing, payment transactions, formal notices, and DPS policy tables:
- electricity_bills
- payment_transactions
- formal_notices
- late_charge_policies
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f9d23b45c678'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    # 1. electricity_bills
    if "electricity_bills" not in existing_tables:
        op.create_table(
            "electricity_bills",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("bill_no", sa.String(), nullable=False, unique=True),
            sa.Column("consumer_no", sa.String(), nullable=False),
            sa.Column("bill_month", sa.String(), nullable=False),
            sa.Column("bill_date", sa.String(), nullable=False),
            sa.Column("due_date", sa.String(), nullable=False),
            sa.Column("billing_cycle_type", sa.String(), server_default="MONTHLY", nullable=False),
            sa.Column("period_start_date", sa.String(), nullable=False),
            sa.Column("period_end_date", sa.String(), nullable=False),
            sa.Column("previous_reading_date", sa.String(), nullable=True),
            sa.Column("current_reading_date", sa.String(), nullable=True),
            sa.Column("previous_reading_kwh", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("current_reading_kwh", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("reading_provenance", sa.String(), server_default="AMR_SMART_METER", nullable=False),
            sa.Column("units_consumed", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("energy_charges", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("fixed_charges", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("fuel_price_adjustment", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("electricity_duty", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("rebate_or_subsidy", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("total_amount", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("status", sa.String(), server_default="Unpaid", nullable=False),
            sa.Column("slab_breakdown_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_electricity_bills_consumer_due", "electricity_bills", ["consumer_no", "due_date"])
        op.create_index("ix_electricity_bills_status", "electricity_bills", ["status"])

    # 2. payment_transactions
    if "payment_transactions" not in existing_tables:
        op.create_table(
            "payment_transactions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("transaction_id", sa.String(), nullable=False, unique=True),
            sa.Column("bill_no", sa.String(), nullable=False),
            sa.Column("consumer_no", sa.String(), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("payment_date", sa.String(), nullable=False),
            sa.Column("payment_method", sa.String(), server_default="UPI", nullable=False),
            sa.Column("status", sa.String(), server_default="Successful", nullable=False),
            sa.Column("principal_settled", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("late_charges_settled", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("reference_id", sa.String(), nullable=True),
            sa.Column("settlement_breakdown_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_payment_transactions_bill_status", "payment_transactions", ["bill_no", "status"])
        op.create_index("ix_payment_transactions_consumer", "payment_transactions", ["consumer_no"])

    # 3. formal_notices
    if "formal_notices" not in existing_tables:
        op.create_table(
            "formal_notices",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("bill_no", sa.String(), nullable=False),
            sa.Column("consumer_no", sa.String(), nullable=False),
            sa.Column("status", sa.String(), server_default="SERVED", nullable=False),
            sa.Column("issue_date", sa.String(), nullable=False),
            sa.Column("service_date", sa.String(), nullable=False),
            sa.Column("payment_deadline", sa.String(), nullable=False),
            sa.Column("disconnection_review_status", sa.String(), server_default="PENDING_REVIEW", nullable=False),
            sa.Column("snapshot_at_issuance_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_formal_notices_consumer_status", "formal_notices", ["consumer_no", "status"])

    # 4. late_charge_policies
    if "late_charge_policies" not in existing_tables:
        op.create_table(
            "late_charge_policies",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("version", sa.String(), server_default="2026.1-DEMO", nullable=False),
            sa.Column("effective_from", sa.String(), server_default="2026-01-01", nullable=False),
            sa.Column("is_demo_simulation", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("tariff_authority", sa.String(), nullable=False),
            sa.Column("calculation_method", sa.String(), server_default="DAILY_SIMPLE", nullable=False),
            sa.Column("annual_rate_percent", sa.Float(), server_default="15.0", nullable=False),
            sa.Column("grace_period_days", sa.Integer(), server_default="0", nullable=False),
            sa.Column("days_in_year_basis", sa.Integer(), server_default="365", nullable=False),
            sa.Column("minimum_charge_inr", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("rounding_method", sa.String(), server_default="ROUND_HALF_UP_2DEC", nullable=False),
            sa.Column("category_overrides_json", sa.Text(), nullable=True),
            sa.Column("statutory_reference", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        )


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    if "late_charge_policies" in existing_tables:
        op.drop_table("late_charge_policies")
    if "formal_notices" in existing_tables:
        op.drop_table("formal_notices")
    if "payment_transactions" in existing_tables:
        op.drop_table("payment_transactions")
    if "electricity_bills" in existing_tables:
        op.drop_table("electricity_bills")

