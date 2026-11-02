"""Rule-based workflow driven by configurable WorkflowTemplates (Item #19).
Temporal/Camunda distributed orchestration remains roadmap — see docs/ROADMAP.md."""
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from .models import ConnectionRequest, User, WorkflowTemplate
from .config import settings
from .ml.predict import classify_text, sla_risk
from .workflow_templates import get_template_or_none

SLA_HOURS = {"CRITICAL": 24, "HIGH": 48, "MEDIUM": 72, "LOW": 120}
PRIORITY = {"CRITICAL": "P1-CRITICAL", "HIGH": "P2-HIGH", "MEDIUM": "P3-NORMAL", "LOW": "P4-LOW"}


def _effective_load_threshold(tpl: WorkflowTemplate | None) -> float:
    if tpl is not None:
        return min(float(settings.demo_load_review_threshold_kw), float(tpl.max_auto_load_kw))
    return float(settings.demo_load_review_threshold_kw)


def validation_issues(req: ConnectionRequest, tpl: WorkflowTemplate | None = None) -> list[dict]:
    """Structured reasons for a submission, parameterized by active WorkflowTemplate."""
    issues = []
    if not req.applicant_name.strip():
        issues.append({"code": "APPLICANT_NAME_REQUIRED", "message": "Applicant name is missing"})
    phone = (req.phone or "").strip()
    if len(phone) != 10 or not phone.isascii() or not phone.isdigit():
        issues.append({"code": "PHONE_INVALID", "message": "Valid 10-digit phone is required"})
    if not req.address.strip():
        issues.append({"code": "ADDRESS_REQUIRED", "message": "Address is missing"})
    threshold = _effective_load_threshold(tpl)
    if req.requested_load_kw <= 0:
        issues.append({"code": "LOAD_NONPOSITIVE", "message": "Requested load must be > 0 kW"})
    elif req.requested_load_kw > threshold:
        issues.append({
            "code": "DEMO_LOAD_REVIEW",
            "threshold_kw": threshold,
            "message": f"Requested load exceeds the demo review threshold of {threshold:g} kW; manual review required (not an official UGVCL limit)",
        })
    requires_doc = tpl.require_document if tpl is not None else (req.request_type == "new_connection")
    if requires_doc and not req.document_name:
        label = tpl.name if tpl is not None and tpl.template_code != "new_connection" else "a new connection"
        issues.append({
            "code": "DOCUMENT_REQUIRED",
            "message": f"Supporting document is required for {label}",
        })
    return issues


def validate(req: ConnectionRequest, tpl: WorkflowTemplate | None = None) -> tuple[bool, list[str]]:
    issues = validation_issues(req, tpl)
    return not issues, [issue["message"] for issue in issues]


def zone_pending(db: Session, zone: str) -> int:
    return db.query(ConnectionRequest).filter(
        ConnectionRequest.zone == zone,
        ConnectionRequest.status.notin_(["COMPLETED", "REJECTED"]),
    ).count()


def run_workflow(db: Session, req: ConnectionRequest) -> ConnectionRequest:
    """Validate -> classify -> SLA-risk -> route/assign using configurable WorkflowTemplate."""
    tpl = get_template_or_none(db, req.request_type)
    if tpl is not None:
        req.request_type = tpl.template_code

    category, severity = classify_text(f"{req.request_type} {req.description}")
    if req.description.strip() == "":
        if tpl is not None:
            category, severity = tpl.default_category, tpl.default_severity
        elif req.request_type == "new_connection":
            category = "NEW_CONNECTION"
    elif tpl is not None and tpl.template_code != "new_connection":
        # Respect emergency ML hazard signals (CRITICAL/HIGH), otherwise apply template domain defaults
        if severity not in ("CRITICAL", "HIGH") and category in ("OTHER", "NEW_CONNECTION"):
            category = tpl.default_category
            severity = tpl.default_severity

    req.category, req.severity = category, severity
    req.priority = PRIORITY.get(severity, "P3-NORMAL")

    issues = validation_issues(req, tpl)
    req.validation_issues_json = json.dumps(issues, ensure_ascii=False)
    ok, problems = not issues, [issue["message"] for issue in issues]

    base_sla_hours = int(tpl.sla_hours) if tpl is not None else SLA_HOURS.get(severity, 72)
    effective_sla_hours = min(base_sla_hours, 24) if severity == "CRITICAL" else base_sla_hours
    req.sla_due_at = datetime.now(timezone.utc) + timedelta(hours=effective_sla_hours)

    # Keep out-of-range values out of the model; preserve the original for review.
    cap_kw = _effective_load_threshold(tpl)
    model_load = min(max(req.requested_load_kw, 0.0), cap_kw)
    risk, reasons = sla_risk(
        model_load,
        category,
        severity,
        bool(req.document_name),
        zone_pending(db, req.zone),
        datetime.now(timezone.utc).weekday() >= 5,
    )
    if model_load != req.requested_load_kw:
        from .ml.governance import governance_monitor
        governance_monitor.record_ood_capped_input()
        reasons.insert(
            0,
            f"Demo risk estimate uses a capped load of {model_load:g} kW, not the submitted value; manual review required",
        )
    req.sla_breach_risk, req.sla_risk_reasons = risk, json.dumps(reasons)

    if not ok:
        req.status, req.validation_notes = "NEEDS_CORRECTION", "; ".join(problems)
        return req

    req.validation_notes, req.status = "Validated automatically", "ROUTED"
    # Route only to active staff in the same zone; deterministic creation-order selection.
    officer = (
        db.query(User)
        .filter(User.role == "officer", User.zone == req.zone, User.is_active.is_(True))
        .order_by(User.created_at.asc(), User.id.asc())
        .first()
    )
    if officer:
        req.assigned_officer_id = officer.id

    require_field = tpl.require_field_visit if tpl is not None else True
    if require_field:
        engineer = (
            db.query(User)
            .filter(User.role == "engineer", User.zone == req.zone, User.is_active.is_(True))
            .order_by(User.created_at.asc(), User.id.asc())
            .first()
        )
        if engineer:
            req.assigned_engineer_id = engineer.id
        req.status = "ASSIGNED" if engineer else "ROUTED"
    else:
        req.assigned_engineer_id = ""
        req.status = "ROUTED"
    return req
