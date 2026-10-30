"""Append-only audit log with serialized, fork-proof tamper-evident hash chain (Item #4).

Every row's `entry_hash` is sha256 over its own fields plus the previous row's hash,
so editing, deleting or reordering any chained row breaks verification
(GET /requests/audit/verify). Rows written before the chain upgrade keep an empty
`entry_hash` (`chain_seq == None`) and are reported as `legacy_skipped`.

Concurrency guarantee (Item #4):
  1. In-process transaction-scoped `_AUDIT_TX_LOCK` is held from the first `audit(db, ...)`
     call on a `Session` until that `Session` commits, rolls back, or closes — preventing
     concurrent threads from reading the same `prev_hash` before `db.commit()`.
  2. Database-level `AuditChainHead` (`SELECT ... FOR UPDATE` on PostgreSQL) + unique
     monotonic `AuditLog.chain_seq` (`UNIQUE`) guarantee that multi-process workers can
     never commit two rows pointing at the same chain tip.
"""
import hashlib
import threading
from datetime import timedelta, timezone
from typing import Optional

from sqlalchemy import event
from sqlalchemy.orm import Session

from .models import AuditChainHead, AuditLog

_AUDIT_TX_LOCK = threading.RLock()
_LOCK_KEY = "_vidyutflow_holds_audit_chain_lock"


def _release_session_audit_lock(session: Session) -> None:
    if session.info.pop(_LOCK_KEY, False):
        try:
            _AUDIT_TX_LOCK.release()
        except RuntimeError:
            pass


@event.listens_for(Session, "after_commit")
def _on_after_commit(session: Session) -> None:
    _release_session_audit_lock(session)


@event.listens_for(Session, "after_rollback")
def _on_after_rollback(session: Session) -> None:
    _release_session_audit_lock(session)


@event.listens_for(Session, "after_soft_rollback")
def _on_after_soft_rollback(session: Session, _previous_transaction) -> None:
    if not session.in_transaction():
        _release_session_audit_lock(session)


@event.listens_for(Session, "after_transaction_end")
def _on_after_transaction_end(session: Session, _transaction) -> None:
    if not session.in_transaction():
        _release_session_audit_lock(session)


def _entry_hash(
    prev_hash: str,
    *,
    row_id: str,
    actor_id: str,
    actor_role: str,
    action: str,
    entity: str,
    entity_id: str,
    detail: str,
    created_at_iso: str,
) -> str:
    payload = "\x1f".join(
        [
            prev_hash or "",
            row_id,
            actor_id,
            actor_role,
            action,
            entity or "",
            entity_id or "",
            detail or "",
            created_at_iso,
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _iso(value) -> str:
    # Canonical rendering: SQLite returns naive UTC datetimes while Python-side values are
    # timezone-aware — both must hash identically. Canonical = naive UTC, microseconds preserved.
    if hasattr(value, "astimezone"):
        if getattr(value, "tzinfo", None) is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value.isoformat()
    return str(value)


def _lock_chain_head(db: Session) -> AuditChainHead:
    dialect = db.bind.dialect.name if db.bind is not None else "sqlite"
    q = db.query(AuditChainHead).filter(AuditChainHead.id == 1)
    if dialect == "postgresql":
        q = q.with_for_update()
    head = q.first()
    if head is None:
        head = AuditChainHead(id=1, last_seq=0, last_hash="")
        db.add(head)
        db.flush()
    return head


def audit(
    db: Session,
    actor,
    action: str,
    entity: str = "",
    entity_id: str = "",
    detail: str = "",
):
    """Append one chained audit row. Serialized across concurrent writers until `db.commit()`."""
    if not db.info.get(_LOCK_KEY):
        _AUDIT_TX_LOCK.acquire()
        db.info[_LOCK_KEY] = True

    try:
        head = _lock_chain_head(db)
        last: Optional[AuditLog] = (
            db.query(AuditLog)
            .filter(AuditLog.entry_hash != "")
            .order_by(AuditLog.chain_seq.desc().nullslast(), AuditLog.created_at.desc(), AuditLog.id.desc())
            .first()
        )
        prev = last.entry_hash if last and last.entry_hash else ""
        if last is not None and last.chain_seq is not None:
            next_seq = int(last.chain_seq) + 1
        else:
            # Handle tables with chained rows created prior to chain_seq column migration
            chained_count = db.query(AuditLog).filter(AuditLog.entry_hash != "").count()
            next_seq = max(int(head.last_seq or 0), chained_count) + 1

        row = AuditLog(
            actor_id=getattr(actor, "id", "system"),
            actor_role=getattr(actor, "role", "system"),
            action=action,
            entity=entity,
            entity_id=entity_id,
            detail=str(detail)[:2000],
            chain_seq=next_seq,
            prev_hash=prev,
        )
        db.add(row)
        db.flush()  # assigns id + created_at, both of which the hash commits to
        # Ensure strictly monotonic created_at relative to predecessor so verify walk order is deterministic
        if last is not None and _iso(row.created_at) <= _iso(last.created_at):
            base_dt = last.created_at
            if getattr(base_dt, "tzinfo", None) is None:
                base_dt = base_dt.replace(tzinfo=timezone.utc)
            row.created_at = base_dt + timedelta(microseconds=1)
        row.entry_hash = _entry_hash(
            prev,
            row_id=row.id,
            actor_id=row.actor_id,
            actor_role=row.actor_role,
            action=row.action,
            entity=row.entity,
            entity_id=row.entity_id,
            detail=row.detail,
            created_at_iso=_iso(row.created_at),
        )
        head.last_seq = next_seq
        head.last_hash = row.entry_hash
        db.flush()
        return row
    except Exception:
        # If audit() itself fails before commit/rollback, release lock on rollback
        raise


def verify_chain(db: Session) -> dict:
    """Walk the chain oldest-first and validate every link + monotonic sequence."""
    rows = db.query(AuditLog).order_by(AuditLog.created_at.asc(), AuditLog.id.asc()).all()
    prev = ""
    checked = legacy = 0
    seen_seqs: set[int] = set()
    for row in rows:
        if not row.entry_hash:
            legacy += 1  # pre-upgrade row: unverifiable, reported, never counted as valid
            continue
        if row.chain_seq is not None:
            if row.chain_seq in seen_seqs:
                return {
                    "ok": False,
                    "checked": checked,
                    "legacy_skipped": legacy,
                    "last_entry_hash": prev,
                    "broken_at": row.id,
                }
            seen_seqs.add(row.chain_seq)
        expected = _entry_hash(
            row.prev_hash or "",
            row_id=row.id,
            actor_id=row.actor_id,
            actor_role=row.actor_role,
            action=row.action,
            entity=row.entity,
            entity_id=row.entity_id,
            detail=row.detail,
            created_at_iso=_iso(row.created_at),
        )
        if (row.prev_hash or "") != prev or row.entry_hash != expected:
            return {
                "ok": False,
                "checked": checked,
                "legacy_skipped": legacy,
                "last_entry_hash": prev,
                "broken_at": row.id,
            }
        prev = row.entry_hash
        checked += 1
    return {
        "ok": True,
        "checked": checked,
        "legacy_skipped": legacy,
        "last_entry_hash": prev,
        "broken_at": None,
    }
