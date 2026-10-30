import uuid, enum
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint, Index
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

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

