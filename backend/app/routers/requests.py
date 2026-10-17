import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..db import get_db
from ..models import User, ConnectionRequest, FieldUpdate, AuditLog
from ..deps import current_user, require
from ..workflow import run_workflow
from ..audit import audit
from ..access import visible_requests, require_request_access
from ..transitions import apply_transition

router = APIRouter(prefix="/requests", tags=["requests"])
def out(r: ConnectionRequest):
    d = {c.key: getattr(r, c.key) for c in r.__table__.columns}
    try: d["sla_risk_reasons"] = json.loads(d["sla_risk_reasons"] or "[]")
    except Exception: d["sla_risk_reasons"] = []
    return d

class CreateReq(BaseModel):
    applicant_name: str; phone: str; address: str; zone: str = "North"; pin_code: str = ""
    request_type: str = "new_connection"; description: str = ""; requested_load_kw: float = 1.0; document_name: str = ""
    tariff_category: str = "Residential (RGPU)"; phase: str = "1-Phase"; premises_type: str = "Owned"

@router.post("", status_code=201)
def create(body: CreateReq, db: Session = Depends(get_db), u: User = Depends(require("consumer"))):
    r = ConnectionRequest(consumer_id=u.id, **body.model_dump())
    db.add(r); db.flush(); run_workflow(db, r); audit(db, u, "REQUEST_CREATED", "request", r.id, f"{r.status} {r.category}/{r.severity} risk={r.sla_breach_risk}")
    db.commit(); db.refresh(r); return out(r)

@router.post("/with-document", status_code=201)
async def create_with_doc(applicant_name: str = Form(...), phone: str = Form(...), address: str = Form(...),
    zone: str = Form("North"), pin_code: str = Form(""), request_type: str = Form("new_connection"),
    description: str = Form(""), requested_load_kw: float = Form(1.0), tariff_category: str = Form("Residential (RGPU)"),
    phase: str = Form("1-Phase"), premises_type: str = Form("Owned"), document: UploadFile = File(None),
    db: Session = Depends(get_db), u: User = Depends(require("consumer"))):
    # Lite: store document name/metadata only (object storage is roadmap). Never log file contents.
    name = document.filename if document else ""
    r = ConnectionRequest(consumer_id=u.id, applicant_name=applicant_name, phone=phone, address=address, zone=zone,
        pin_code=pin_code, request_type=request_type, description=description, requested_load_kw=requested_load_kw, document_name=name,
        tariff_category=tariff_category, phase=phase, premises_type=premises_type)
    db.add(r); db.flush(); run_workflow(db, r); audit(db, u, "REQUEST_CREATED_WITH_DOC", "request", r.id, r.status)
    db.commit(); db.refresh(r); return out(r)

@router.get("")
def list_requests(db: Session = Depends(get_db), u: User = Depends(current_user)):
    q = visible_requests(db, u)
    return [out(r) for r in q.order_by(ConnectionRequest.created_at.desc()).all()]

@router.get("/{request_id}")
def get_one(request_id: str, db: Session = Depends(get_db), u: User = Depends(current_user)):
    r = db.get(ConnectionRequest, request_id)
    if not r: raise HTTPException(404, "Request not found")
    require_request_access(db, u, r)
    if u.role == "consumer" and r.consumer_id != u.id: raise HTTPException(403, "Not your request")
    if u.role == "engineer" and r.assigned_engineer_id != u.id:
        raise HTTPException(403, "Request is not assigned to you")
    return out(r)

ENGINEER_STATUSES = {"IN_PROGRESS", "FIELD_VERIFIED", "COMPLETED"}

class StatusUpdate(BaseModel): status: str; notes: str = ""
@router.patch("/{request_id}/status")
def update_status(request_id: str, body: StatusUpdate, db: Session = Depends(get_db), u: User = Depends(require("officer","engineer","admin"))):
    allowed = {"ASSIGNED","FIELD_VERIFIED","APPROVED","COMPLETED","REJECTED","NEEDS_CORRECTION","IN_PROGRESS"}
    if body.status not in allowed: raise HTTPException(400, f"Status must be one of {sorted(allowed)}")
    r = db.get(ConnectionRequest, request_id)
    if not r: raise HTTPException(404, "Request not found")
    require_request_access(db, u, r)
    if u.role == "engineer" and r.assigned_engineer_id != u.id:
        raise HTTPException(403, "Request is assigned to another engineer")
    if u.role == "engineer" and body.status not in ENGINEER_STATUSES:
        raise HTTPException(403, "Engineers may only update field-work statuses")
    changes = {"validation_notes": body.notes} if body.notes else {}
    apply_transition(db, r, body.status, **changes)
    audit(db, u, "STATUS_UPDATED", "request", r.id, body.status); db.commit(); db.refresh(r); return out(r)

