"""Alert centre API — server-side per-user notifications (outcome: intelligent alerts/tracking).

Ownership model: users see only their own rows (admin may see all for support);
mark-read is owner-or-admin. Rows never cross user scope in responses.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..alerts import (
    ALERT_CHANNEL_DISCLOSURE,
    evaluate_and_dispatch_alerts,
    serialize_alert_dispatch,
)
from ..config import settings
from ..db import get_db
from ..models import AlertDispatch, Notification, User
from ..deps import current_user, require
from ..perf import kpi_cache

router = APIRouter(prefix="/notifications", tags=["notifications"])


def out(n: Notification):
    return {"id": n.id, "title": n.title, "message": n.message, "kind": n.kind,
            "request_id": n.request_id, "read": n.read, "created_at": n.created_at}


def _owned(db: Session, user: User, notification_id: str) -> Notification:
    n = db.get(Notification, notification_id)
    if not n:
        raise HTTPException(404, "Notification not found")
    if user.role != "admin" and n.user_id != user.id:
        raise HTTPException(403, "This notification belongs to another user")
    return n


@router.get("")
def list_notifications(db: Session = Depends(get_db), u: User = Depends(current_user)):
    q = db.query(Notification)
    if u.role != "admin":
        q = q.filter(Notification.user_id == u.id)
    rows = q.order_by(Notification.created_at.desc()).limit(50).all()
    unread = sum(1 for n in rows if not n.read)
    return {"unread": unread, "items": [out(n) for n in rows]}


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), u: User = Depends(current_user)):
    q = db.query(Notification).filter(Notification.user_id == u.id, Notification.read.is_(False))
    count = q.update({"read": True}, synchronize_session=False)
    db.commit()
    return {"marked_read": count}


class AlertEvaluateBody(BaseModel):
    sla_risk_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0, allow_inf_nan=False)
    unassigned_hours: Optional[float] = Field(default=None, ge=0.0, le=720.0, allow_inf_nan=False)
    zone_failure_threshold: Optional[int] = Field(default=None, ge=1, le=100)


@router.get("/alerts/dispatches")
def list_alert_dispatches(
    channel: str = Query("ALL", description="ALL, SIMULATED_SMS, SIMULATED_EMAIL, or IN_APP"),
    rule_code: str = Query("ALL", description="ALL, SLA_BREACH_RISK, UNASSIGNED_STALE, or REPEATED_ZONE_FAILURES"),
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Inspect simulated SMS/Email and in-app alert dispatches (zone-scoped for officers)."""
    norm_channel = (channel or "ALL").strip().upper()
    if norm_channel not in ("ALL", "SIMULATED_SMS", "SIMULATED_EMAIL", "IN_APP"):
        raise HTTPException(400, "Invalid channel filter")

    norm_rule = (rule_code or "ALL").strip().upper()
    if norm_rule not in ("ALL", "SLA_BREACH_RISK", "UNASSIGNED_STALE", "REPEATED_ZONE_FAILURES"):
        raise HTTPException(400, "Invalid rule_code filter")

    if u.role == "officer" and not (u.zone or "").strip():
        all_rows: list[AlertDispatch] = []
    else:
        q = db.query(AlertDispatch)
        if u.role == "officer":
            q = q.filter(AlertDispatch.zone == u.zone)
        all_rows = q.order_by(AlertDispatch.created_at.desc()).limit(300).all()

    by_rule: dict[str, int] = {}
    for row in all_rows:
        by_rule[row.rule_code] = by_rule.get(row.rule_code, 0) + 1

    filtered = [
        row
        for row in all_rows
        if (norm_channel == "ALL" or row.channel == norm_channel)
        and (norm_rule == "ALL" or row.rule_code == norm_rule)
    ]

    return {
        "is_simulated": True,
        "disclosure": ALERT_CHANNEL_DISCLOSURE,
        "thresholds": {
            "sla_risk_threshold": settings.alert_sla_risk_threshold,
            "unassigned_hours": settings.alert_unassigned_hours,
            "zone_failure_threshold": settings.alert_zone_failure_threshold,
        },
        "summary": {
            "total": len(all_rows),
            "simulated_sms": sum(1 for r in all_rows if r.channel == "SIMULATED_SMS"),
            "simulated_email": sum(1 for r in all_rows if r.channel == "SIMULATED_EMAIL"),
            "in_app": sum(1 for r in all_rows if r.channel == "IN_APP"),
            "by_rule": by_rule,
        },
        "items": [serialize_alert_dispatch(r) for r in filtered],
    }


@router.post("/alerts/evaluate")
def run_alert_evaluation(
    body: AlertEvaluateBody = AlertEvaluateBody(),
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Run deterministic alert sweep (SLA breach risk, unassigned > Xh, repeated zone failures)."""
    zone_filter = u.zone if u.role == "officer" else None
    created = evaluate_and_dispatch_alerts(
        db,
        actor=u,
        zone_filter=zone_filter,
        sla_risk_threshold=body.sla_risk_threshold,
        unassigned_hours=body.unassigned_hours,
        zone_failure_threshold=body.zone_failure_threshold,
    )
    db.commit()
    if created:
        kpi_cache.bump_epoch()
    for row in created:
        db.refresh(row)

    by_rule: dict[str, int] = {}
    for row in created:
        by_rule[row.rule_code] = by_rule.get(row.rule_code, 0) + 1

    return {
        "is_simulated": True,
        "disclosure": ALERT_CHANNEL_DISCLOSURE,
        "newly_dispatched": len(created),
        "by_rule": by_rule,
        "items": [serialize_alert_dispatch(r) for r in created],
    }


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db), u: User = Depends(current_user)):
    n = _owned(db, u, notification_id)
    n.read = True
    db.commit()
    return out(n)
