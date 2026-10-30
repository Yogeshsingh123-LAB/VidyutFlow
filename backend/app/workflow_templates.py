"""Configurable workflow template registry & helper functions (Item #19).

Drives validation (`require_document`, `max_auto_load_kw`), default triage
(`default_category`, `default_severity`), target `sla_hours`, and field
engineer auto-dispatch (`require_field_visit`) in `workflow.py`.
"""
import json
from fastapi import HTTPException
from sqlalchemy.orm import Session
from .config import settings
from .models import WorkflowTemplate

ALLOWED_TEMPLATE_CATEGORIES = {"NEW_CONNECTION", "OUTAGE", "BILLING", "METER_FAULT", "SAFETY", "OTHER"}
ALLOWED_TEMPLATE_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}

DEFAULT_WORKFLOW_TEMPLATES: list[dict] = [
    {
        "template_code": "new_connection",
        "name": "New Electricity Connection",
        "description": "End-to-end domestic, commercial, or agricultural supply sanction with mandatory document check and site survey.",
        "default_category": "NEW_CONNECTION",
        "default_severity": "MEDIUM",
        "sla_hours": 72,
        "require_document": True,
        "require_field_visit": True,
        "max_auto_load_kw": 100.0,
        "steps": [
            "SUBMITTED",
            "DOCUMENT_CHECK",
            "FIELD_SURVEY",
            "OFFICER_APPROVAL",
            "METER_COMMISSIONING",
            "COMPLETED",
        ],
    },
    {
        "template_code": "load_extension",
        "name": "Load Extension / Reduction",
        "description": "Contracted kW enhancement or reduction with feeder capacity screening, field feasibility check, and officer sanction.",
        "default_category": "NEW_CONNECTION",
        "default_severity": "MEDIUM",
        "sla_hours": 48,
        "require_document": True,
        "require_field_visit": True,
        "max_auto_load_kw": 100.0,
        "steps": [
            "SUBMITTED",
            "LOAD_CAPACITY_CHECK",
            "FIELD_FEASIBILITY",
            "OFFICER_APPROVAL",
            "TARIFF_UPDATE",
            "COMPLETED",
        ],
    },
    {
        "template_code": "meter_replacement",
        "name": "Faulty / Smart Meter Replacement",
        "description": "Burnt, stuck, or smart-meter upgrade workflow — dispatches zone engineer without requiring ownership deed upload.",
        "default_category": "METER_FAULT",
        "default_severity": "MEDIUM",
        "sla_hours": 48,
        "require_document": False,
        "require_field_visit": True,
        "max_auto_load_kw": 100.0,
        "steps": [
            "SUBMITTED",
            "METER_DIAGNOSTIC",
            "ENGINEER_DISPATCH",
            "SEAL_AND_REPLACE",
            "OFFICER_CLOSURE",
            "COMPLETED",
        ],
    },
    {
        "template_code": "billing_dispute",
        "name": "Billing & Tariff Verification",
        "description": "Desk-only tariff slab & ledger audit routed directly to subdivision officer without field truck roll.",
        "default_category": "BILLING",
        "default_severity": "LOW",
        "sla_hours": 96,
        "require_document": False,
        "require_field_visit": False,
        "max_auto_load_kw": 100.0,
        "steps": [
            "SUBMITTED",
            "LEDGER_AUDIT",
            "SLAB_RECALCULATION",
            "OFFICER_DECISION",
            "COMPLETED",
        ],
    },
    {
        "template_code": "outage_safety",
        "name": "Outage & Line Safety Escalation",
        "description": "Fast-track 24h emergency workflow for snapped conductors, transformer sparking, or feeder outages.",
        "default_category": "SAFETY",
        "default_severity": "CRITICAL",
        "sla_hours": 24,
        "require_document": False,
        "require_field_visit": True,
        "max_auto_load_kw": 100.0,
        "steps": [
            "SUBMITTED",
            "EMERGENCY_TRIAGE",
            "RAPID_FIELD_CREW",
            "ISOLATION_AND_REPAIR",
            "OFFICER_SIGN_OFF",
            "COMPLETED",
        ],
    },
]


def ensure_workflow_templates(db: Session) -> None:
    """Seed canonical service workflow templates idempotently if missing."""
    existing = {row.template_code for row in db.query(WorkflowTemplate.template_code).all()}
    added = False
    for spec in DEFAULT_WORKFLOW_TEMPLATES:
        if spec["template_code"] not in existing:
            db.add(
                WorkflowTemplate(
                    template_code=spec["template_code"],
                    name=spec["name"],
                    description=spec["description"],
                    default_category=spec["default_category"],
                    default_severity=spec["default_severity"],
                    sla_hours=int(spec["sla_hours"]),
                    require_document=bool(spec["require_document"]),
                    require_field_visit=bool(spec["require_field_visit"]),
                    max_auto_load_kw=float(spec["max_auto_load_kw"]),
                    steps_json=json.dumps(spec["steps"]),
                    is_active=True,
                )
            )
            added = True
    if added:
        db.flush()


def get_template_or_none(db: Session | None, template_code: str) -> WorkflowTemplate | None:
    if db is None:
        return None
    ensure_workflow_templates(db)
    code = (template_code or "new_connection").strip().lower()
    return db.query(WorkflowTemplate).filter(WorkflowTemplate.template_code == code).first()


def resolve_active_template(db: Session, template_code: str) -> WorkflowTemplate:
    ensure_workflow_templates(db)
    code = (template_code or "new_connection").strip().lower()
    tpl = db.query(WorkflowTemplate).filter(WorkflowTemplate.template_code == code).first()
    if not tpl or not tpl.is_active:
        active_codes = sorted(
            r.template_code
            for r in db.query(WorkflowTemplate).filter(WorkflowTemplate.is_active.is_(True)).all()
        )
        raise HTTPException(
            status_code=400,
            detail=f"Workflow template '{template_code}' is unknown or inactive; allowed active templates: {active_codes}",
        )
    return tpl


def serialize_template(row: WorkflowTemplate) -> dict:
    try:
        steps = json.loads(row.steps_json or "[]")
    except Exception:
        steps = []
    return {
        "id": row.id,
        "template_code": row.template_code,
        "name": row.name,
        "description": row.description,
        "default_category": row.default_category,
        "default_severity": row.default_severity,
        "sla_hours": row.sla_hours,
        "require_document": row.require_document,
        "require_field_visit": row.require_field_visit,
        "max_auto_load_kw": row.max_auto_load_kw,
        "steps": steps,
        "is_active": row.is_active,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
