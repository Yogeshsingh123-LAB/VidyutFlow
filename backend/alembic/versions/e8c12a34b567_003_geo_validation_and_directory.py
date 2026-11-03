"""003_geo_validation_and_directory

Revision ID: e8c12a34b567
Revises: d7b031e42ba2
Create Date: 2026-11-03 15:35:00.000000

Adds connection request geo validation columns and UGVCL organizational directory tables:
- utilities
- circles
- divisions
- subdivisions
- section_offices
- service_areas
- substations
- office_data_sources
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite


# revision identifiers, used by Alembic.
revision: str = 'e8c12a34b567'
down_revision: Union[str, Sequence[str], None] = 'd7b031e42ba2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    # 1. Update connection_requests with geo and validation columns if missing
    if "connection_requests" in existing_tables:
        existing_cols = {c["name"] for c in insp.get_columns("connection_requests")}
        if "latitude" not in existing_cols:
            op.add_column("connection_requests", sa.Column("latitude", sa.Float(), nullable=True))
        if "longitude" not in existing_cols:
            op.add_column("connection_requests", sa.Column("longitude", sa.Float(), nullable=True))
        if "validation_issues_json" not in existing_cols:
            op.add_column("connection_requests", sa.Column("validation_issues_json", sa.Text(), nullable=True))

    # 2. Create utilities table
    if "utilities" not in existing_tables:
        op.create_table(
            "utilities",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("code", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("legal_name_gu", sa.String(), server_default="ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ", nullable=False),
            sa.Column("cin", sa.String(), server_default="U40102GJ2003SGC042906", nullable=False),
            sa.Column("headquarters", sa.String(), server_default="Visnagar Road, Mehsana - 384001, Gujarat", nullable=False),
            sa.Column("website", sa.String(), server_default="https://www.ugvcl.com", nullable=False),
            sa.Column("helpline", sa.String(), server_default="19122 / 1800 233 155335", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("code", name="uq_utility_code"),
        )
        op.create_index("ix_utilities_code", "utilities", ["code"])

    # 3. Create circles table
    if "circles" not in existing_tables:
        op.create_table(
            "circles",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("utility_id", sa.String(), sa.ForeignKey("utilities.id"), nullable=False),
            sa.Column("code", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("head_designation", sa.String(), server_default="Superintending Engineer (SE)", nullable=False),
            sa.Column("head_name", sa.String(), server_default="", nullable=False),
            sa.Column("phone", sa.String(), server_default="", nullable=False),
            sa.Column("email", sa.String(), server_default="", nullable=False),
            sa.Column("address", sa.Text(), server_default="", nullable=False),
            sa.Column("districts_covered", sa.Text(), server_default="[]", nullable=False),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("code", name="uq_circle_code"),
        )
        op.create_index("ix_circles_code", "circles", ["code"])
        op.create_index("ix_circles_utility_id", "circles", ["utility_id"])
        op.create_index("ix_circles_is_active", "circles", ["is_active"])
        op.create_index("ix_circles_utility_active", "circles", ["utility_id", "is_active"])

    # 4. Create divisions table
    if "divisions" not in existing_tables:
        op.create_table(
            "divisions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("circle_id", sa.String(), sa.ForeignKey("circles.id"), nullable=False),
            sa.Column("code", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("executive_engineer", sa.String(), server_default="", nullable=False),
            sa.Column("phone", sa.String(), server_default="", nullable=False),
            sa.Column("email", sa.String(), server_default="", nullable=False),
            sa.Column("address", sa.Text(), server_default="", nullable=False),
            sa.Column("pin_code", sa.String(), server_default="", nullable=False),
            sa.Column("talukas_covered", sa.Text(), server_default="[]", nullable=False),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("code", name="uq_division_code"),
        )
        op.create_index("ix_divisions_code", "divisions", ["code"])
        op.create_index("ix_divisions_circle_id", "divisions", ["circle_id"])
        op.create_index("ix_divisions_is_active", "divisions", ["is_active"])
        op.create_index("ix_divisions_circle_active", "divisions", ["circle_id", "is_active"])

    # 5. Create subdivisions table
    if "subdivisions" not in existing_tables:
        op.create_table(
            "subdivisions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("division_id", sa.String(), sa.ForeignKey("divisions.id"), nullable=False),
            sa.Column("circle_id", sa.String(), sa.ForeignKey("circles.id"), nullable=False),
            sa.Column("code", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("deputy_engineer", sa.String(), server_default="", nullable=False),
            sa.Column("phone", sa.String(), server_default="", nullable=False),
            sa.Column("email", sa.String(), server_default="", nullable=False),
            sa.Column("address", sa.Text(), server_default="", nullable=False),
            sa.Column("pin_code", sa.String(), server_default="", nullable=False),
            sa.Column("taluka", sa.String(), server_default="", nullable=False),
            sa.Column("is_rec", sa.Boolean(), server_default=sa.text("0"), nullable=False),
            sa.Column("working_hours", sa.String(), server_default="10:30 AM - 06:10 PM (Mon-Sat, 2nd/4th Sat Off)", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("code", name="uq_subdivision_code"),
        )
        op.create_index("ix_subdivisions_code", "subdivisions", ["code"])
        op.create_index("ix_subdivisions_division_id", "subdivisions", ["division_id"])
        op.create_index("ix_subdivisions_circle_id", "subdivisions", ["circle_id"])
        op.create_index("ix_subdivisions_is_active", "subdivisions", ["is_active"])
        op.create_index("ix_subdivisions_division_active", "subdivisions", ["division_id", "is_active"])
        op.create_index("ix_subdivisions_circle", "subdivisions", ["circle_id"])

    # 6. Create section_offices table
    if "section_offices" not in existing_tables:
        op.create_table(
            "section_offices",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("subdivision_id", sa.String(), sa.ForeignKey("subdivisions.id"), nullable=False),
            sa.Column("code", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("officer_in_charge", sa.String(), server_default="Junior Engineer / Line Inspector", nullable=False),
            sa.Column("phone", sa.String(), server_default="", nullable=False),
            sa.Column("email", sa.String(), server_default="", nullable=False),
            sa.Column("address", sa.Text(), server_default="", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("code", name="uq_section_code"),
        )
        op.create_index("ix_section_offices_code", "section_offices", ["code"])
        op.create_index("ix_section_offices_subdivision_id", "section_offices", ["subdivision_id"])
        op.create_index("ix_section_offices_is_active", "section_offices", ["is_active"])
        op.create_index("ix_sections_subdivision_active", "section_offices", ["subdivision_id", "is_active"])

    # 7. Create service_areas table
    if "service_areas" not in existing_tables:
        op.create_table(
            "service_areas",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("section_id", sa.String(), sa.ForeignKey("section_offices.id"), nullable=False),
            sa.Column("subdivision_id", sa.String(), sa.ForeignKey("subdivisions.id"), nullable=False),
            sa.Column("code", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("pin_code", sa.String(), nullable=False),
            sa.Column("villages_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("feeders_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("consumer_prefix_patterns", sa.Text(), server_default="[]", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("code", name="uq_service_area_code"),
        )
        op.create_index("ix_service_areas_code", "service_areas", ["code"])
        op.create_index("ix_service_areas_pin_code", "service_areas", ["pin_code"])
        op.create_index("ix_service_areas_section_id", "service_areas", ["section_id"])
        op.create_index("ix_service_areas_subdivision_id", "service_areas", ["subdivision_id"])
        op.create_index("ix_service_areas_is_active", "service_areas", ["is_active"])
        op.create_index("ix_service_areas_section", "service_areas", ["section_id"])
        op.create_index("ix_service_areas_subdivision", "service_areas", ["subdivision_id"])
        op.create_index("ix_service_areas_pin", "service_areas", ["pin_code"])

    # 8. Create substations table
    if "substations" not in existing_tables:
        op.create_table(
            "substations",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("section_id", sa.String(), sa.ForeignKey("section_offices.id"), nullable=False),
            sa.Column("code", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("voltage_kv", sa.String(), server_default="66/11 kV", nullable=False),
            sa.Column("capacity_mva", sa.Float(), server_default="15.0", nullable=False),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("operational_status", sa.String(), server_default="OPERATIONAL", nullable=False),
            sa.Column("feeders_count", sa.Integer(), server_default="6", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("code", name="uq_substation_code"),
        )
        op.create_index("ix_substations_code", "substations", ["code"])
        op.create_index("ix_substations_section_id", "substations", ["section_id"])
        op.create_index("ix_substations_section", "substations", ["section_id"])

    # 9. Create office_data_sources table
    if "office_data_sources" not in existing_tables:
        op.create_table(
            "office_data_sources",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("office_type", sa.String(), nullable=False),
            sa.Column("office_id", sa.String(), nullable=False),
            sa.Column("source_title", sa.String(), nullable=False),
            sa.Column("source_url", sa.String(), server_default="", nullable=False),
            sa.Column("source_type", sa.String(), server_default="RTI Proactive Disclosure", nullable=False),
            sa.Column("publication_date", sa.String(), server_default="2025-05-01", nullable=False),
            sa.Column("verified_date", sa.String(), server_default="2026-11-03", nullable=False),
            sa.Column("verification_status", sa.String(), server_default="VERIFIED", nullable=False),
            sa.Column("discrepancy_notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_office_data_sources_office_type", "office_data_sources", ["office_type"])
        op.create_index("ix_office_data_sources_office_id", "office_data_sources", ["office_id"])
        op.create_index("ix_office_data_sources_verification_status", "office_data_sources", ["verification_status"])
        op.create_index("ix_data_sources_office", "office_data_sources", ["office_type", "office_id"])


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    tables_to_drop = [
        "office_data_sources",
        "substations",
        "service_areas",
        "section_offices",
        "subdivisions",
        "divisions",
        "circles",
        "utilities",
    ]
    for table_name in tables_to_drop:
        if table_name in existing_tables:
            op.drop_table(table_name)

