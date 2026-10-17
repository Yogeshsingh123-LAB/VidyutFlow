"""Shared request visibility policy; officer zone scope is a prototype assumption."""
from fastapi import HTTPException
from sqlalchemy import false
from .models import ConnectionRequest


def visible_requests(db, user):
    q = db.query(ConnectionRequest)
    if user.role == "admin":
        return q
    if user.role == "consumer":
        return q.filter(ConnectionRequest.consumer_id == user.id)
    if user.role == "engineer":
        return q.filter(ConnectionRequest.assigned_engineer_id == user.id)
    if user.role == "officer" and user.zone and user.zone.strip():
        return q.filter(ConnectionRequest.zone == user.zone)
    return q.filter(false())


def require_request_access(db, user, request):
    if not visible_requests(db, user).filter(ConnectionRequest.id == request.id).first():
        raise HTTPException(403, "Request is outside your access scope")
