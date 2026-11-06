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

# ==============================================================================
# CONSUMER PROFILE SYSTEM (Citizen Unified Account, Addresses & Connections)
# ==============================================================================

class ConsumerProfile(Base):
    """Core profile data for citizen electricity consumers & applicants."""
    __tablename__ = "consumer_profiles"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String)
    date_of_birth: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    profile_photo_url: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    profile_completion_percentage: Mapped[int] = mapped_column(Integer, default=40)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    user = relationship("User")


class UserContact(Base):
    """Verified contact coordinates and OTP state for multi-channel communication."""
    __tablename__ = "user_contacts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    mobile_number: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    mobile_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    email: Mapped[str] = mapped_column(String, index=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    mobile_otp_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    mobile_otp_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    mobile_otp_attempts: Mapped[int] = mapped_column(Integer, default=0)
    email_otp_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    email_otp_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    email_otp_attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    user = relationship("User")


class ConsumerAddress(Base):
    """Permitted premises & correspondence addresses managed by citizen."""
    __tablename__ = "consumer_addresses"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    address_type: Mapped[str] = mapped_column(String, default="RESIDENTIAL")
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    house_flat_no: Mapped[str] = mapped_column(String)
    street: Mapped[str] = mapped_column(String)
    area: Mapped[str] = mapped_column(String)
    city_village: Mapped[str] = mapped_column(String)
    taluka: Mapped[str] = mapped_column(String)
    district: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String, default="Gujarat")
    pin_code: Mapped[str] = mapped_column(String, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    user = relationship("User")


class ConsumerPreference(Base):
    """Citizen preferences for multilingual communications and notification channels."""
    __tablename__ = "consumer_preferences"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    preferred_language: Mapped[str] = mapped_column(String, default="en")
    sms_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    bill_reminders: Mapped[bool] = mapped_column(Boolean, default=True)
    outage_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    application_status_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    user = relationship("User")


class ConsumerConnectionLink(Base):
    """Verified electricity connections linked to a citizen account (1:N support)."""
    __tablename__ = "consumer_connections"
    __table_args__ = (
        UniqueConstraint("user_id", "consumer_no", name="uq_consumer_connections_user_no"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    consumer_no: Mapped[str] = mapped_column(String, index=True)
    discom: Mapped[str] = mapped_column(String, default="UGVCL")
    connection_type: Mapped[str] = mapped_column(String, default="RGP")
    sanctioned_load_kw: Mapped[float] = mapped_column(Float, default=4.0)
    official_address: Mapped[str] = mapped_column(Text)
    subdivision: Mapped[str] = mapped_column(String)
    feeder_name: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    status: Mapped[str] = mapped_column(String, default="ACTIVE")
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    linked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    source: Mapped[str] = mapped_column(String, default="SELF_LINKED")
    application_id: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    user = relationship("User")


class ConsumerConnectionOtp(Base):
    """Transient OTP storage for linking an existing electricity connection."""
    __tablename__ = "consumer_connection_otps"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    consumer_no: Mapped[str] = mapped_column(String, index=True)
    masked_mobile: Mapped[str] = mapped_column(String)
    otp_hash: Mapped[str] = mapped_column(String)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ConsumerAuditLog(Base):
    """Immutable audit trail of all profile and security modifications by a consumer."""
    __tablename__ = "consumer_audit_logs"
    __table_args__ = (
        Index("ix_consumer_audit_user_created", "user_id", "created_at"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[str] = mapped_column(Text)
    ip_address: Mapped[str] = mapped_column(String, default="")
    user_agent: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    user = relationship("User")

# ==============================================================================
# PHASE 12: SMART TRANSFORMER ASSET & TELEMETRY MODELS
# ==============================================================================


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
# ==============================================================================
# PHASE 9: ELECTRICITY BILLING, SURCHARGE, AND FORMAL NOTICE MODELS
# ==============================================================================


class ElectricityBill(Base):
    """Authoritative electricity bill ledger supporting monthly and bi-monthly progressive tariffs."""
    __tablename__ = "electricity_bills"
    __table_args__ = (
        Index("ix_electricity_bills_consumer_due", "consumer_no", "due_date"),
        Index("ix_electricity_bills_status", "status"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    bill_no: Mapped[str] = mapped_column(String, unique=True, index=True)
    consumer_no: Mapped[str] = mapped_column(String, index=True)
    bill_month: Mapped[str] = mapped_column(String)
    bill_date: Mapped[str] = mapped_column(String)
    due_date: Mapped[str] = mapped_column(String)
    billing_cycle_type: Mapped[str] = mapped_column(String, default="MONTHLY")
    period_start_date: Mapped[str] = mapped_column(String)
    period_end_date: Mapped[str] = mapped_column(String)
    previous_reading_date: Mapped[str | None] = mapped_column(String, nullable=True)
    current_reading_date: Mapped[str | None] = mapped_column(String, nullable=True)
    previous_reading_kwh: Mapped[float] = mapped_column(Float, default=0.0)
    current_reading_kwh: Mapped[float] = mapped_column(Float, default=0.0)
    reading_provenance: Mapped[str] = mapped_column(String, default="AMR_SMART_METER")
    units_consumed: Mapped[float] = mapped_column(Float, default=0.0)
    energy_charges: Mapped[float] = mapped_column(Float, default=0.0)
    fixed_charges: Mapped[float] = mapped_column(Float, default=0.0)
    fuel_price_adjustment: Mapped[float] = mapped_column(Float, default=0.0)
    electricity_duty: Mapped[float] = mapped_column(Float, default=0.0)
    rebate_or_subsidy: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String, default="Unpaid")
    slab_breakdown_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class PaymentTransaction(Base):
    """Authoritative payment receipts ledger with 11-field financial settlement audit trail."""
    __tablename__ = "payment_transactions"
    __table_args__ = (
        Index("ix_payment_transactions_bill_status", "bill_no", "status"),
        Index("ix_payment_transactions_consumer", "consumer_no"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    transaction_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    bill_no: Mapped[str] = mapped_column(String, index=True)
    consumer_no: Mapped[str] = mapped_column(String, index=True)
    amount: Mapped[float] = mapped_column(Float)
    payment_date: Mapped[str] = mapped_column(String)
    payment_method: Mapped[str] = mapped_column(String, default="UPI")
    status: Mapped[str] = mapped_column(String, default="Successful")
    principal_settled: Mapped[float] = mapped_column(Float, default=0.0)
    late_charges_settled: Mapped[float] = mapped_column(Float, default=0.0)
    reference_id: Mapped[str | None] = mapped_column(String, nullable=True)
    settlement_breakdown_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class FormalNotice(Base):
    """Simulated Section 56 statutory demand notice with 15-day payment countdown."""
    __tablename__ = "formal_notices"
    __table_args__ = (
        Index("ix_formal_notices_consumer_status", "consumer_no", "status"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    bill_no: Mapped[str] = mapped_column(String, index=True)
    consumer_no: Mapped[str] = mapped_column(String, index=True)
    status: Mapped[str] = mapped_column(String, default="SERVED")
    issue_date: Mapped[str] = mapped_column(String)
    service_date: Mapped[str] = mapped_column(String)
    payment_deadline: Mapped[str] = mapped_column(String)
    disconnection_review_status: Mapped[str] = mapped_column(String, default="PENDING_REVIEW")
    snapshot_at_issuance_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class LateChargePolicy(Base):
    """Configurable, versioned Delayed Payment Surcharge (DPS) policy."""
    __tablename__ = "late_charge_policies"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    version: Mapped[str] = mapped_column(String, default="2026.1-DEMO")
    effective_from: Mapped[str] = mapped_column(String, default="2026-01-01")
    is_demo_simulation: Mapped[bool] = mapped_column(Boolean, default=True)
    tariff_authority: Mapped[str] = mapped_column(String)
    calculation_method: Mapped[str] = mapped_column(String, default="DAILY_SIMPLE")
    annual_rate_percent: Mapped[float] = mapped_column(Float, default=15.0)
    grace_period_days: Mapped[int] = mapped_column(Integer, default=0)
    days_in_year_basis: Mapped[int] = mapped_column(Integer, default=365)
    minimum_charge_inr: Mapped[float] = mapped_column(Float, default=0.0)
    rounding_method: Mapped[str] = mapped_column(String, default="ROUND_HALF_UP_2DEC")
    category_overrides_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    statutory_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


# ==============================================================================
# PHASE 11A — PERSISTENT AI METER READING & BILL ANOMALY DETECTION MODELS
# ==============================================================================


class MeterConfigurationModel(Base):
    """Active meter configuration per connection with version tracking."""

    __tablename__ = "meter_configurations"

    connection_no: Mapped[str] = mapped_column(String(32), primary_key=True)
    serial_number: Mapped[str] = mapped_column(String(64), index=True)
    digit_count: Mapped[int] = mapped_column(Integer, default=6)
    integral_digits: Mapped[int] = mapped_column(Integer, default=5)
    fractional_digits: Mapped[int] = mapped_column(Integer, default=1)
    multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    allow_rollover: Mapped[bool] = mapped_column(Boolean, default=True)
    max_rollover_value: Mapped[float] = mapped_column(Float, default=99999.9)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, onupdate=now
    )
    updated_by_id: Mapped[str] = mapped_column(String(64), default="SYSTEM")
    updated_by_name: Mapped[str] = mapped_column(String(128), default="System Seed")


class MeterConfigurationVersionModel(Base):
    """Append-only version history for meter configuration updates."""

    __tablename__ = "meter_configuration_versions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    connection_no: Mapped[str] = mapped_column(
        String(32), ForeignKey("meter_configurations.connection_no"), index=True
    )
    version: Mapped[int] = mapped_column(Integer, index=True)
    serial_number: Mapped[str] = mapped_column(String(64))
    digit_count: Mapped[int] = mapped_column(Integer)
    integral_digits: Mapped[int] = mapped_column(Integer)
    fractional_digits: Mapped[int] = mapped_column(Integer)
    multiplier: Mapped[float] = mapped_column(Float)
    allow_rollover: Mapped[bool] = mapped_column(Boolean)
    max_rollover_value: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(Text, default="Initial configuration")
    changed_by_id: Mapped[str] = mapped_column(String(64))
    changed_by_name: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


class MeterPrivatePhotoRecord(Base):
    """Encrypted private photograph reference stored via uploads.py vault (never exposed via public URLs)."""

    __tablename__ = "meter_private_photos"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_type: Mapped[str] = mapped_column(
        String(32), index=True
    )  # METER_READING | BILLING_REVIEW
    owner_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    connection_no: Mapped[str] = mapped_column(String(32), index=True)
    consumer_no: Mapped[str] = mapped_column(String(32), index=True)
    uploaded_by_id: Mapped[str] = mapped_column(String(64), index=True)
    uploaded_by_name: Mapped[str] = mapped_column(String(128))
    uploaded_by_role: Mapped[str] = mapped_column(String(32))
    storage_key: Mapped[str] = mapped_column(String(256), unique=True)
    mime_type: Mapped[str] = mapped_column(String(64), default="image/jpeg")
    byte_length: Mapped[int] = mapped_column(Integer, default=0)
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    encryption_key_id: Mapped[str] = mapped_column(
        String(64), default="aes-256-gcm-hkdf-v1"
    )
    metadata_stripped: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


class MeterReadingSubmissionRecord(Base):
    """Persistent meter reading submission record linked to OCR, photo vault, and Phase 9 tariff breakdown."""

    __tablename__ = "meter_reading_submissions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    client_uuid: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    connection_no: Mapped[str] = mapped_column(String(32), index=True)
    consumer_no: Mapped[str] = mapped_column(String(32), index=True)
    consumer_name: Mapped[str] = mapped_column(String(128))
    subdivision: Mapped[str] = mapped_column(
        String(64), default="Sabarmati Subdivision", index=True
    )
    submitted_by_id: Mapped[str] = mapped_column(String(64), index=True)
    submitted_by_name: Mapped[str] = mapped_column(String(128))
    submitted_by_role: Mapped[str] = mapped_column(String(32), index=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )
    capture_mode: Mapped[str] = mapped_column(
        String(32), default="CONSUMER_PHOTO"
    )  # CONSUMER_PHOTO | FIELD_OVERDUE_CAPTURE | STAFF_MANUAL
    work_order_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    previous_reading: Mapped[float] = mapped_column(Float)
    previous_reading_date: Mapped[str] = mapped_column(String(32))
    submitted_reading: Mapped[float] = mapped_column(Float)
    reading_date: Mapped[str] = mapped_column(String(32))
    cycle_days: Mapped[int] = mapped_column(Integer)
    multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    effective_consumption: Mapped[float] = mapped_column(Float)
    ocr_raw_text: Mapped[str] = mapped_column(Text, default="")
    ocr_normalized_reading: Mapped[float | None] = mapped_column(Float, nullable=True)
    ocr_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    ocr_engine_version: Mapped[str] = mapped_column(
        String(64), default="tesseract.js-7.0.0-local-v1"
    )
    manual_override: Mapped[bool] = mapped_column(Boolean, default=False)
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    quality_passed: Mapped[bool] = mapped_column(Boolean, default=True)
    quality_warnings_json: Mapped[str] = mapped_column(Text, default="[]")
    photo_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("meter_private_photos.id"), nullable=True
    )
    anomalies_json: Mapped[str] = mapped_column(Text, default="[]")
    status: Mapped[str] = mapped_column(
        String(32), default="APPROVED", index=True
    )  # PENDING_REVIEW | APPROVED | REJECTED | REREAD_REQUESTED
    provisional_amount: Mapped[float] = mapped_column(Float, default=0.0)
    provisional_breakdown_json: Mapped[str] = mapped_column(Text, default="{}")
    meter_config_version: Mapped[int] = mapped_column(Integer, default=1)
    threshold_version: Mapped[int] = mapped_column(Integer, default=1)
    reviewed_by_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reviewed_by_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    corrected_reading: Mapped[float | None] = mapped_column(Float, nullable=True)
    demo: Mapped[bool] = mapped_column(Boolean, default=True)


class MeterEventRecord(Base):
    """Append-only meter rollover and meter replacement event log."""

    __tablename__ = "meter_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    reading_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("meter_reading_submissions.id"), index=True
    )
    connection_no: Mapped[str] = mapped_column(String(32), index=True)
    event_type: Mapped[str] = mapped_column(
        String(32), index=True
    )  # NONE | METER_ROLLOVER | METER_REPLACEMENT
    old_meter_final_reading: Mapped[float | None] = mapped_column(Float, nullable=True)
    new_meter_start_reading: Mapped[float | None] = mapped_column(Float, nullable=True)
    rollover_max_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    effective_consumption: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by_id: Mapped[str] = mapped_column(String(64))
    recorded_by_name: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


class MeterOcrExtractionRecord(Base):
    """Append-only local OCR extraction telemetry and normalized reading output."""

    __tablename__ = "meter_ocr_results"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    reading_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("meter_reading_submissions.id"), unique=True, index=True
    )
    meter_id: Mapped[str] = mapped_column(String(64), index=True)
    engine_version: Mapped[str] = mapped_column(
        String(64), default="tesseract.js-7.0.0-local-v1"
    )
    raw_text: Mapped[str] = mapped_column(Text, default="")
    candidate_reading: Mapped[float | None] = mapped_column(Float, nullable=True)
    normalized_reading: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    requires_review: Mapped[bool] = mapped_column(Boolean, default=False)
    manual_override: Mapped[bool] = mapped_column(Boolean, default=False)
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    quality_passed: Mapped[bool] = mapped_column(Boolean, default=True)
    quality_warnings_json: Mapped[str] = mapped_column(Text, default="[]")
    extracted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


class MeterAmbiguousDigitRecord(Base):
    """Append-only per-digit ambiguity records produced during local OCR inspection."""

    __tablename__ = "meter_ambiguous_digits"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    ocr_result_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meter_ocr_results.id"), index=True
    )
    reading_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("meter_reading_submissions.id"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    char_value: Mapped[str] = mapped_column(String(8))
    alternatives_json: Mapped[str] = mapped_column(Text, default="[]")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    reason: Mapped[str] = mapped_column(Text)


class MeterReadingReviewHistoryRecord(Base):
    """Append-only audit trail for every staff review action on a meter reading."""

    __tablename__ = "meter_reading_review_history"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    reading_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("meter_reading_submissions.id"), index=True
    )
    action: Mapped[str] = mapped_column(
        String(32)
    )  # SUBMITTED | APPROVE | REJECT | REQUEST_REREAD
    previous_status: Mapped[str] = mapped_column(String(32))
    new_status: Mapped[str] = mapped_column(String(32))
    actor_id: Mapped[str] = mapped_column(String(64), index=True)
    actor_name: Mapped[str] = mapped_column(String(128))
    actor_role: Mapped[str] = mapped_column(String(32))
    note: Mapped[str] = mapped_column(Text)
    corrected_reading: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


class MeterAnomalyCaseRecord(Base):
    """Structured anomaly case record linked to a meter reading and 7-status workflow."""

    __tablename__ = "meter_anomaly_cases"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    reading_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("meter_reading_submissions.id"), index=True
    )
    connection_no: Mapped[str] = mapped_column(String(32), index=True)
    consumer_no: Mapped[str] = mapped_column(String(32), index=True)
    consumer_name: Mapped[str] = mapped_column(String(128))
    subdivision: Mapped[str] = mapped_column(
        String(64), default="Sabarmati Subdivision", index=True
    )
    category: Mapped[str] = mapped_column(String(64), index=True)
    severity: Mapped[str] = mapped_column(String(16), index=True)  # INFO | REVIEW | HIGH
    status: Mapped[str] = mapped_column(
        String(32), default="PENDING_REVIEW", index=True
    )  # DETECTED | PENDING_REVIEW | UNDER_INVESTIGATION | APPROVED | REJECTED | ADJUSTED | CLOSED
    summary: Mapped[str] = mapped_column(Text)
    reasons_json: Mapped[str] = mapped_column(Text, default="[]")
    evidence_json: Mapped[str] = mapped_column(Text, default="{}")
    expected_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    threshold_version: Mapped[int] = mapped_column(Integer, default=1)
    recommended_action: Mapped[str] = mapped_column(Text, default="")
    assigned_role: Mapped[str] = mapped_column(String(32), default="EMPLOYEE")
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    adjusted_units: Mapped[float | None] = mapped_column(Float, nullable=True)
    adjusted_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    resolved_by_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resolved_by_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, onupdate=now
    )
    demo: Mapped[bool] = mapped_column(Boolean, default=True)


class MeterAnomalyStatusHistoryRecord(Base):
    """Append-only status history for every transition on a meter anomaly case."""

    __tablename__ = "meter_anomaly_status_history"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    anomaly_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("meter_anomaly_cases.id"), index=True
    )
    from_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    to_status: Mapped[str] = mapped_column(String(32), index=True)
    actor_id: Mapped[str] = mapped_column(String(64))
    actor_name: Mapped[str] = mapped_column(String(128))
    actor_role: Mapped[str] = mapped_column(String(32))
    note: Mapped[str] = mapped_column(Text)
    adjusted_units: Mapped[float | None] = mapped_column(Float, nullable=True)
    adjusted_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


class ConsumerBillingReviewRecord(Base):
    """Persistent consumer billing review request linked to Phase 9 bill validation snapshot."""

    __tablename__ = "consumer_billing_reviews"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    client_uuid: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    bill_no: Mapped[str] = mapped_column(String(64), index=True)
    connection_no: Mapped[str] = mapped_column(String(32), index=True)
    consumer_no: Mapped[str] = mapped_column(String(32), index=True)
    consumer_name: Mapped[str] = mapped_column(String(128))
    subdivision: Mapped[str] = mapped_column(
        String(64), default="Sabarmati Subdivision", index=True
    )
    category: Mapped[str] = mapped_column(String(64), index=True)
    description: Mapped[str] = mapped_column(Text)
    preferred_reading: Mapped[float | None] = mapped_column(Float, nullable=True)
    evidence_photo_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("meter_private_photos.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(32), default="PENDING_REVIEW", index=True
    )  # PENDING_REVIEW | UNDER_INVESTIGATION | APPROVED | REJECTED | ADJUSTED | CLOSED
    linked_reading_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    linked_anomaly_case_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    validation_snapshot_json: Mapped[str] = mapped_column(Text, default="{}")
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resolved_by_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, onupdate=now
    )
    demo: Mapped[bool] = mapped_column(Boolean, default=True)


