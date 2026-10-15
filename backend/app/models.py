import uuid, enum
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

def uid(): return str(uuid.uuid4())
def now(): return datetime.now(timezone.utc)

class Role(str, enum.Enum):
    consumer = "consumer"; officer = "officer"; engineer = "engineer"; admin = "admin"

class User(Base):
    __tablename__ = "users"
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
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    consumer_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    applicant_name: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String)
    address: Mapped[str] = mapped_column(Text)
    zone: Mapped[str] = mapped_column(String, default="North", index=True)
    pin_code: Mapped[str] = mapped_column(String, default="")
    request_type: Mapped[str] = mapped_column(String, default="new_connection")
    description: Mapped[str] = mapped_column(Text, default="")
    requested_load_kw: Mapped[float] = mapped_column(Float, default=1.0)
    document_name: Mapped[str] = mapped_column(String, default="")
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
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    actor_id: Mapped[str] = mapped_column(String, default="system")
    actor_role: Mapped[str] = mapped_column(String, default="system")
    action: Mapped[str] = mapped_column(String, index=True)
    entity: Mapped[str] = mapped_column(String, default="")
    entity_id: Mapped[str] = mapped_column(String, default="")
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
