"""Subdivision Zone Validation & Admin Staff Assignment Router (Items #1 & #30).

Solves two paired backlog items:
  - Item #1: Validates `zone` on request intake against registered active `SubdivisionZone`
    records so unknown/typo zones are rejected with HTTP 422 instead of vanishing.
  - Item #30: Provides Admin CRUD to register subdivision zones, onboard/reassign Officers
    and Field Engineers by zone, toggle active duty status, and automatically claim any
    waiting `ROUTED` unassigned requests in a newly staffed zone.
"""
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..audit import audit
from ..db import get_db
from ..deps import current_user, require
from ..models import ConnectionRequest, SubdivisionZone, User
from ..perf import kpi_cache
from ..security import hash_password

router = APIRouter(prefix="/staff", tags=["staff"])

DEFAULT_SUBDIVISION_ZONES: list[tuple[str, str, str]] = [
    ("North", "North Zone — Mehsana & Patan Subdivisions", "Mehsana Circle"),
    ("South", "South Zone — Sabarmati & Gandhinagar Subdivisions", "Sabarmati Circle"),
    ("East", "East Zone — Himmatnagar & Modasa Subdivisions", "Himmatnagar Circle"),
    ("West", "West Zone — Palanpur & Deesa Subdivisions", "Palanpur Circle"),
    ("Central", "Central Zone — Kalol & Vijapur Subdivisions", "Mehsana Circle"),
]

_ZONE_CODE_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_-]{1,31}$")
_STAFF_ROLES = {"officer", "engineer", "admin"}


def ensure_subdivision_zones(db: Session) -> None:
    existing = {z.code.lower() for z in db.query(SubdivisionZone).all()}
    added = False
    for code, display_name, circle_name in DEFAULT_SUBDIVISION_ZONES:
        if code.lower() not in existing:
            db.add(
                SubdivisionZone(
                    code=code,
                    display_name=display_name,
                    circle_name=circle_name,
                    is_active=True,
                )
            )
            added = True
    if added:
        db.flush()


def resolve_active_zone(db: Session, raw_zone: str) -> str:
    """Validate & canonicalize a request/staff zone against active SubdivisionZone rows."""
    ensure_subdivision_zones(db)
    cleaned = (raw_zone or "").strip()
    active_zones = (
        db.query(SubdivisionZone)
        .filter(SubdivisionZone.is_active.is_(True))
        .order_by(SubdivisionZone.created_at.asc(), SubdivisionZone.code.asc())
        .all()
    )
    by_lower = {z.code.lower(): z.code for z in active_zones}
    if not cleaned or cleaned.lower() not in by_lower:
        allowed = [z.code for z in active_zones]
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unknown or inactive service zone {raw_zone!r}. "
                f"Select a valid UGVCL subdivision zone: {', '.join(allowed)}"
            ),
        )
    return by_lower[cleaned.lower()]


def _claim_unassigned_zone_requests(db: Session, staff: User) -> int:
    """When an active officer/engineer joins a zone, auto-assign waiting unassigned requests."""
    if not staff.is_active or not staff.zone:
        return 0
    claimed = 0
    open_rows = (
        db.query(ConnectionRequest)
        .filter(
            ConnectionRequest.zone == staff.zone,
            ConnectionRequest.status.in_(["ROUTED", "ASSIGNED"]),
        )
        .all()
    )
    for r in open_rows:
        changed = False
        if staff.role == "officer" and not r.assigned_officer_id:
            r.assigned_officer_id = staff.id
            changed = True
        elif staff.role == "engineer" and not r.assigned_engineer_id:
            r.assigned_engineer_id = staff.id
            if r.status == "ROUTED":
                r.status = "ASSIGNED"
            changed = True
        if changed:
            claimed += 1
    return claimed


def _staff_out(db: Session, u: User) -> dict:
    if u.role == "officer":
        open_assigned = (
            db.query(func.count(ConnectionRequest.id))
            .filter(
                ConnectionRequest.assigned_officer_id == u.id,
                ConnectionRequest.status.notin_(["COMPLETED", "REJECTED"]),
            )
            .scalar()
            or 0
        )
    elif u.role == "engineer":
        open_assigned = (
            db.query(func.count(ConnectionRequest.id))
            .filter(
                ConnectionRequest.assigned_engineer_id == u.id,
                ConnectionRequest.status.notin_(["COMPLETED", "REJECTED"]),
            )
            .scalar()
            or 0
        )
    else:
        open_assigned = 0
    return {
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "role": u.role,
        "zone": u.zone,
        "is_active": bool(u.is_active),
        "open_assigned_requests": int(open_assigned),
        "created_at": u.created_at,
    }


class ZoneCreateBody(BaseModel):
    code: str = Field(..., min_length=2, max_length=32)
    display_name: str = Field(..., min_length=3, max_length=120)
    circle_name: str = Field("Mehsana Circle", min_length=2, max_length=80)
    is_active: bool = True


