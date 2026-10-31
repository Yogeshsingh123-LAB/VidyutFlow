import json
import math
from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..db import get_db
from datetime import datetime, timezone
from ..models import User, ConnectionRequest, FieldUpdate, AuditLog, ErpSyncLog, AlertDispatch
from ..deps import current_user, require
from ..workflow import run_workflow
from ..audit import audit, verify_chain
from ..notify import notify, notify_request_parties, notify_zone_officers
from ..access import visible_requests, require_request_access
from ..config import settings
from ..transitions import apply_transition
from ..uploads import sanitize_document_reference, validate_and_encrypt_upload, validate_and_read_upload
from ..erp_adapter import record_erp_sync
from ..alerts import evaluate_and_dispatch_alerts
from ..workflow_templates import resolve_active_template
from .staff import resolve_active_zone
from ..perf import kpi_cache

router = APIRouter(prefix="/requests", tags=["requests"])
def out(r: ConnectionRequest):
    d = {c.key: getattr(r, c.key) for c in r.__table__.columns}
    try: d["sla_risk_reasons"] = json.loads(d["sla_risk_reasons"] or "[]")
    except Exception: d["sla_risk_reasons"] = []
    raw_issues = d.pop("validation_issues_json", None)
    try:
        issues = json.loads(raw_issues) if raw_issues is not None else None
        d["validation_issues"] = issues if isinstance(issues, list) else None
    except (TypeError, ValueError):
        d["validation_issues"] = None
    return d

class CreateReq(BaseModel):
    applicant_name: str; phone: str; address: str; zone: str = "North"; pin_code: str = ""
    latitude: float | None = None; longitude: float | None = None
    request_type: str = "new_connection"; description: str = ""; requested_load_kw: float = 1.0; document_name: str = ""
    tariff_category: str = "Residential (RGPU)"; phase: str = "1-Phase"; premises_type: str = "Owned"

