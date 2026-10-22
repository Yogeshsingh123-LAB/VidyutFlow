"""Append-only audit log with tamper-evident hash chain.

Every row's `entry_hash` is sha256 over its own fields plus the previous row's hash,
so editing, deleting or reordering any chained row breaks verification
(GET /requests/audit/verify). Rows written before the chain upgrade keep an empty
`entry_hash` and are reported as `legacy_skipped` — never silently treated as valid.
"""
import hashlib
from datetime import timezone
from typing import Optional

from sqlalchemy.orm import Session

from .models import AuditLog, now


def _entry_hash(prev_hash: str, *, row_id: str, actor_id: str, actor_role: str,
                action: str, entity: str, entity_id: str, detail: str,
                created_at_iso: str) -> str:
    payload = "\x1f".join([prev_hash or "", row_id, actor_id, actor_role,
                           action, entity or "", entity_id or "", detail or "",
                           created_at_iso])
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _iso(value) -> str:
    # Canonical rendering: SQLite returns naive UTC datetimes while Python-side values are
    # timezone-aware — both must hash identically. Canonical = naive UTC, microseconds preserved.
    if hasattr(value, "astimezone"):
        if getattr(value, "tzinfo", None) is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value.isoformat()
    return str(value)


def audit(db: Session, actor, action: str, entity: str = "", entity_id: str = "", detail: str = ""):
    """Append one chained audit row. Call before the caller's db.commit()."""
    last: Optional[AuditLog] = db.query(AuditLog).order_by(
        AuditLog.created_at.desc(), AuditLog.id.desc()).first()
    prev = (last.entry_hash if last and last.entry_hash else "")
    row = AuditLog(
        actor_id=getattr(actor, "id", "system"),
        actor_role=getattr(actor, "role", "system"),
        action=action, entity=entity, entity_id=entity_id,
        detail=str(detail)[:2000], prev_hash=prev,
    )
    db.add(row)
    db.flush()  # assigns id + created_at, both of which the hash commits to
    # Same-microsecond collision with the previous row would reorder the verify walk;
    # nudge forward so (created_at, id) append order stays strictly increasing.
    if last is not None and _iso(last.created_at) == _iso(row.created_at):
        from datetime import timedelta
        row.created_at = row.created_at + timedelta(microseconds=1)
    row.entry_hash = _entry_hash(
        prev, row_id=row.id, actor_id=row.actor_id, actor_role=row.actor_role,
        action=row.action, entity=row.entity, entity_id=row.entity_id,
        detail=row.detail, created_at_iso=_iso(row.created_at))
    return row


def verify_chain(db: Session) -> dict:
    """Walk the chain oldest-first and validate every link.

    Returns {"ok": bool, "checked": chained rows verified, "legacy_skipped": pre-chain rows,
    "last_entry_hash": hash to pin externally, "broken_at": id of first invalid row (if any)}.
    """
    rows = db.query(AuditLog).order_by(AuditLog.created_at.asc(), AuditLog.id.asc()).all()
    prev = ""
    checked = legacy = 0
    for row in rows:
        if not row.entry_hash:
            legacy += 1  # pre-upgrade row: unverifiable, reported, never counted as valid
            continue
        expected = _entry_hash(
            row.prev_hash or "", row_id=row.id, actor_id=row.actor_id,
            actor_role=row.actor_role, action=row.action, entity=row.entity,
            entity_id=row.entity_id, detail=row.detail,
            created_at_iso=_iso(row.created_at))
        if (row.prev_hash or "") != prev or row.entry_hash != expected:
            return {"ok": False, "checked": checked, "legacy_skipped": legacy,
                    "last_entry_hash": prev, "broken_at": row.id}
        prev = row.entry_hash
        checked += 1
    return {"ok": True, "checked": checked, "legacy_skipped": legacy,
            "last_entry_hash": prev, "broken_at": None}
