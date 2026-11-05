import uuid, enum
from datetime import date, datetime, timezone
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Date, ForeignKey, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

def uid(): return str(uuid.uuid4())
def now(): return datetime.now(timezone.utc)

class Role(str, enum.Enum):
    consumer = "consumer"; officer = "officer"; engineer = "engineer"; admin = "admin"

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_role_zone_active", "role", "zone", "is_active"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, index=True)  # consumer|officer|engineer|admin
    zone: Mapped[str] = mapped_column(String, default="North")
    hashed_password: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_secret_encrypted: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    mfa_recovery_hashes_json: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class UserSession(Base):
    """Server-side active sessions with hashed refresh tokens and rotation family tracking."""
    __tablename__ = "user_sessions"
    __table_args__ = (
        Index("ix_user_sessions_user_active", "user_id", "is_revoked", "expires_at"),
        Index("ix_user_sessions_refresh_hash", "refresh_token_hash"),
        Index("ix_user_sessions_family", "token_family"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    jti: Mapped[str] = mapped_column(String, index=True)  # bound access token ID
    refresh_token_hash: Mapped[str] = mapped_column(String, unique=True, index=True)  # sha256
    token_family: Mapped[str] = mapped_column(String, index=True)  # uuid for rotation lineage
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    revoked_reason: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    ip_address: Mapped[str] = mapped_column(String, default="")
    user_agent: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    user = relationship("User")


class PasswordResetToken(Base):
    """Cryptographic single-use password reset token with 15-minute validity."""
    __tablename__ = "password_reset_tokens"
    __table_args__ = (
        Index("ix_password_reset_user_used", "user_id", "is_used", "expires_at"),
        Index("ix_password_reset_token_hash", "token_hash"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String, unique=True, index=True)  # sha256
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    user = relationship("User")


class ConnectionRequest(Base):
    __tablename__ = "connection_requests"
    __table_args__ = (
        Index("ix_requests_zone_status_created", "zone", "status", "created_at"),
        Index("ix_requests_assigned_engineer_status", "assigned_engineer_id", "status"),
        Index("ix_requests_consumer_created", "consumer_id", "created_at"),
        Index("ix_requests_sla_risk", "sla_breach_risk"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    consumer_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    applicant_name: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String)
    address: Mapped[str] = mapped_column(Text)
    zone: Mapped[str] = mapped_column(String, default="North", index=True)
    pin_code: Mapped[str] = mapped_column(String, default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    request_type: Mapped[str] = mapped_column(String, default="new_connection")
    description: Mapped[str] = mapped_column(Text, default="")
    requested_load_kw: Mapped[float] = mapped_column(Float, default=1.0)
    tariff_category: Mapped[str] = mapped_column(String, default="Residential (RGPU)")
    phase: Mapped[str] = mapped_column(String, default="1-Phase")
    premises_type: Mapped[str] = mapped_column(String, default="Owned")
    document_name: Mapped[str] = mapped_column(String, default="")
    meter_serial: Mapped[str] = mapped_column(String, default="")  # set by field sync; shown on My Connections
    # ML outputs (synthetic-trained models — see docs/ML_REPORT.md)
    category: Mapped[str] = mapped_column(String, default="NEW_CONNECTION")
    severity: Mapped[str] = mapped_column(String, default="LOW")
    priority: Mapped[str] = mapped_column(String, default="NORMAL")
    sla_breach_risk: Mapped[float] = mapped_column(Float, default=0.0)
    sla_risk_reasons: Mapped[str] = mapped_column(Text, default="[]")  # JSON list
    # Workflow
    status: Mapped[str] = mapped_column(String, default="SUBMITTED", index=True)
    assigned_officer_id: Mapped[str] = mapped_column(String, default="")
    assigned_engineer_id: Mapped[str] = mapped_column(String, default="")
    validation_notes: Mapped[str] = mapped_column(Text, default="")
    # Immutable snapshot from submission. NULL means the row predates this feature.
    validation_issues_json: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    sla_due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    consumer = relationship("User")

class FieldUpdate(Base):
    """One offline field submission. client_uuid is the de-duplication key."""
    __tablename__ = "field_updates"
    __table_args__ = (UniqueConstraint("client_uuid", name="uq_field_client_uuid"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    client_uuid: Mapped[str] = mapped_column(String, index=True)  # generated on device (UUIDv4)
    request_id: Mapped[str] = mapped_column(ForeignKey("connection_requests.id"), index=True)
    engineer_id: Mapped[str] = mapped_column(String, index=True)
    task_status: Mapped[str] = mapped_column(String)  # FIELD_VERIFIED | COMPLETED | BLOCKED
    notes: Mapped[str] = mapped_column(Text, default="")
    meter_serial: Mapped[str] = mapped_column(String, default="")
    created_offline_at: Mapped[str] = mapped_column(String, default="")
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class AuditLog(Base):
    """Append-only activity record. Tamper-evidence: each row's entry_hash commits to the
    previous row's hash (hash chain) — see audit.py / GET /requests/audit/verify."""
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_entity_created", "entity", "entity_id", "created_at"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    actor_id: Mapped[str] = mapped_column(String, default="system")
    actor_role: Mapped[str] = mapped_column(String, default="system")
    action: Mapped[str] = mapped_column(String, index=True)
    entity: Mapped[str] = mapped_column(String, default="")
    entity_id: Mapped[str] = mapped_column(String, default="")
    detail: Mapped[str] = mapped_column(Text, default="")
    chain_seq: Mapped[int | None] = mapped_column(Integer, unique=True, nullable=True, default=None)
    prev_hash: Mapped[str] = mapped_column(String, default="")   # entry_hash of previous row
    entry_hash: Mapped[str] = mapped_column(String, default="")  # sha256 over this row + prev_hash
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuditChainHead(Base):
    """Single-row lock anchor (`id == 1`) preventing concurrent audit hash-chain forks."""
    __tablename__ = "audit_chain_head"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    last_seq: Mapped[int] = mapped_column(Integer, default=0)
    last_hash: Mapped[str] = mapped_column(String, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

class Notification(Base):
    """Role-scoped alert-centre row (server-side, per user). Fed by workflow events."""
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_read_created", "user_id", "read", "created_at"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String, default="info")  # info|warning|success|alert
    request_id: Mapped[str] = mapped_column(String, default="")  # no FK: may reference any entity
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class ErpSyncLog(Base):
    """Outbound ERP adapter log & failed-sync dead-letter queue (simulated webhook adapter)."""
    __tablename__ = "erp_sync_logs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    request_id: Mapped[str] = mapped_column(ForeignKey("connection_requests.id"), index=True)
    event_type: Mapped[str] = mapped_column(String, default="SANCTION_APPROVED")
    status: Mapped[str] = mapped_column(String, default="SYNCED", index=True)  # SYNCED | FAILED
    attempt_count: Mapped[int] = mapped_column(Integer, default=1)
    erp_reference_id: Mapped[str] = mapped_column(String, default="")
    mapped_payload_json: Mapped[str] = mapped_column(Text, default="{}")
    error_message: Mapped[str] = mapped_column(Text, default="")
    last_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class AlertDispatch(Base):
    """Multi-channel operational alert log (IN_APP + SIMULATED_SMS + SIMULATED_EMAIL).
    Unique (dedup_key, channel) guarantees repeated sweeps are idempotent."""
    __tablename__ = "alert_dispatches"
    __table_args__ = (UniqueConstraint("dedup_key", "channel", name="uq_alert_dedup_channel"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    rule_code: Mapped[str] = mapped_column(String, index=True)  # SLA_BREACH_RISK | UNASSIGNED_STALE | REPEATED_ZONE_FAILURES
    severity: Mapped[str] = mapped_column(String, default="warning")  # warning | critical
    zone: Mapped[str] = mapped_column(String, default="North", index=True)
    request_id: Mapped[str] = mapped_column(String, default="", index=True)
    dedup_key: Mapped[str] = mapped_column(String, index=True)
    channel: Mapped[str] = mapped_column(String, index=True)  # IN_APP | SIMULATED_SMS | SIMULATED_EMAIL
    recipient: Mapped[str] = mapped_column(String, default="")
    subject: Mapped[str] = mapped_column(String, default="")
    body: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="SIMULATED_SENT")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class WorkflowTemplate(Base):
    """Admin-configurable service workflow template driving validation, SLA, and field dispatch."""
    __tablename__ = "workflow_templates"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    template_code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, default="")
    default_category: Mapped[str] = mapped_column(String, default="NEW_CONNECTION")
    default_severity: Mapped[str] = mapped_column(String, default="MEDIUM")
    sla_hours: Mapped[int] = mapped_column(Integer, default=72)
    require_document: Mapped[bool] = mapped_column(Boolean, default=True)
    require_field_visit: Mapped[bool] = mapped_column(Boolean, default=True)
    max_auto_load_kw: Mapped[float] = mapped_column(Float, default=100.0)
    steps_json: Mapped[str] = mapped_column(Text, default="[]")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SubdivisionZone(Base):
    """Canonical & admin-managed subdivision zones (Items #1 & #30).
    Requests must match an active zone so submissions never vanish into unrouted free text."""
    __tablename__ = "subdivision_zones"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)  # e.g. North, South, Central
    display_name: Mapped[str] = mapped_column(String)
    circle_name: Mapped[str] = mapped_column(String, default="Mehsana Circle")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SavedPremise(Base):
    """Reusable consumer profile & saved premises (Item #29 — Enter Once, Reuse Across Requests)."""
    __tablename__ = "saved_premises"
    __table_args__ = (
        Index("ix_saved_premises_user_created", "user_id", "created_at"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    label: Mapped[str] = mapped_column(String, default="Primary Residence")
    applicant_name: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String)
    address: Mapped[str] = mapped_column(Text)
    zone: Mapped[str] = mapped_column(String, default="North")
    pin_code: Mapped[str] = mapped_column(String, default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    tariff_category: Mapped[str] = mapped_column(String, default="Residential (RGPU)")
    phase: Mapped[str] = mapped_column(String, default="1-Phase")
    premises_type: Mapped[str] = mapped_column(String, default="Owned")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class WorkOrderEvidence(Base):
    """Field completion evidence items (photos, documents, checklists) with cryptographic client UUID and verification state.
    Phase 13 additive model for field engineer completion verification.
    """
    __tablename__ = "work_order_evidence"
    __table_args__ = (
        UniqueConstraint("client_uuid", name="uq_work_order_evidence_client_uuid"),
        Index("ix_work_order_evidence_wo_type", "work_order_id", "evidence_type"),
        Index("ix_work_order_evidence_status", "verification_status"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    client_uuid: Mapped[str] = mapped_column(String, unique=True, index=True)
    work_order_id: Mapped[str] = mapped_column(String, index=True)
    complaint_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True, default=None)
    evidence_type: Mapped[str] = mapped_column(String)  # photo_before | photo_after | checklist | technical_report | safety_exemption
    storage_ref: Mapped[str] = mapped_column(String)  # IndexedDB key or S3/Blob URI
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String, default="image/jpeg")
    sha256_hash: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    submitted_by: Mapped[str] = mapped_column(String, index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    verification_status: Mapped[str] = mapped_column(String, default="pending_verification", index=True)  # pending_verification | approved | rejected | more_info_needed
    reviewed_by: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    review_remarks: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)




class UtilityCompany(Base):
    """Top-level distribution utility entity (e.g. UGVCL, DGVCL, MGVCL, PGVCL)."""
    __tablename__ = "utilities"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    legal_name_gu: Mapped[str] = mapped_column(String, default="ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ")
    cin: Mapped[str] = mapped_column(String, default="U40102GJ2003SGC042906")
    headquarters: Mapped[str] = mapped_column(String, default="Visnagar Road, Mehsana - 384001, Gujarat")
    website: Mapped[str] = mapped_column(String, default="https://www.ugvcl.com")
    helpline: Mapped[str] = mapped_column(String, default="19122 / 1800 233 155335")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class CircleOffice(Base):
    """Regional Circle Office (e.g. Mehsana Circle, Sabarmati Circle, Himatnagar Circle, Palanpur Circle)."""
    __tablename__ = "circles"
    __table_args__ = (
        UniqueConstraint("code", name="uq_circle_code"),
        Index("ix_circles_utility_active", "utility_id", "is_active"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    utility_id: Mapped[str] = mapped_column(ForeignKey("utilities.id"), index=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    head_designation: Mapped[str] = mapped_column(String, default="Superintending Engineer (SE)")
    head_name: Mapped[str] = mapped_column(String, default="")
    phone: Mapped[str] = mapped_column(String, default="")
    email: Mapped[str] = mapped_column(String, default="")
    address: Mapped[str] = mapped_column(Text, default="")
    districts_covered: Mapped[str] = mapped_column(Text, default="[]")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class DivisionOffice(Base):
    """Operational Division Office under a Circle (22 divisions in UGVCL)."""
    __tablename__ = "divisions"
    __table_args__ = (
        UniqueConstraint("code", name="uq_division_code"),
        Index("ix_divisions_circle_active", "circle_id", "is_active"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    circle_id: Mapped[str] = mapped_column(ForeignKey("circles.id"), index=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    executive_engineer: Mapped[str] = mapped_column(String, default="")
    phone: Mapped[str] = mapped_column(String, default="")
    email: Mapped[str] = mapped_column(String, default="")
    address: Mapped[str] = mapped_column(Text, default="")
    pin_code: Mapped[str] = mapped_column(String, default="")
    talukas_covered: Mapped[str] = mapped_column(Text, default="[]")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SubdivisionOffice(Base):
    """Customer-facing Sub-Division Office (148 regular + 3 REC subdivisions in UGVCL)."""
    __tablename__ = "subdivisions"
    __table_args__ = (
        UniqueConstraint("code", name="uq_subdivision_code"),
        Index("ix_subdivisions_division_active", "division_id", "is_active"),
        Index("ix_subdivisions_circle", "circle_id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    division_id: Mapped[str] = mapped_column(ForeignKey("divisions.id"), index=True)
    circle_id: Mapped[str] = mapped_column(ForeignKey("circles.id"), index=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    deputy_engineer: Mapped[str] = mapped_column(String, default="")
    phone: Mapped[str] = mapped_column(String, default="")
    email: Mapped[str] = mapped_column(String, default="")
    address: Mapped[str] = mapped_column(Text, default="")
    pin_code: Mapped[str] = mapped_column(String, default="")
    taluka: Mapped[str] = mapped_column(String, default="")
    is_rec: Mapped[bool] = mapped_column(Boolean, default=False)
    working_hours: Mapped[str] = mapped_column(String, default="10:30 AM - 06:10 PM (Mon-Sat, 2nd/4th Sat Off)")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SectionOffice(Base):
    """Last-mile Section Office managing localized distribution and O&M crews."""
    __tablename__ = "section_offices"
    __table_args__ = (
        UniqueConstraint("code", name="uq_section_code"),
        Index("ix_sections_subdivision_active", "subdivision_id", "is_active"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    subdivision_id: Mapped[str] = mapped_column(ForeignKey("subdivisions.id"), index=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    officer_in_charge: Mapped[str] = mapped_column(String, default="Junior Engineer / Line Inspector")
    phone: Mapped[str] = mapped_column(String, default="")
    email: Mapped[str] = mapped_column(String, default="")
    address: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ServiceArea(Base):
    """Consumer Service Area mapping villages, towns, and PIN codes to responsible Section."""
    __tablename__ = "service_areas"
    __table_args__ = (
        UniqueConstraint("code", name="uq_service_area_code"),
        Index("ix_service_areas_section", "section_id"),
        Index("ix_service_areas_subdivision", "subdivision_id"),
        Index("ix_service_areas_pin", "pin_code"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    section_id: Mapped[str] = mapped_column(ForeignKey("section_offices.id"), index=True)
    subdivision_id: Mapped[str] = mapped_column(ForeignKey("subdivisions.id"), index=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    pin_code: Mapped[str] = mapped_column(String, index=True)
    villages_json: Mapped[str] = mapped_column(Text, default="[]")
    feeders_json: Mapped[str] = mapped_column(Text, default="[]")
    consumer_prefix_patterns: Mapped[str] = mapped_column(Text, default="[]")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Substation(Base):
    """Grid Substation (66kV / 132kV / 11kV) supplying power to service areas and feeders."""
    __tablename__ = "substations"
    __table_args__ = (
        UniqueConstraint("code", name="uq_substation_code"),
        Index("ix_substations_section", "section_id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    section_id: Mapped[str] = mapped_column(ForeignKey("section_offices.id"), index=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    voltage_kv: Mapped[str] = mapped_column(String, default="66/11 kV")
    capacity_mva: Mapped[float] = mapped_column(Float, default=15.0)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    operational_status: Mapped[str] = mapped_column(String, default="OPERATIONAL")
    feeders_count: Mapped[int] = mapped_column(Integer, default=6)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class OfficeDataSource(Base):
    """Provenance and audit tracking for verified official publication records."""
    __tablename__ = "office_data_sources"
    __table_args__ = (
        Index("ix_data_sources_office", "office_type", "office_id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    office_type: Mapped[str] = mapped_column(String, index=True)
    office_id: Mapped[str] = mapped_column(String, index=True)
    source_title: Mapped[str] = mapped_column(String)
    source_url: Mapped[str] = mapped_column(String, default="")
    source_type: Mapped[str] = mapped_column(String, default="RTI Proactive Disclosure")
    publication_date: Mapped[str] = mapped_column(String, default="2025-05-01")
    verified_date: Mapped[str] = mapped_column(String, default="2026-11-03")
    verification_status: Mapped[str] = mapped_column(String, default="VERIFIED", index=True)
    discrepancy_notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


# ============================================================================
# Phase 12 — Transformer Asset, Sensor Telemetry & Predictive Maintenance Models
# ============================================================================


class TransformerAsset(Base):
    __tablename__ = "transformers_asset"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    utility_asset_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    feeder_id: Mapped[str] = mapped_column(String(64), index=True)
    substation_id: Mapped[str] = mapped_column(String(64), index=True)
    zone: Mapped[str] = mapped_column(String(32), index=True)  # matches SubdivisionZone.name / User.zone
    rated_kva: Mapped[float] = mapped_column(Float)
    phases: Mapped[int] = mapped_column(Integer)
    voltage_class: Mapped[str] = mapped_column(String(16))
    commissioning_date: Mapped[date | None] = mapped_column(Date, nullable=True, default=None)
    manufacturer: Mapped[str | None] = mapped_column(String(128), nullable=True, default=None)
    serial_number: Mapped[str | None] = mapped_column(String(64), nullable=True, default=None)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    coordinate_source: Mapped[str | None] = mapped_column(String(32), nullable=True, default=None)
    coordinate_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(16), default="IN_SERVICE")  # IN_SERVICE|MAINTENANCE|FAULT|RETIRED
    metadata_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class TransformerSensor(Base):
    __tablename__ = "transformer_sensors"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    transformer_id: Mapped[str] = mapped_column(String(36), ForeignKey("transformers_asset.id"), index=True)
    sensor_type: Mapped[str] = mapped_column(String(24))
    unit: Mapped[str] = mapped_column(String(16))
    channel_phase: Mapped[str] = mapped_column(String(8))
    calibration_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    source_system: Mapped[str] = mapped_column(String(24))  # SCADA|AMI|IOT|SIMULATED_DEMO
    quality_state: Mapped[str] = mapped_column(String(16))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class TelemetryReading(Base):
    __tablename__ = "telemetry_readings"
    # TimescaleDB optional; composite index used as fallback.
    __table_args__ = (
        Index("ix_telemetry_transformer_measured", "transformer_id", "measured_at"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    transformer_id: Mapped[str] = mapped_column(String(36), ForeignKey("transformers_asset.id"))
    sensor_id: Mapped[str] = mapped_column(String(36), ForeignKey("transformer_sensors.id"), index=True)
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(16))
    quality: Mapped[str] = mapped_column(String(8))
    source: Mapped[str] = mapped_column(String(24))
    ingestion_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    raw_payload_ref: Mapped[str | None] = mapped_column(String(128), nullable=True, default=None)


class TransformerAlert(Base):
    __tablename__ = "transformer_alerts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    transformer_id: Mapped[str] = mapped_column(String(36), ForeignKey("transformers_asset.id"), index=True)
    alert_type: Mapped[str] = mapped_column(String(32))
    severity: Mapped[str] = mapped_column(String(8))
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(24))
    threshold_version: Mapped[str] = mapped_column(String(32))
    evidence_refs: Mapped[str] = mapped_column(Text)  # JSON string
    dedupe_key: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    acknowledged_by: Mapped[str | None] = mapped_column(String(36), nullable=True, default=None)
    escalation_state: Mapped[str | None] = mapped_column(String(24), nullable=True, default=None)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)


class MaintenanceAssessment(Base):
    __tablename__ = "maintenance_assessments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    transformer_id: Mapped[str] = mapped_column(String(36), ForeignKey("transformers_asset.id"), index=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    prediction_horizon: Mapped[str] = mapped_column(String(8))
    risk_probability: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    uncertainty: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    model_version: Mapped[str] = mapped_column(String(32))
    features: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text)
    recommended_review: Mapped[str] = mapped_column(Text)
    human_decision: Mapped[str] = mapped_column(String(16), default="PENDING")  # PENDING|ACCEPTED|REJECTED|MODIFIED


class InspectionRecord(Base):
    __tablename__ = "inspection_records"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    transformer_id: Mapped[str] = mapped_column(String(36), ForeignKey("transformers_asset.id"), index=True)
    work_order_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True, default=None)
    assigned_to: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    checklist: Mapped[str] = mapped_column(Text)
    observations: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    photo_refs: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    gps_accuracy: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    signature: Mapped[str | None] = mapped_column(String(256), nullable=True, default=None)
    review_status: Mapped[str] = mapped_column(String(16), default="PENDING")


class AlertPolicyVersion(Base):
    __tablename__ = "alert_policy_versions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    transformer_class: Mapped[str] = mapped_column(String(32), index=True)
    thresholds: Mapped[str] = mapped_column(Text)  # JSON string
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    approved_by: Mapped[str | None] = mapped_column(String(36), nullable=True, default=None)
    version: Mapped[str] = mapped_column(String(32))
    source_evidence: Mapped[str] = mapped_column(String(64))


class TelemetryDeadLetter(Base):
    __tablename__ = "telemetry_dead_letters"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    ingestion_id: Mapped[str] = mapped_column(String(64), index=True)
    raw_payload: Mapped[str] = mapped_column(Text)
    error_reason: Mapped[str] = mapped_column(String(128))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    replayed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
