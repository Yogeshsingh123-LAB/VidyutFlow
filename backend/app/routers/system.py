"""System status (VidyutOne Admin > System Overview), computed from real checks — no invented uptime."""
import glob, os, time
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from ..db import get_db, engine
from ..models import User, ConnectionRequest, FieldUpdate, AuditLog
from ..deps import require
from ..ml.predict import metrics

router = APIRouter(prefix="/system", tags=["system"])
_started = time.time()

@router.get("/status")
def status(db: Session = Depends(get_db), u: User = Depends(require("admin"))):
    try:
        db.execute(text("SELECT 1")); db_ok = True
    except Exception:
        db_ok = False
    m = metrics()
    policies = len(glob.glob(os.path.join(os.path.dirname(__file__), "..", "..", "data", "policies", "*.md")))
    return {
        "service": "VidyutFlow API", "status": "ok" if db_ok else "degraded",
        "database": {"dialect": engine.dialect.name, "ok": db_ok},
        "counts": {"users": db.query(User).count(), "requests": db.query(ConnectionRequest).count(),
                   "field_updates": db.query(FieldUpdate).count(), "audit_logs": db.query(AuditLog).count()},
        "ml": {"models_trained": "category_classifier" in m, "metrics": m},
        "assistant": {"policy_documents": policies, "engine": "TF-IDF RAG + live queries (no external LLM)"},
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
