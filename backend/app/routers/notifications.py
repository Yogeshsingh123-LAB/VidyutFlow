"""Alert centre API — server-side per-user notifications (outcome: intelligent alerts/tracking).

Ownership model: users see only their own rows (admin may see all for support);
mark-read is owner-or-admin. Rows never cross user scope in responses.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Notification, User
from ..deps import current_user

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


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db), u: User = Depends(current_user)):
    n = _owned(db, u, notification_id)
    n.read = True
    db.commit()
    return out(n)
