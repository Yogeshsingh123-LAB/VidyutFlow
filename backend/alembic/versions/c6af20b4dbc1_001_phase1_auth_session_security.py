"""001_phase1_auth_session_security

Revision ID: c6af20b4dbc1
Revises: 
Create Date: 2026-11-02 14:07:30.973682

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c6af20b4dbc1'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema with additive auth and session security tables and columns."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    # 1. Additive MFA columns on users
    if "users" in existing_tables:
        existing_cols = {c["name"] for c in insp.get_columns("users")}
        if "mfa_enabled" not in existing_cols:
            op.add_column("users", sa.Column("mfa_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False))
        if "mfa_secret_encrypted" not in existing_cols:
            op.add_column("users", sa.Column("mfa_secret_encrypted", sa.String(), nullable=True))
        if "mfa_recovery_hashes_json" not in existing_cols:
            op.add_column("users", sa.Column("mfa_recovery_hashes_json", sa.Text(), nullable=True))

    # 2. Additive user_sessions table
    if "user_sessions" not in existing_tables:
        op.create_table(
            "user_sessions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("jti", sa.String(), nullable=False),
            sa.Column("refresh_token_hash", sa.String(), nullable=False, unique=True),
            sa.Column("token_family", sa.String(), nullable=False),
            sa.Column("is_revoked", sa.Boolean(), server_default=sa.text("false"), nullable=False),
            sa.Column("revoked_reason", sa.String(), nullable=True),
            sa.Column("ip_address", sa.String(), server_default="", nullable=False),
            sa.Column("user_agent", sa.String(), server_default="", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_user_sessions_user_active", "user_sessions", ["user_id", "is_revoked", "expires_at"])
        op.create_index("ix_user_sessions_refresh_hash", "user_sessions", ["refresh_token_hash"])
        op.create_index("ix_user_sessions_family", "user_sessions", ["token_family"])
        op.create_index("ix_user_sessions_jti", "user_sessions", ["jti"])

    # 3. Additive password_reset_tokens table
    if "password_reset_tokens" not in existing_tables:
        op.create_table(
            "password_reset_tokens",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("token_hash", sa.String(), nullable=False, unique=True),
            sa.Column("is_used", sa.Boolean(), server_default=sa.text("false"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_password_reset_user_used", "password_reset_tokens", ["user_id", "is_used", "expires_at"])
        op.create_index("ix_password_reset_token_hash", "password_reset_tokens", ["token_hash"])


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    if "password_reset_tokens" in existing_tables:
        op.drop_table("password_reset_tokens")
    if "user_sessions" in existing_tables:
        op.drop_table("user_sessions")
    if "users" in existing_tables:
        existing_cols = {c["name"] for c in insp.get_columns("users")}
        if "mfa_recovery_hashes_json" in existing_cols:
            op.drop_column("users", "mfa_recovery_hashes_json")
        if "mfa_secret_encrypted" in existing_cols:
            op.drop_column("users", "mfa_secret_encrypted")
        if "mfa_enabled" in existing_cols:
            op.drop_column("users", "mfa_enabled")
