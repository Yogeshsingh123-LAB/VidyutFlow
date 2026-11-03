import json
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..db import get_db
from ..models import User, WorkOrderEvidence
from ..deps import current_user, require
from ..audit import audit
from ..security import sanitize_untrusted_text

router = APIRouter(prefix="/evidence", tags=["evidence"])

def now_utc():
    return datetime.now(timezone.utc)


class EvidenceSubmitReq(BaseModel):
    client_uuid: str = Field(..., description="RFC-4122 Client UUID for idempotent offline submission")
    work_order_id: str = Field(..., description="Target work order ID")
    complaint_id: str | None = Field(default=None, description="Optional linked complaint ID")
    evidence_type: str = Field(..., description="photo_before | photo_after | checklist | technical_report | safety_exemption")
    storage_ref: str = Field(..., description="IndexedDB storage key or asset reference")
    file_size_bytes: int = Field(default=0, ge=0)
    mime_type: str = Field(default="image/jpeg")
    sha256_hash: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    metadata_json: str | None = None


class EvidenceReviewReq(BaseModel):
    verification_status: str = Field(..., description="approved | rejected | more_info_needed")
    review_remarks: str | None = Field(default=None, description="Review notes or feedback remarks")


def _out(e: WorkOrderEvidence) -> dict:
    return {
        "id": e.id,
        "client_uuid": e.client_uuid,
        "work_order_id": e.work_order_id,
        "complaint_id": e.complaint_id,
        "evidence_type": e.evidence_type,
        "storage_ref": e.storage_ref,
        "file_size_bytes": e.file_size_bytes,
        "mime_type": e.mime_type,
        "sha256_hash": e.sha256_hash,
        "submitted_by": e.submitted_by,
        "latitude": e.latitude,
        "longitude": e.longitude,
        "metadata_json": e.metadata_json,
        "verification_status": e.verification_status,
        "reviewed_by": e.reviewed_by,
        "reviewed_at": e.reviewed_at.isoformat() if e.reviewed_at else None,
        "review_remarks": e.review_remarks,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


@router.post("", status_code=201)
def submit_evidence(
    body: EvidenceSubmitReq,
    db: Session = Depends(get_db),
    u: User = Depends(require("engineer", "officer", "admin")),
):
    """Additive endpoint for submitting work order completion evidence with client UUID idempotency."""
    # Check if client_uuid already exists (idempotent replay)
    existing = db.query(WorkOrderEvidence).filter(WorkOrderEvidence.client_uuid == body.client_uuid).first()
    if existing:
        return _out(existing)

    # Validate coordinates if provided
    if body.latitude is not None or body.longitude is not None:
        if body.latitude is None or body.longitude is None:
            raise HTTPException(422, "Both latitude and longitude must be provided together")
        if not (math.isfinite(body.latitude) and math.isfinite(body.longitude) and -90.0 <= body.latitude <= 90.0 and -180.0 <= body.longitude <= 180.0):
            raise HTTPException(422, "Coordinates out of valid range")

    clean_metadata = sanitize_untrusted_text(body.metadata_json or "")
    evidence = WorkOrderEvidence(
        client_uuid=body.client_uuid,
        work_order_id=sanitize_untrusted_text(body.work_order_id),
        complaint_id=sanitize_untrusted_text(body.complaint_id) if body.complaint_id else None,
        evidence_type=sanitize_untrusted_text(body.evidence_type),
        storage_ref=sanitize_untrusted_text(body.storage_ref),
        file_size_bytes=body.file_size_bytes,
        mime_type=sanitize_untrusted_text(body.mime_type),
        sha256_hash=sanitize_untrusted_text(body.sha256_hash) if body.sha256_hash else None,
        submitted_by=u.id,
        latitude=round(float(body.latitude), 6) if body.latitude is not None else None,
        longitude=round(float(body.longitude), 6) if body.longitude is not None else None,
        metadata_json=clean_metadata if clean_metadata else None,
        verification_status="pending_verification",
    )
    db.add(evidence)
    try:
        db.commit()
        db.refresh(evidence)
    except IntegrityError:
        db.rollback()
        existing = db.query(WorkOrderEvidence).filter(WorkOrderEvidence.client_uuid == body.client_uuid).first()
        if existing:
            return _out(existing)
        raise HTTPException(409, "Evidence item already exists")

    audit(
        db,
        evidence.id,
        "EVIDENCE_SUBMITTED",
        u.id,
        "SUCCESS",
        f"WorkOrder {evidence.work_order_id} evidence {evidence.evidence_type} attached by {u.name}",
    )
    return _out(evidence)


@router.get("/work-order/{work_order_id}")
def get_work_order_evidence(
    work_order_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(require("engineer", "officer", "admin")),
):
    """Retrieve all evidence records associated with a work order (staff/admin only)."""
    clean_wo_id = sanitize_untrusted_text(work_order_id)
    items = db.query(WorkOrderEvidence).filter(WorkOrderEvidence.work_order_id == clean_wo_id).order_by(WorkOrderEvidence.created_at.asc()).all()
    return [_out(item) for item in items]


@router.post("/{evidence_id}/verify")
def review_evidence(
    evidence_id: str,
    body: EvidenceReviewReq,
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Authorized employee or admin reviews submitted evidence and approves, rejects, or requests more information."""
    evidence = db.query(WorkOrderEvidence).filter(WorkOrderEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(404, "Evidence record not found")

    allowed_statuses = {"approved", "rejected", "more_info_needed"}
    if body.verification_status not in allowed_statuses:
        raise HTTPException(422, f"Status must be one of: {allowed_statuses}")

    clean_remarks = sanitize_untrusted_text(body.review_remarks or "")
    evidence.verification_status = body.verification_status
    evidence.reviewed_by = u.id
    evidence.reviewed_at = now_utc()
    evidence.review_remarks = clean_remarks if clean_remarks else None

    db.commit()
    db.refresh(evidence)

    audit(
        db,
        evidence.id,
        f"EVIDENCE_{body.verification_status.upper()}",
        u.id,
        "SUCCESS",
        f"Evidence for WorkOrder {evidence.work_order_id} reviewed by {u.name}: {body.verification_status}. {clean_remarks}",
    )
    return _out(evidence)


@router.get("/kpis/summary")
def get_evidence_kpis(
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Aggregate KPI metrics for field completion verification."""
    total = db.query(WorkOrderEvidence).count()
    pending = db.query(WorkOrderEvidence).filter(WorkOrderEvidence.verification_status == "pending_verification").count()
    approved = db.query(WorkOrderEvidence).filter(WorkOrderEvidence.verification_status == "approved").count()
    rejected = db.query(WorkOrderEvidence).filter(WorkOrderEvidence.verification_status == "rejected").count()
    more_info = db.query(WorkOrderEvidence).filter(WorkOrderEvidence.verification_status == "more_info_needed").count()

    return {
        "total_evidence_items": total,
        "pending_verification": pending,
        "approved": approved,
        "rejected": rejected,
        "more_info_needed": more_info,
        "approval_rate_pct": round((approved / total * 100.0), 1) if total > 0 else 100.0,
    }