class ConsumerBillingReviewHistoryRecord(Base):
    """Append-only status and note history for consumer billing review requests."""

    __tablename__ = "consumer_billing_review_history"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    review_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("consumer_billing_reviews.id"), index=True
    )
    status: Mapped[str] = mapped_column(String(32), index=True)
    actor_id: Mapped[str] = mapped_column(String(64))
    actor_name: Mapped[str] = mapped_column(String(128))
    actor_role: Mapped[str] = mapped_column(String(32))
    note: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


class MeterThresholdPolicyVersionRecord(Base):
    """Append-only anomaly threshold policy versions (minimum_history >= 2 enforced)."""

    __tablename__ = "meter_threshold_policy_versions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    version: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    minimum_history: Mapped[int] = mapped_column(Integer, default=2)
    high_daily_ratio: Mapped[float] = mapped_column(Float, default=2.5)
    low_daily_ratio: Mapped[float] = mapped_column(Float, default=0.35)
    high_daily_units: Mapped[float] = mapped_column(Float, default=80.0)
    reason: Mapped[str] = mapped_column(Text)
    changed_by_id: Mapped[str] = mapped_column(String(64))
    changed_by_name: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


class FinancialAdjustmentProposalRecord(Base):
    """Append-only financial adjustment proposal preserving historical bills untouched."""

    __tablename__ = "financial_adjustment_proposals"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    anomaly_case_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    billing_review_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    bill_no: Mapped[str] = mapped_column(String(64), index=True)
    connection_no: Mapped[str] = mapped_column(String(32), index=True)
    consumer_no: Mapped[str] = mapped_column(String(32), index=True)
    consumer_name: Mapped[str] = mapped_column(String(128))
    subdivision: Mapped[str] = mapped_column(
        String(64), default="Sabarmati Subdivision", index=True
    )
    original_units: Mapped[float] = mapped_column(Float)
    original_billed_amount: Mapped[float] = mapped_column(Float)
    proposed_adjusted_units: Mapped[float] = mapped_column(Float)
    proposed_adjustment_amount: Mapped[float] = mapped_column(Float)
    proposed_revised_amount: Mapped[float] = mapped_column(Float)
    adjustment_type: Mapped[str] = mapped_column(
        String(32)
    )  # CREDIT_MEMO | DEBIT_MEMO | REBILL_PROPOSAL
    reason: Mapped[str] = mapped_column(Text)
    calculation_basis: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(32), default="PENDING_APPROVAL", index=True
    )  # DRAFT | PENDING_APPROVAL | APPROVED | REJECTED
    ledger_application_status: Mapped[str] = mapped_column(
        String(32), default="PENDING_AUTHORIZATION", index=True
    )  # PENDING_AUTHORIZATION | APPLIED_AS_ADJUSTMENT_NOTE | REJECTED_NOT_APPLIED
    ledger_reference_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ledger_applied_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    proposed_by_id: Mapped[str] = mapped_column(String(64), index=True)
    proposed_by_name: Mapped[str] = mapped_column(String(128))
    proposed_by_role: Mapped[str] = mapped_column(String(32))
    proposed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )
    approved_by_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    approved_by_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    approved_by_role: Mapped[str | None] = mapped_column(String(32), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approval_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    demo: Mapped[bool] = mapped_column(Boolean, default=True)


class FinancialAdjustmentHistoryRecord(Base):
    """Append-only history log for financial adjustment proposals and ledger applications."""

    __tablename__ = "financial_adjustment_history"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    adjustment_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("financial_adjustment_proposals.id"), index=True
    )
    from_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    to_status: Mapped[str] = mapped_column(String(32))
    ledger_application_status: Mapped[str] = mapped_column(String(32))
    actor_id: Mapped[str] = mapped_column(String(64))
    actor_name: Mapped[str] = mapped_column(String(128))
    actor_role: Mapped[str] = mapped_column(String(32))
    note: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


class MeterNotificationDedupRecord(Base):
    """Persistent notification deduplication registry across server restarts."""

    __tablename__ = "meter_notification_dedup"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    dedupe_key: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    recipient_key: Mapped[str] = mapped_column(String(128), index=True)
    category: Mapped[str] = mapped_column(String(64))
    reference_id: Mapped[str] = mapped_column(String(64), index=True)
    notification_id: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


class ActorIdempotencyRecord(Base):
    """Actor + endpoint + payload-hash scoped idempotency record.
    Identical retries return the original record; UUID reuse with a different actor or payload returns 409.
    """

    __tablename__ = "actor_idempotency_records"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    client_uuid: Mapped[str] = mapped_column(String(128), index=True)
    endpoint: Mapped[str] = mapped_column(String(128), index=True)
    actor_id: Mapped[str] = mapped_column(String(64), index=True)
    payload_hash: Mapped[str] = mapped_column(String(64))
    resource_type: Mapped[str] = mapped_column(String(64))
    resource_id: Mapped[str] = mapped_column(String(64), index=True)
    response_status: Mapped[int] = mapped_column(Integer, default=201)
    response_body_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