def _validate_coordinates(lat: float | None, lon: float | None) -> tuple[float | None, float | None]:
    if lat is None and lon is None:
        return None, None
    if lat is None or lon is None:
        raise HTTPException(422, "Both latitude and longitude must be provided together")
    if not (math.isfinite(lat) and math.isfinite(lon) and -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
        raise HTTPException(422, "Coordinates out of valid WGS84 range")
    return round(float(lat), 6), round(float(lon), 6)

def _notify_submission(db, r: ConnectionRequest, u: User):
    """Alert-centre rows on submit: consumer confirmation, zone officers, assigned engineer."""
    kind = "warning" if r.status == "NEEDS_CORRECTION" else "success"
    detail = r.validation_notes if r.status == "NEEDS_CORRECTION" else f"Status {r.status} · {r.category}/{r.severity}"
    notify(db, u.id, "Request submitted", f"{detail} (ref {r.id[:8]})", kind, r.id)
    notify_zone_officers(db, r.zone, "New request in queue", f"{r.applicant_name} · {r.category} · risk {r.sla_breach_risk}", "info", r.id)
    if r.assigned_engineer_id:
        notify(db, r.assigned_engineer_id, "New field task assigned", f"{r.applicant_name} · {r.zone} zone", "info", r.id)

@router.post("", status_code=201)
def create(body: CreateReq, db: Session = Depends(get_db), u: User = Depends(require("consumer"))):
    if not math.isfinite(body.requested_load_kw):
        raise HTTPException(422, "Requested load must be finite")
    lat, lon = _validate_coordinates(body.latitude, body.longitude)
    canonical_zone = resolve_active_zone(db, body.zone)
    tpl = resolve_active_template(db, body.request_type)
    payload = body.model_dump()
    payload["zone"] = canonical_zone
    payload["latitude"] = lat
    payload["longitude"] = lon
    payload["request_type"] = tpl.template_code
    payload["document_name"] = sanitize_document_reference(payload.get("document_name", ""))
    r = ConnectionRequest(consumer_id=u.id, **payload)
    db.add(r); db.flush(); run_workflow(db, r); audit(db, u, "REQUEST_CREATED", "request", r.id, f"{r.status} {r.category}/{r.severity} risk={r.sla_breach_risk}")
    _notify_submission(db, r, u)
    if r.sla_breach_risk >= settings.alert_sla_risk_threshold or r.status == "NEEDS_CORRECTION":
        evaluate_and_dispatch_alerts(db, actor=u, zone_filter=r.zone)
    db.commit(); kpi_cache.bump_epoch(); db.refresh(r); return out(r)

@router.post("/with-document", status_code=201)
async def create_with_doc(applicant_name: str = Form(...), phone: str = Form(...), address: str = Form(...),
    zone: str | None = Form(None), pin_code: str = Form(""),
    latitude: float | None = Form(None), longitude: float | None = Form(None),
    request_type: str = Form("new_connection"),
    description: str = Form(""), requested_load_kw: float = Form(1.0), tariff_category: str = Form("Residential (RGPU)"),
    phase: str = Form("1-Phase"), premises_type: str = Form("Owned"), document: UploadFile = File(None),
    db: Session = Depends(get_db), u: User = Depends(require("consumer"))):
    if not math.isfinite(requested_load_kw):
        raise HTTPException(422, "Requested load must be finite")
    lat, lon = _validate_coordinates(latitude, longitude)
    effective_zone = "North" if zone is None else zone
    canonical_zone = resolve_active_zone(db, effective_zone)
    tpl = resolve_active_template(db, request_type)
    # Validate size + sanitize filename + envelope-encrypt payload with AES-256-GCM (never log plaintext).
    name, enc_sha = (
        await validate_and_encrypt_upload(document, settings.max_upload_bytes, settings.secret_key)
        if document
        else ("", "")
    )
    r = ConnectionRequest(consumer_id=u.id, applicant_name=applicant_name, phone=phone, address=address, zone=canonical_zone,
        pin_code=pin_code, latitude=lat, longitude=lon, request_type=tpl.template_code, description=description, requested_load_kw=requested_load_kw, document_name=name,
        tariff_category=tariff_category, phase=phase, premises_type=premises_type)
    db.add(r); db.flush(); run_workflow(db, r); audit(db, u, "REQUEST_CREATED_WITH_DOC", "request", r.id, f"{r.status}{f' enc=AES256GCM:{enc_sha[:12]}' if enc_sha else ''}")
    _notify_submission(db, r, u)
    if r.sla_breach_risk >= settings.alert_sla_risk_threshold or r.status == "NEEDS_CORRECTION":
        evaluate_and_dispatch_alerts(db, actor=u, zone_filter=r.zone)
    db.commit(); kpi_cache.bump_epoch(); db.refresh(r); return out(r)

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
    audit(db, u, "STATUS_UPDATED", "request", r.id, body.status)
    if body.status in ("APPROVED", "COMPLETED"):
        record_erp_sync(
            db,
            r,
            u,
            "SANCTION_APPROVED" if body.status == "APPROVED" else "METER_COMMISSIONED",
        )
    notify_request_parties(db, r, u, f"Request {body.status}",
                           f"{r.applicant_name} · {body.notes or r.category}",
                           "warning" if body.status in ("NEEDS_CORRECTION", "BLOCKED", "REJECTED")
                           else "success" if body.status in ("APPROVED", "COMPLETED") else "info")
    db.commit(); kpi_cache.bump_epoch(); db.refresh(r); return out(r)

@router.get("/kpis/summary")
def kpis(response: Response, db: Session = Depends(get_db), u: User = Depends(current_user)):
    scope_key = (u.role, u.zone or "", u.id if u.role in ("consumer", "engineer") else "*")

    def _compute():
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

    payload, hit = kpi_cache.get_or_compute(scope_key, settings.kpi_cache_ttl_seconds, _compute)
    response.headers["X-KPI-Cache"] = "HIT" if hit else "MISS"
    return payload


@router.get("/kpis/executive-analytics")
def executive_analytics(
    response: Response,
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Real database-computed executive dashboard analytics (Item #24).
    Zone-scoped for officers; global across all zones for admin/management."""
    scope_key = ("executive_analytics", u.role, u.zone or "")

    def _compute():
        rows = visible_requests(db, u).all()
        req_ids = [r.id for r in rows]
        now_utc = datetime.now(timezone.utc)

        def _as_utc(dt):
            if dt is None:
                return None
            return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)

        total = len(rows)
        completed = sum(1 for r in rows if r.status == "COMPLETED")
        approved_or_completed = sum(1 for r in rows if r.status in ("APPROVED", "COMPLETED"))
        open_rows = [r for r in rows if r.status not in ("COMPLETED", "REJECTED")]
        needs_correction = sum(1 for r in rows if r.status == "NEEDS_CORRECTION")
        high_sla = sum(1 for r in open_rows if (r.sla_breach_risk or 0.0) >= 0.70)
        total_load_kw = round(sum(float(r.requested_load_kw or 0.0) for r in rows), 2)

        def _is_on_time(r: ConnectionRequest) -> bool:
            if r.status == "COMPLETED":
                return True
            due = _as_utc(r.sla_due_at)
            if due is None:
                return (r.sla_breach_risk or 0.0) < 0.70
            return due >= now_utc

        on_time_count = sum(1 for r in rows if _is_on_time(r))
        sla_compliance_pct = round((on_time_count / total) * 100.0, 1) if total else 100.0
        resolution_rate_pct = round((completed / total) * 100.0, 1) if total else 0.0

        tat_samples = []
        for r in rows:
            c_dt = _as_utc(r.created_at)
            u_dt = _as_utc(r.updated_at)
            if c_dt and u_dt and u_dt >= c_dt:
                tat_samples.append((u_dt - c_dt).total_seconds() / 3600.0)
        avg_tat_hours = round(sum(tat_samples) / len(tat_samples), 2) if tat_samples else 0.0

        if u.role == "admin":
            erp_rows = db.query(ErpSyncLog).all()
            alert_rows = db.query(AlertDispatch).all()
            field_count = db.query(FieldUpdate).count()
            audit_count = db.query(AuditLog).count()
        elif req_ids:
            erp_rows = db.query(ErpSyncLog).filter(ErpSyncLog.request_id.in_(req_ids)).all()
            alert_rows = (
                db.query(AlertDispatch).filter(AlertDispatch.zone == u.zone).all()
                if u.zone
                else []
            )
            field_count = db.query(FieldUpdate).filter(FieldUpdate.request_id.in_(req_ids)).count()
            audit_count = (
                db.query(AuditLog)
                .filter(AuditLog.entity == "request", AuditLog.entity_id.in_(req_ids))
                .count()
            )
        else:
            erp_rows, alert_rows, field_count, audit_count = [], [], 0, 0

        erp_synced = sum(1 for e in erp_rows if e.status == "SYNCED")
        erp_failed = sum(1 for e in erp_rows if e.status == "FAILED")
        erp_sync_pct = round((erp_synced / len(erp_rows)) * 100.0, 1) if erp_rows else 100.0

        zones = sorted({r.zone or "Unassigned" for r in rows})
        by_zone_matrix = []
        for z in zones:
            z_rows = [r for r in rows if (r.zone or "Unassigned") == z]
            z_total = len(z_rows)
            z_comp = sum(1 for r in z_rows if r.status == "COMPLETED")
            z_open = [r for r in z_rows if r.status not in ("COMPLETED", "REJECTED")]
            z_high = sum(1 for r in z_open if (r.sla_breach_risk or 0.0) >= 0.70)
            z_corr = sum(1 for r in z_rows if r.status == "NEEDS_CORRECTION")
            z_ontime = sum(1 for r in z_rows if _is_on_time(r))
            z_sla_pct = round((z_ontime / z_total) * 100.0, 1) if z_total else 100.0
            z_tats = []
            for r in z_rows:
                c_dt, u_dt = _as_utc(r.created_at), _as_utc(r.updated_at)
                if c_dt and u_dt and u_dt >= c_dt:
                    z_tats.append((u_dt - c_dt).total_seconds() / 3600.0)
            by_zone_matrix.append({
                "zone": z,
                "total_requests": z_total,
                "completed": z_comp,
                "pending": len(z_open),
                "high_sla_risk": z_high,
                "needs_correction": z_corr,
                "resolution_pct": round((z_comp / z_total) * 100.0, 1) if z_total else 0.0,
                "sla_compliant_pct": z_sla_pct,
                "avg_tat_hours": round(sum(z_tats) / len(z_tats), 2) if z_tats else 0.0,
                "total_load_kw": round(sum(float(r.requested_load_kw or 0.0) for r in z_rows), 2),
                "compliance_status": "AT_RISK" if (z_high > 0 or z_sla_pct < 90.0) else "COMPLIANT",
            })

        categories = sorted({r.category or "OTHER" for r in rows})
        by_category_chart = [
            {
                "category": cat,
                "count": sum(1 for r in rows if (r.category or "OTHER") == cat),
                "high_risk": sum(
                    1
                    for r in rows
                    if (r.category or "OTHER") == cat and (r.sla_breach_risk or 0.0) >= 0.70
                ),
                "total_load_kw": round(
                    sum(float(r.requested_load_kw or 0.0) for r in rows if (r.category or "OTHER") == cat),
                    2,
                ),
            }
            for cat in categories
        ]

        templates = sorted({r.request_type or "new_connection" for r in rows})
        by_workflow_template = [
            {
                "template_code": tpl_code,
                "count": sum(1 for r in rows if (r.request_type or "new_connection") == tpl_code),
                "total_load_kw": round(
                    sum(
                        float(r.requested_load_kw or 0.0)
                        for r in rows
                        if (r.request_type or "new_connection") == tpl_code
                    ),
                    2,
                ),
            }
            for tpl_code in templates
        ]

        return {
            "generated_at": now_utc.isoformat(),
            "data_provenance": {
                "live_db_backed": [
                    "requests",
                    "zone_sla_matrix",
                    "contracted_load_kw",
                    "erp_sync_health",
                    "field_updates",
                    "alert_dispatches",
                    "audit_events",
                ],
                "simulated_roadmap_streams": [
                    "scada_feeder_telemetry_kv_mw",
                    "historical_billing_atc_loss_curve",
                ],
                "disclosure": (
                    "Operational request, SLA, load, ERP adapter, field-sync, alert, and audit metrics "
                    "are computed live from the database. Grid SCADA feeder telemetry and multi-month "
                    "AT&C billing curves remain clearly labelled simulated reference views."
                ),
            },
            "overview": {
                "total_requests": total,
                "completed_count": completed,
                "approved_or_completed_count": approved_or_completed,
                "pending_count": len(open_rows),
                "needs_correction_count": needs_correction,
                "high_sla_risk_count": high_sla,
                "resolution_rate_pct": resolution_rate_pct,
                "sla_compliance_pct": sla_compliance_pct,
                "total_requested_load_kw": total_load_kw,
                "avg_turnaround_hours": avg_tat_hours,
                "erp_sync_success_pct": erp_sync_pct,
                "erp_failed_queue_count": erp_failed,
                "active_alerts_count": len(alert_rows),
                "field_sync_count": field_count,
                "audit_chain_events": audit_count,
            },
            "by_zone_matrix": by_zone_matrix,
            "by_category_chart": by_category_chart,
            "by_workflow_template": by_workflow_template,
        }

    payload, hit = kpi_cache.get_or_compute(scope_key, settings.kpi_cache_ttl_seconds, _compute)
    response.headers["X-KPI-Cache"] = "HIT" if hit else "MISS"
    return payload

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
    if body.task_status == "COMPLETED":
        record_erp_sync(db, r, u, "METER_COMMISSIONED")
    elif body.task_status == "BLOCKED":
        evaluate_and_dispatch_alerts(db, actor=u, zone_filter=r.zone)
    notify_request_parties(db, r, u, f"Field update: {body.task_status}",
                           f"{r.applicant_name} · {body.notes or 'synced from field app'}", "info")
    try:
        db.commit()
        kpi_cache.bump_epoch()
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

@router.get("/audit/verify")
def audit_verify(db: Session = Depends(get_db), u: User = Depends(require("admin"))):
    """Admin tamper-check over the audit hash chain (audit.py). Read-only; never repairs rows."""
    return verify_chain(db)

@router.get("/audit/logs")
def logs(db: Session = Depends(get_db), u: User = Depends(require("officer","admin"))):
    q = db.query(AuditLog)
    if u.role == "officer":
        visible_ids = visible_requests(db, u).with_entities(ConnectionRequest.id)
        q = q.filter(AuditLog.entity == "request", AuditLog.entity_id.in_(visible_ids))
    return [{"id": x.id, "actor_id": x.actor_id, "actor_role": x.actor_role, "action": x.action,
             "entity_id": x.entity_id, "detail": x.detail, "created_at": x.created_at} for x in q.order_by(AuditLog.created_at.desc()).limit(100)]
