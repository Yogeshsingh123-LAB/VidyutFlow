"""Server-side notification helpers (alert centre). Rows are per-user and role-scoped;
list/mark-read endpoints enforce ownership. Callers must not notify on failed operations."""
from typing import Iterable, Optional

from sqlalchemy.orm import Session

from .models import ConnectionRequest, Notification, User


def notify(db: Session, user_id: str, title: str, message: str = "",
           kind: str = "info", request_id: str = "") -> Notification:
    n = Notification(user_id=user_id, title=title, message=message[:500],
                     kind=kind if kind in ("info", "warning", "success", "alert") else "info",
                     request_id=request_id or "")
    db.add(n)
    return n


def notify_users(db: Session, user_ids: Iterable[str], title: str, message: str = "",
                 kind: str = "info", request_id: str = "") -> None:
    for uid in {u for u in user_ids if u}:
        notify(db, uid, title, message, kind, request_id)


def notify_zone_officers(db: Session, zone: str, title: str, message: str = "",
                         kind: str = "info", request_id: str = "") -> None:
    officers = db.query(User).filter(User.role == "officer", User.zone == zone).all()
    notify_users(db, [o.id for o in officers], title, message, kind, request_id)


def notify_request_parties(db: Session, request: ConnectionRequest, actor,
                           title: str, message: str = "", kind: str = "info",
                           include_engineer: bool = True) -> None:
    """Notify everyone attached to the request except the actor (consumer + assigned staff)."""
    actor_id = getattr(actor, "id", None)
    targets = {request.consumer_id, request.assigned_officer_id or ""}
    if include_engineer:
        targets.add(request.assigned_engineer_id or "")
    targets.discard(actor_id or "")
    notify_users(db, targets, title, message, kind, request.id)
