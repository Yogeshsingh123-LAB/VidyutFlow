"""002_phase13_work_order_evidence

Revision ID: d7b031e42ba2
Revises: c6af20b4dbc1
Create Date: 2026-11-02 23:36:00.000000

Additive table for Phase 13 field completion evidence and verification audit.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7b031e42ba2'
down_revision: Union[str, Sequence[str], None] = 'c6af20b4dbc1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema with additive work_order_evidence table and performance indexes."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    if "work_order_evidence" not in existing_tables:
        op.create_table(
            "work_order_evidence",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("client_uuid", sa.String(), nullable=False, unique=True),
            sa.Column("work_order_id", sa.String(), nullable=False),
            sa.Column("complaint_id", sa.String(), nullable=True),
            sa.Column("evidence_type", sa.String(), nullable=False),
            sa.Column("storage_ref", sa.String(), nullable=False),
            sa.Column("file_size_bytes", sa.Integer(), server_default="0", nullable=False),
            sa.Column("mime_type", sa.String(), server_default="image/jpeg", nullable=False),
            sa.Column("sha256_hash", sa.String(), nullable=True),
            sa.Column("submitted_by", sa.String(), nullable=False),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("metadata_json", sa.Text(), nullable=True),
            sa.Column("verification_status", sa.String(), server_default="pending_verification", nullable=False),
            sa.Column("reviewed_by", sa.String(), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("review_remarks", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_work_order_evidence_client_uuid", "work_order_evidence", ["client_uuid"])
        op.create_index("ix_work_order_evidence_wo_type", "work_order_evidence", ["work_order_id", "evidence_type"])
        op.create_index("ix_work_order_evidence_status", "work_order_evidence", ["verification_status"])
        op.create_index("ix_work_order_evidence_submitted_by", "work_order_evidence", ["submitted_by"])


def downgrade() -> None:
    """Downgrade schema: drop work_order_evidence table."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())
    if "work_order_evidence" in existing_tables:
        op.drop_table("work_order_evidence")
