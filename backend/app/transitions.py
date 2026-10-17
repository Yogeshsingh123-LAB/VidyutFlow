"""Prototype lifecycle policy, not an official UGVCL SOP.

Role/scope checks belong to the endpoint and run BEFORE this policy.
Terminal requests cannot be edited or reopened through ordinary status/sync APIs.
"""
from fastapi import HTTPException
from .models import ConnectionRequest, now

TRANSITIONS = {
    'SUBMITTED': {'NEEDS_CORRECTION', 'ASSIGNED', 'REJECTED'},
    'NEEDS_CORRECTION': {'ASSIGNED', 'REJECTED'},
    'ROUTED': {'ASSIGNED', 'APPROVED', 'REJECTED', 'NEEDS_CORRECTION'},
    'ASSIGNED': {'IN_PROGRESS', 'FIELD_VERIFIED', 'APPROVED', 'COMPLETED',
                 'REJECTED', 'NEEDS_CORRECTION', 'BLOCKED'},
    'IN_PROGRESS': {'FIELD_VERIFIED', 'APPROVED', 'COMPLETED', 'REJECTED',
                    'NEEDS_CORRECTION', 'BLOCKED'},
    'FIELD_VERIFIED': {'APPROVED', 'COMPLETED', 'REJECTED', 'NEEDS_CORRECTION', 'BLOCKED'},
    'APPROVED': {'IN_PROGRESS', 'FIELD_VERIFIED', 'COMPLETED', 'BLOCKED'},
    'BLOCKED': {'IN_PROGRESS', 'FIELD_VERIFIED', 'COMPLETED', 'REJECTED', 'NEEDS_CORRECTION'},
    'COMPLETED': set(),
    'REJECTED': set(),
}
TERMINAL = {'COMPLETED', 'REJECTED'}


def validate_transition(current, target):
    if current in TERMINAL:
        raise HTTPException(409, f'Request is {current}; no further updates are allowed')
    if current not in TRANSITIONS or (target != current and target not in TRANSITIONS[current]):
        raise HTTPException(409, f'Transition {current} -> {target} is not allowed')


def apply_transition(db, request, target, **changes):
    """Atomic compare-and-swap: reject a stale DB snapshot instead of overwriting it.

    updated_at also guards same-status writes. Transaction includes caller's audit/sync rows.
    """
    validate_transition(request.status, target)
    changed = db.query(ConnectionRequest).filter(
        ConnectionRequest.id == request.id,
        ConnectionRequest.status == request.status,
        ConnectionRequest.updated_at == request.updated_at,
    ).update({**changes, 'status': target, 'updated_at': now()}, synchronize_session=False)
    if changed != 1:
        db.rollback()
        raise HTTPException(409, 'Request changed while updating; refresh and review before retrying')
    db.refresh(request)