class StaffCreateBody(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    name: str = Field(..., min_length=2, max_length=120)
    role: str = Field(..., description="officer | engineer | admin")
    zone: str = Field("North")
    password: str = Field(..., min_length=8, max_length=128)
    is_active: bool = True


class StaffUpdateBody(BaseModel):
    zone: str | None = None
    is_active: bool | None = None
    name: str | None = Field(None, min_length=2, max_length=120)
    claim_unassigned: bool = True


@router.get("/zones")
def list_zones(db: Session = Depends(get_db), u: User = Depends(current_user)):
    ensure_subdivision_zones(db)
    zones = (
        db.query(SubdivisionZone)
        .order_by(SubdivisionZone.created_at.asc(), SubdivisionZone.code.asc())
        .all()
    )
    items = []
    for z in zones:
        if u.role == "consumer" and not z.is_active:
            continue
        active_officers = (
            db.query(func.count(User.id))
            .filter(User.role == "officer", User.zone == z.code, User.is_active.is_(True))
            .scalar()
            or 0
        )
        active_engineers = (
            db.query(func.count(User.id))
            .filter(User.role == "engineer", User.zone == z.code, User.is_active.is_(True))
            .scalar()
            or 0
        )
        unstaffed_routed = (
            db.query(func.count(ConnectionRequest.id))
            .filter(
                ConnectionRequest.zone == z.code,
                ConnectionRequest.status == "ROUTED",
                ConnectionRequest.assigned_officer_id == "",
            )
            .scalar()
            or 0
        )
        items.append(
            {
                "id": z.id,
                "code": z.code,
                "display_name": z.display_name,
                "circle_name": z.circle_name,
                "is_active": bool(z.is_active),
                "active_officers": int(active_officers),
                "active_engineers": int(active_engineers),
                "unstaffed_routed_requests": int(unstaffed_routed) if u.role != "consumer" else 0,
            }
        )
    return {"items": items}


@router.post("/zones", status_code=201)
def create_or_update_zone(
    body: ZoneCreateBody,
    db: Session = Depends(get_db),
    u: User = Depends(require("admin")),
):
    ensure_subdivision_zones(db)
    code = body.code.strip()
    if not _ZONE_CODE_RE.match(code):
        raise HTTPException(
            status_code=422,
            detail="Zone code must start with a letter and contain only letters, digits, '_' or '-'",
        )
    existing = (
        db.query(SubdivisionZone)
        .filter(func.lower(SubdivisionZone.code) == code.lower())
        .first()
    )
    if existing:
        existing.display_name = body.display_name.strip()
        existing.circle_name = body.circle_name.strip()
        existing.is_active = body.is_active
        zone_row = existing
        action = "ZONE_UPDATED"
    else:
        zone_row = SubdivisionZone(
            code=code,
            display_name=body.display_name.strip(),
            circle_name=body.circle_name.strip(),
            is_active=body.is_active,
        )
        db.add(zone_row)
        db.flush()
        action = "ZONE_CREATED"

    audit(
        db,
        u,
        action,
        "staff_assignment",
        zone_row.id,
        f"code={zone_row.code} active={zone_row.is_active}",
    )
    db.commit()
    db.refresh(zone_row)
    return {
        "id": zone_row.id,
        "code": zone_row.code,
        "display_name": zone_row.display_name,
        "circle_name": zone_row.circle_name,
        "is_active": bool(zone_row.is_active),
    }


@router.get("/members")
def list_staff_members(
    db: Session = Depends(get_db),
    _u: User = Depends(require("admin")),
):
    ensure_subdivision_zones(db)
    rows = (
        db.query(User)
        .filter(User.role.in_(["officer", "engineer", "admin"]))
        .order_by(User.role.asc(), User.zone.asc(), User.created_at.asc())
        .all()
    )
    return {"items": [_staff_out(db, row) for row in rows]}


@router.post("/members", status_code=201)
def create_staff_member(
    body: StaffCreateBody,
    db: Session = Depends(get_db),
    u: User = Depends(require("admin")),
):
    role = body.role.strip().lower()
    if role not in _STAFF_ROLES:
        raise HTTPException(422, "Staff role must be officer, engineer, or admin")
    email = body.email.strip().lower()
    if "@" not in email or " " in email:
        raise HTTPException(422, "Valid staff email is required")
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(409, "A user with this email already exists")

    zone_code = resolve_active_zone(db, body.zone)
    staff = User(
        email=email,
        name=body.name.strip(),
        role=role,
        zone=zone_code,
        hashed_password=hash_password(body.password),
        is_active=body.is_active,
    )
    db.add(staff)
    db.flush()
    claimed = _claim_unassigned_zone_requests(db, staff)
    audit(
        db,
        u,
        "STAFF_CREATED",
        "staff_assignment",
        staff.id,
        f"email={staff.email} role={staff.role} zone={staff.zone} claimed={claimed}",
    )
    db.commit()
    if claimed:
        kpi_cache.bump_epoch()
    db.refresh(staff)
    result = _staff_out(db, staff)
    result["claimed_requests"] = claimed
    return result


@router.patch("/members/{user_id}")
def update_staff_member(
    user_id: str,
    body: StaffUpdateBody,
    db: Session = Depends(get_db),
    u: User = Depends(require("admin")),
):
    staff = db.get(User, user_id)
    if not staff or staff.role not in _STAFF_ROLES:
        raise HTTPException(404, "Staff member not found")
    if staff.id == u.id and body.is_active is False:
        raise HTTPException(400, "Administrators cannot deactivate their own active account")

    if body.zone is not None:
        staff.zone = resolve_active_zone(db, body.zone)
    if body.is_active is not None:
        staff.is_active = bool(body.is_active)
    if body.name is not None:
        staff.name = body.name.strip()

    claimed = _claim_unassigned_zone_requests(db, staff) if body.claim_unassigned else 0
    audit(
        db,
        u,
        "STAFF_ASSIGNMENT_UPDATED",
        "staff_assignment",
        staff.id,
        f"role={staff.role} zone={staff.zone} active={staff.is_active} claimed={claimed}",
    )
    db.commit()
    kpi_cache.bump_epoch()
    db.refresh(staff)
    result = _staff_out(db, staff)
    result["claimed_requests"] = claimed
    return result
