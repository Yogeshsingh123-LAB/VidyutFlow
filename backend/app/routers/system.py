"""System status (VidyutOne Admin > System Overview), computed from real checks — no invented uptime."""
import glob, os, time
from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from ..audit import verify_chain
from ..db import get_db, engine
from ..models import User, ConnectionRequest, FieldUpdate, AuditLog, AlertDispatch, ErpSyncLog
from ..deps import require
from ..ml.predict import metrics
from ..config import settings
from ..perf import build_performance_report

router = APIRouter(prefix="/system", tags=["system"])
_started = time.time()

@router.get("/demo-load-policy")
def demo_load_policy():
    """Public, non-sensitive demo policy; not an official utility limit."""
    return {"review_threshold_kw": settings.demo_load_review_threshold_kw, "is_demo": True}

@router.get("/performance")
def performance_telemetry(u: User = Depends(require("admin"))):
    """Admin-only rolling HTTP latency percentiles, TTL cache stats, and DB index check."""
    return build_performance_report(engine)

@router.get("/status")
def status(db: Session = Depends(get_db), u: User = Depends(require("admin"))):
    try:
        db.execute(text("SELECT 1"))
        counts = {
            "users": db.query(User).count(),
            "requests": db.query(ConnectionRequest).count(),
            "field_updates": db.query(FieldUpdate).count(),
            "audit_logs": db.query(AuditLog).count(),
        }
        db_ok = True
    except SQLAlchemyError:
        db.rollback()
        db_ok = False
        counts = None
    m = metrics()
    policies = len(glob.glob(os.path.join(os.path.dirname(__file__), "..", "..", "data", "policies", "*.md")))
    return {
        "service": "VidyutFlow API", "status": "ok" if db_ok else "degraded",
        "database": {"dialect": engine.dialect.name, "ok": db_ok},
        "counts": counts,
        "ml": {"models_trained": "category_classifier" in m, "metrics": m},
        "assistant": {"policy_documents": policies, "engine": "TF-IDF RAG + live queries (no external LLM)"},
        "performance": build_performance_report(engine),
        "process_uptime_seconds": int(time.time() - _started),
        "services": [
            {"name": "REST API + workflow", "status": "Operational"},
            {"name": "Database", "status": "Operational" if db_ok else "Down"},
            {"name": "ML models (synthetic)", "status": "Operational" if "category_classifier" in m else "Not trained"},
            {"name": "Policy RAG assistant", "status": "Operational" if policies else "No documents"},
            {"name": "Offline field sync", "status": "Operational"},
            {"name": "SCADA / feeder telemetry", "status": "Simulated (roadmap)"},
        ],
    }


def _cef_escape(val: str) -> str:
    return (val or "").replace("\\", "\\\\").replace("|", "\\|").replace("\n", " ").replace("=", "\\=")


@router.get("/siem-events")
def export_siem_security_events(
    format: str = Query("json", description="Export format: json or cef (ArcSight/Wazuh CEF 0.1)"),
    limit: int = Query(50, ge=1, le=250),
    db: Session = Depends(get_db),
    u: User = Depends(require("admin")),
):
    """Admin-only structured SIEM / SOC security telemetry stream (CEF 0.1 or JSON)."""
    fmt = (format or "json").strip().lower()
    chain = verify_chain(db)
    chain_ok, chain_checked, chain_broken = chain["ok"], chain["checked"], chain["broken_at"]

    audit_rows = (
        db.query(AuditLog)
        .order_by(AuditLog.chain_seq.desc(), AuditLog.id.desc())
        .limit(limit)
        .all()
    )
    failed_erp = db.query(ErpSyncLog).filter(ErpSyncLog.status == "FAILED").count()
    alerts_count = db.query(AlertDispatch).count()

    events = []
    for row in audit_rows:
        sev = 8 if ("SSO" in row.action or "REJECT" in row.action or "ALERT" in row.action) else (
            6 if "ENC" in (row.detail or "").upper() or "STAFF" in row.action else 3
        )
        ts_iso = row.created_at.isoformat() if row.created_at else ""
        cef_line = (
            f"CEF:0|UGVCL|VidyutFlow|1.0|{_cef_escape(row.action)}|"
            f"{_cef_escape(row.entity)}:{_cef_escape(row.action)}|{sev}|"
            f"suser={_cef_escape(row.actor_id)} srole={_cef_escape(row.actor_role)} "
            f"cs1={_cef_escape(row.entity_id)} cs1Label=EntityId "
            f"msg={_cef_escape(row.detail)} rt={ts_iso} cn1={row.chain_seq or 0} cn1Label=ChainSeq"
        )
        events.append(
            {
                "chain_seq": row.chain_seq,
                "timestamp": ts_iso,
                "severity": sev,
                "action": row.action,
                "entity": row.entity,
                "entity_id": row.entity_id,
                "actor_id": row.actor_id,
                "actor_role": row.actor_role,
                "detail": row.detail,
                "entry_hash": row.entry_hash,
                "cef": cef_line,
            }
        )

    if fmt == "cef":
        integrity_cef = (
            f"CEF:0|UGVCL|VidyutFlow|1.0|AUDIT_CHAIN_VERIFY|AuditLedgerIntegrity|"
            f"{2 if chain_ok else 10}|outcome={'VALID' if chain_ok else 'BROKEN'} "
            f"cn1={chain_checked} cn1Label=CheckedEntries"
        )
        lines = [integrity_cef] + [e["cef"] for e in events]
        return PlainTextResponse("\n".join(lines) + "\n", media_type="text/plain; charset=utf-8")

    return {
        "schema": "vidyutflow.siem.v1",
        "audit_chain_integrity": {
            "valid": chain_ok,
            "checked_entries": chain_checked,
            "broken_at_id": chain_broken,
        },
        "security_posture_summary": {
            "auth_cookie_mode": "HttpOnly; SameSite=Lax",
            "rate_limiter_backend": "redis+memory_sliding_window",
            "upload_encryption": "HKDF-SHA256 + AES-256-GCM",
            "erp_dlq_failed_items": failed_erp,
            "dispatched_alerts_logged": alerts_count,
        },
        "count": len(events),
        "events": events,
    }
