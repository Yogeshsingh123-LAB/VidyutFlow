"""REST endpoints for configurable service workflow templates (Item #19)."""
import json
import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ..audit import audit
from ..config import settings
from ..db import get_db
from ..deps import current_user, require
from ..models import User, WorkflowTemplate
from ..perf import workflow_template_cache
from ..workflow_templates import (
    ALLOWED_TEMPLATE_CATEGORIES,
    ALLOWED_TEMPLATE_SEVERITIES,
    ensure_workflow_templates,
    serialize_template,
)

router = APIRouter(prefix="/workflows", tags=["workflows"])

TEMPLATE_CODE_RE = re.compile(r"^[a-z][a-z0-9_]{2,47}$")


class CreateWorkflowTemplateBody(BaseModel):
    template_code: str
    name: str
    description: str = ""
    default_category: str = "NEW_CONNECTION"
    default_severity: str = "MEDIUM"
    sla_hours: int = Field(default=72, ge=1, le=720)
    require_document: bool = True
    require_field_visit: bool = True
    max_auto_load_kw: float = Field(default=100.0, gt=0.0, le=10000.0)
    steps: list[str] = Field(default_factory=lambda: ["SUBMITTED", "OFFICER_APPROVAL", "COMPLETED"])
    is_active: bool = True


class UpdateWorkflowTemplateBody(BaseModel):
    name: str | None = None
    description: str | None = None
    default_category: str | None = None
    default_severity: str | None = None
    sla_hours: int | None = Field(default=None, ge=1, le=720)
    require_document: bool | None = None
    require_field_visit: bool | None = None
    max_auto_load_kw: float | None = Field(default=None, gt=0.0, le=10000.0)
    steps: list[str] | None = None
    is_active: bool | None = None


def _validate_steps(steps: list[str]) -> list[str]:
    cleaned = [s.strip().upper().replace(" ", "_") for s in steps if s and s.strip()]
    if len(cleaned) < 2 or len(cleaned) > 12:
        raise HTTPException(400, "Workflow template must define between 2 and 12 non-empty steps")
    return cleaned


@router.get("/templates")
def list_workflow_templates(
    response: Response,
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    show_inactive = bool(include_inactive and u.role == "admin")

    def _compute():
        ensure_workflow_templates(db)
        db.commit()
        q = db.query(WorkflowTemplate)
        if not show_inactive:
            q = q.filter(WorkflowTemplate.is_active.is_(True))
        rows = q.order_by(WorkflowTemplate.created_at.asc()).all()
        return {
            "engine": "Rule-based configurable template engine (Temporal/Camunda orchestration is roadmap)",
            "items": [serialize_template(r) for r in rows],
        }

    payload, hit = workflow_template_cache.get_or_compute(
        ("include_inactive" if show_inactive else "active_only",),
        settings.kpi_cache_ttl_seconds,
        _compute,
    )
    response.headers["X-Workflow-Cache"] = "HIT" if hit else "MISS"
    return payload


@router.post("/templates", status_code=201)
def create_workflow_template(
    body: CreateWorkflowTemplateBody,
    db: Session = Depends(get_db),
    u: User = Depends(require("admin")),
):
    ensure_workflow_templates(db)
    code = body.template_code.strip().lower()
    if not TEMPLATE_CODE_RE.match(code):
        raise HTTPException(400, "template_code must match ^[a-z][a-z0-9_]{2,47}$")
    if not body.name.strip():
        raise HTTPException(400, "Template name cannot be empty")
    if body.default_category not in ALLOWED_TEMPLATE_CATEGORIES:
        raise HTTPException(400, f"default_category must be one of {sorted(ALLOWED_TEMPLATE_CATEGORIES)}")
    if body.default_severity not in ALLOWED_TEMPLATE_SEVERITIES:
        raise HTTPException(400, f"default_severity must be one of {sorted(ALLOWED_TEMPLATE_SEVERITIES)}")
    if db.query(WorkflowTemplate).filter(WorkflowTemplate.template_code == code).first():
        raise HTTPException(409, f"Workflow template '{code}' already exists")
    steps = _validate_steps(body.steps)

    row = WorkflowTemplate(
        template_code=code,
        name=body.name.strip(),
        description=body.description.strip(),
        default_category=body.default_category,
        default_severity=body.default_severity,
        sla_hours=body.sla_hours,
        require_document=body.require_document,
        require_field_visit=body.require_field_visit,
        max_auto_load_kw=body.max_auto_load_kw,
        steps_json=json.dumps(steps),
        is_active=body.is_active,
    )
    db.add(row)
    db.flush()
    audit(
        db,
        u,
        "WORKFLOW_TEMPLATE_CREATED",
        "workflow_template",
        row.template_code,
        f"sla={row.sla_hours}h doc={row.require_document} field={row.require_field_visit} max_kw={row.max_auto_load_kw:g}",
    )
    db.commit()
    workflow_template_cache.bump_epoch()
    db.refresh(row)
    return serialize_template(row)


@router.patch("/templates/{template_code}")
def update_workflow_template(
    template_code: str,
    body: UpdateWorkflowTemplateBody,
    db: Session = Depends(get_db),
    u: User = Depends(require("admin")),
):
    ensure_workflow_templates(db)
    code = template_code.strip().lower()
    row = db.query(WorkflowTemplate).filter(WorkflowTemplate.template_code == code).first()
    if not row:
        raise HTTPException(404, f"Workflow template '{code}' not found")

    if body.is_active is False and code == "new_connection":
        raise HTTPException(400, "Default 'new_connection' workflow template cannot be deactivated")
    if body.name is not None:
        if not body.name.strip():
            raise HTTPException(400, "Template name cannot be empty")
        row.name = body.name.strip()
    if body.description is not None:
        row.description = body.description.strip()
    if body.default_category is not None:
        if body.default_category not in ALLOWED_TEMPLATE_CATEGORIES:
            raise HTTPException(400, f"default_category must be one of {sorted(ALLOWED_TEMPLATE_CATEGORIES)}")
        row.default_category = body.default_category
    if body.default_severity is not None:
        if body.default_severity not in ALLOWED_TEMPLATE_SEVERITIES:
            raise HTTPException(400, f"default_severity must be one of {sorted(ALLOWED_TEMPLATE_SEVERITIES)}")
        row.default_severity = body.default_severity
    if body.sla_hours is not None:
        row.sla_hours = body.sla_hours
    if body.require_document is not None:
        row.require_document = body.require_document
    if body.require_field_visit is not None:
        row.require_field_visit = body.require_field_visit
    if body.max_auto_load_kw is not None:
        row.max_auto_load_kw = body.max_auto_load_kw
    if body.steps is not None:
        row.steps_json = json.dumps(_validate_steps(body.steps))
    if body.is_active is not None:
        row.is_active = body.is_active

    row.updated_at = datetime.now(timezone.utc)
    audit(
        db,
        u,
        "WORKFLOW_TEMPLATE_UPDATED",
        "workflow_template",
        row.template_code,
        f"sla={row.sla_hours}h doc={row.require_document} field={row.require_field_visit} max_kw={row.max_auto_load_kw:g} active={row.is_active}",
    )
    db.commit()
    workflow_template_cache.bump_epoch()
    db.refresh(row)
    return serialize_template(row)