@router.get("/kpis/summary")
def kpis(db: Session = Depends(get_db), u: User = Depends(current_user)):
    q = visible_requests(db, u)
    rows = q.all()
    total = len(rows); completed = sum(r.status=="COMPLETED" for r in rows)
    high = [r for r in rows if r.sla_breach_risk >= 0.7 and r.status not in ("COMPLETED","REJECTED")]
    open_rows = [r for r in rows if r.status not in ("COMPLETED","REJECTED")]
    def count_by(attr):
        keys = sorted({getattr(r, attr) for r in rows})
        return {k: sum(getattr(r, attr)==k for r in rows) for k in keys}
    return {"total_requests": total, "completed": completed, "pending": len(open_rows),
            "high_sla_risk": len(high), "needs_correction": sum(r.status=="NEEDS_CORRECTION" for r in rows),
            "avg_sla_risk": round(sum(r.sla_breach_risk for r in open_rows)/len(open_rows), 3) if open_rows else 0.0,
            "risk_buckets": {"low_<0.4": sum(r.sla_breach_risk < .4 for r in open_rows),
                             "watch_0.4-0.7": sum(.4 <= r.sla_breach_risk < .7 for r in open_rows),
                             "high_>=0.7": sum(r.sla_breach_risk >= .7 for r in open_rows)},
            "by_status": count_by("status"), "by_zone": count_by("zone"),
            "by_category": count_by("category"), "by_severity": count_by("severity")}

class FieldSync(BaseModel):
    client_uuid: str; request_id: str; task_status: str; notes: str = ""; meter_serial: str = ""; created_offline_at: str = ""
# Field work may only report field outcomes. APPROVED/REJECTED are officer decisions and must go
# through PATCH /requests/{id}/status — never through sync (Core Invariant 6, README).
FIELD_TASK_STATUSES = {"FIELD_VERIFIED", "COMPLETED", "BLOCKED"}

@router.post("/field-sync")
def field_sync(body: FieldSync, db: Session = Depends(get_db), u: User = Depends(require("engineer","officer","admin"))):
    """Offline sync endpoint. Same client_uuid twice -> duplicate:true, no second row (de-duplication)."""
    if body.task_status not in FIELD_TASK_STATUSES:
        raise HTTPException(400, f"task_status must be one of {sorted(FIELD_TASK_STATUSES)}")
    r = db.get(ConnectionRequest, body.request_id)
    if not r: raise HTTPException(404, "Request not found")
    require_request_access(db, u, r)
    if u.role == "engineer" and r.assigned_engineer_id != u.id:
        raise HTTPException(403, "Request is assigned to another engineer")
    existing = db.query(FieldUpdate).filter(FieldUpdate.client_uuid == body.client_uuid).first()
    if existing:
        if existing.request_id != body.request_id or existing.engineer_id != u.id:
            raise HTTPException(409, "client_uuid belongs to another sync operation")
        return {"duplicate": True, "synced": False, "field_update_id": existing.id, "message": "Already synced — duplicate ignored"}
    changes = {"meter_serial": body.meter_serial} if body.meter_serial else {}
    try:
        apply_transition(db, r, body.task_status, **changes)
    except HTTPException as conflict:
        # A concurrent same-UUID retry may have committed while this request was reading.
        db.rollback()
        existing = db.query(FieldUpdate).filter(FieldUpdate.client_uuid == body.client_uuid).first()
        if existing and existing.request_id == body.request_id and existing.engineer_id == u.id:
            return {"duplicate": True, "synced": False, "field_update_id": existing.id, "message": "Already synced — duplicate ignored"}
        raise conflict
    fu = FieldUpdate(client_uuid=body.client_uuid, request_id=body.request_id, engineer_id=u.id,
                     task_status=body.task_status, notes=body.notes, meter_serial=body.meter_serial, created_offline_at=body.created_offline_at)
    db.add(fu)
    audit(db, u, "FIELD_SYNC", "request", r.id, f"{body.task_status} uuid={body.client_uuid}")
    try:
        db.commit()
    except IntegrityError:
        # A concurrent retry with the same client_uuid hit the unique constraint first:
        # that is a duplicate, not an error (Core Invariant 2).
        db.rollback()
        existing = db.query(FieldUpdate).filter(FieldUpdate.client_uuid == body.client_uuid).first()
        if existing is None:
            raise
        if existing.request_id != body.request_id or existing.engineer_id != u.id:
            raise HTTPException(409, "client_uuid belongs to another sync operation")
        return {"duplicate": True, "synced": False, "field_update_id": existing.id, "message": "Already synced — duplicate ignored"}
    return {"duplicate": False, "synced": True, "field_update_id": fu.id, "request_status": r.status}

@router.get("/audit/logs")
def logs(db: Session = Depends(get_db), u: User = Depends(require("officer","admin"))):
    q = db.query(AuditLog)
    if u.role == "officer":
        visible_ids = visible_requests(db, u).with_entities(ConnectionRequest.id)
        q = q.filter(AuditLog.entity == "request", AuditLog.entity_id.in_(visible_ids))
    return [{"id": x.id, "actor_id": x.actor_id, "actor_role": x.actor_role, "action": x.action,
             "entity_id": x.entity_id, "detail": x.detail, "created_at": x.created_at} for x in q.order_by(AuditLog.created_at.desc()).limit(100)]
