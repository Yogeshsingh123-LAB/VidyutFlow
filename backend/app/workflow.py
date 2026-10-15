"""Rule-based workflow (Lite). Temporal/Camunda are roadmap — see docs/ROADMAP.md."""
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from .models import ConnectionRequest, User
from .ml.predict import classify_text, sla_risk

SLA_HOURS = {"CRITICAL": 24, "HIGH": 48, "MEDIUM": 72, "LOW": 120}
PRIORITY = {"CRITICAL": "P1-CRITICAL", "HIGH": "P2-HIGH", "MEDIUM": "P3-NORMAL", "LOW": "P4-LOW"}

def validate(req: ConnectionRequest) -> tuple[bool, list[str]]:
    problems = []
    if not req.applicant_name.strip(): problems.append("Applicant name is missing")
    if len((req.phone or "").strip()) < 10: problems.append("Valid 10-digit phone is required")
    if not req.address.strip(): problems.append("Address is missing")
    if req.requested_load_kw <= 0: problems.append("Requested load must be > 0 kW")
    if req.request_type == "new_connection" and not req.document_name:
        problems.append("Supporting document is required for a new connection")
    return (not problems), problems

def zone_pending(db: Session, zone: str) -> int:
    return db.query(ConnectionRequest).filter(ConnectionRequest.zone == zone,
        ConnectionRequest.status.notin_(["COMPLETED","REJECTED"])).count()

def run_workflow(db: Session, req: ConnectionRequest) -> ConnectionRequest:
    """Validate -> classify -> SLA-risk -> route/assign. No manual re-entry."""
    category, severity = classify_text(f"{req.request_type} {req.description}")
    # A portal-submitted new-connection stays NEW_CONNECTION unless text clearly says otherwise
    if req.request_type == "new_connection" and req.description.strip() == "":
        category = "NEW_CONNECTION"
    req.category, req.severity = category, severity
    req.priority = PRIORITY.get(severity, "P3-NORMAL")
    ok, problems = validate(req)
    req.sla_due_at = datetime.now(timezone.utc) + timedelta(hours=SLA_HOURS.get(severity, 72))
    risk, reasons = sla_risk(req.requested_load_kw, category, severity, bool(req.document_name),
                             zone_pending(db, req.zone), datetime.now(timezone.utc).weekday() >= 5)
    req.sla_breach_risk, req.sla_risk_reasons = risk, json.dumps(reasons)
    if not ok:
        req.status, req.validation_notes = "NEEDS_CORRECTION", "; ".join(problems)
        return req
    req.validation_notes, req.status = "Validated automatically", "ROUTED"
    # Routing rule: zone -> first active officer/engineer in that zone (fallback: any)
    officer = db.query(User).filter(User.role=="officer", User.zone==req.zone).first() or db.query(User).filter(User.role=="officer").first()
    engineer = db.query(User).filter(User.role=="engineer", User.zone==req.zone).first() or db.query(User).filter(User.role=="engineer").first()
    if officer: req.assigned_officer_id = officer.id
    if engineer: req.assigned_engineer_id = engineer.id
    req.status = "ASSIGNED" if engineer else "ROUTED"
    return req
