from contextlib import asynccontextmanager
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect as sa_inspect, text
from sqlalchemy.exc import OperationalError
from .db import Base, engine, SessionLocal
from . import models  # noqa
from .routers import auth, requests, assistant, system, notifications, erp, workflows, staff
from .routers.staff import ensure_subdivision_zones
from .erp_adapter import record_erp_sync
from .alerts import evaluate_and_dispatch_alerts
from .workflow_templates import ensure_workflow_templates
from .perf import ensure_performance_indexes, latency_monitor, bump_all_caches
from .ml.predict import ensure_models
from .security import hash_password
from .uploads import MULTIPART_OVERHEAD_BYTES
from .workflow import run_workflow
from .config import settings

_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if settings.secret_key.startswith(("dev-only", "change-me")):
    print("[security] WARNING: development SECRET_KEY in use; production startup rejects this default.")

DEMO = [
 ("admin@vidyut.local","Admin User","admin","North","Admin@123"),
 ("officer@vidyut.local","officer (North)","officer","North","Officer@123"),
 ("officer@example.com","Officer South","officer","South","Officer@123"),
 ("engineer@vidyut.local","engineer (North)","engineer","North","Engineer@123"),
 ("engineer@example.com","Engineer South","engineer","South","Engineer@123"),
 ("consumer@vidyut.local","Demo Consumer","consumer","North","Consumer@123"),
 # Portal demo accounts (frontend demoAuthData) — same credentials unlock the live API,
 # so one login covers portal + backend (kills the dual-auth story). Role-mapped to backend RBAC.
 ("consumer@vidyutflow.demo","Smt. Meenaben Patel","consumer","North","Demo@12345"),
 ("employee@vidyutflow.demo","Priya Rathod","officer","North","Demo@12345"),
 ("field@vidyutflow.demo","Vikram Zala","engineer","North","Demo@12345"),
 ("vikramaditya.solanki@vidyutflow.demo","Vikramaditya Solanki","engineer","North","Demo@12345"),
 ("dharmesh.chaudhari@vidyutflow.demo","Dharmesh P. Chaudhari","engineer","North","Demo@12345"),
 ("hitesh.vaghela@vidyutflow.demo","Hitesh N. Vaghela","engineer","North","Demo@12345"),
 ("management@vidyutflow.demo","Rajesh Solanki","admin","North","Demo@12345"),
 ("admin@vidyutflow.demo","Anand Patel","admin","North","Demo@12345"),
]
def seed():
    if settings.app_env == "production":
        return
    db = SessionLocal()
    try:
        for email, name, role, zone, pw in DEMO:
            if not db.query(models.User).filter(models.User.email==email).first():
                db.add(models.User(email=email, name=name, role=role, zone=zone, hashed_password=hash_password(pw)))
        db.commit()
    finally: db.close()

def seed_requests():
    if settings.app_env == "production":
        return
    # Synthetic sample rows so the officer dashboard / SLA assistant are not empty on first login.
    db = SessionLocal()
    try:
        if db.query(models.ConnectionRequest).count(): return
        consumer = db.query(models.User).filter(models.User.email=="consumer@vidyut.local").first()
        south = db.query(models.User).filter(models.User.email=="officer@example.com").first()
        field_demo = db.query(models.User).filter(models.User.email=="field@vidyutflow.demo").first()
        field_vikram = db.query(models.User).filter(models.User.email=="vikramaditya.solanki@vidyutflow.demo").first()
        if not consumer: return
        samples = [
            # (consumer, name, desc, load, doc, zone, engineer_override)
            (consumer, "Sample Applicant (Synthetic)", "live wire hanging near house danger sparking fire", 25.0, "safety_photo.jpg", "North", None),
            (consumer, "Demo Consumer", "need new electricity connection for my home", 3.0, "id_proof.pdf", "North", None),
            (consumer, "Patel Kirana Store", "new commercial connection for shop meter board pending", 12.0, "shop_licence.pdf", "North", field_demo),
            (consumer, "Rameshbhai Desai", "connection needed for agricultural pump set near canal", 7.5, "", "North", None),  # no doc -> NEEDS_CORRECTION
            (consumer, "Shakti Textiles Unit 2", "heavy machinery load increase request for factory", 45.0, "load_sanction.pdf", "North", field_vikram),
        ]
        if south:
            samples.append((south, "Meena Suthar (South zone)", "new connection for household in Palanpur", 2.0, "id_proof.pdf", "South", None))
        created_rows = []
        for owner, name, desc, load, doc, zone, eng_override in samples:
            r = models.ConnectionRequest(consumer_id=owner.id, applicant_name=name, phone="9876543210",
                address=f"{zone} Zone, Gujarat", zone=zone, request_type="new_connection",
                description=desc, requested_load_kw=load, document_name=doc)
            db.add(r); db.flush(); run_workflow(db, r)
            if eng_override and r.status == "ASSIGNED":
                r.assigned_engineer_id = eng_override.id
            created_rows.append(r)
        officer = db.query(models.User).filter(models.User.email=="officer@vidyut.local").first()
        north_assigned = [r for r in created_rows if r.zone == "North" and r.status == "ASSIGNED"]
        if len(north_assigned) >= 2:
            record_erp_sync(db, north_assigned[0], officer, "SANCTION_PRECHECK")
            record_erp_sync(db, north_assigned[1], officer, "SANCTION_PRECHECK", simulate_failure=True)
        evaluate_and_dispatch_alerts(db, actor=officer)
        db.commit()
    finally: db.close()

def reject_seeded_demo_accounts():
    demo_emails = [email for email, *_ in DEMO]
    db = SessionLocal()
    try:
        if db.query(models.User).filter(models.User.email.in_(demo_emails)).first():
            raise RuntimeError(
                "Production database contains seeded demo accounts; remove them "
                "before starting with APP_ENV=production"
            )
    finally:
        db.close()

def migrate_audit_chain():
    """Add hash-chain & monotonic sequence columns to a pre-upgrade audit_logs table."""
    insp = sa_inspect(engine)
    if "audit_logs" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("audit_logs")}
    with engine.begin() as conn:
        if "prev_hash" not in cols:
            conn.execute(text("ALTER TABLE audit_logs ADD COLUMN prev_hash VARCHAR DEFAULT ''"))
        if "entry_hash" not in cols:
            conn.execute(text("ALTER TABLE audit_logs ADD COLUMN entry_hash VARCHAR DEFAULT ''"))
        if "chain_seq" not in cols:
            conn.execute(text("ALTER TABLE audit_logs ADD COLUMN chain_seq INTEGER"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_logs_chain_seq ON audit_logs (chain_seq)"))


def migrate_geo_columns(db_engine):
    """Add nullable latitude/longitude columns on connection_requests if upgrading an older DB."""
    inspector = sa_inspect(db_engine)
    if "connection_requests" not in inspector.get_table_names():
        return
    existing = {col["name"] for col in inspector.get_columns("connection_requests")}
    clause = " IF NOT EXISTS" if db_engine.dialect.name == "postgresql" else ""
    for col_name in ("latitude", "longitude"):
        if col_name in existing:
            continue
        try:
            with db_engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE connection_requests ADD COLUMN{clause} {col_name} FLOAT"))
        except OperationalError as exc:
            if db_engine.dialect.name != "sqlite" or "duplicate column name" not in str(exc).lower():
                raise

def migrate_validation_issues(db_engine):
    """Add a nullable submission snapshot column without inventing legacy values.

    The prototype supports SQLite and PostgreSQL; use a reviewed migration process
    and a database backup for production deployments.
    """
    inspector = sa_inspect(db_engine)
    if "connection_requests" not in inspector.get_table_names():
        return
    if "validation_issues_json" in {col["name"] for col in inspector.get_columns("connection_requests")}:
        return
    if db_engine.dialect.name not in ("sqlite", "postgresql"):
        raise RuntimeError("Validation-issue migration supports SQLite and PostgreSQL only")
    clause = " IF NOT EXISTS" if db_engine.dialect.name == "postgresql" else ""
    try:
        with db_engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE connection_requests ADD COLUMN{clause} validation_issues_json TEXT"))
    except OperationalError as exc:
        # SQLite has no ADD COLUMN IF NOT EXISTS; another worker may win the race.
        # Do not suppress unrelated migration errors.
        if db_engine.dialect.name != "sqlite" or "duplicate column name" not in str(exc).lower():
            raise

@asynccontextmanager
async def lifespan(_app):
    Base.metadata.create_all(bind=engine)
    migrate_audit_chain()
    migrate_validation_issues(engine)
    migrate_geo_columns(engine)
    ensure_performance_indexes(engine)
    bump_all_caches()
    try: ensure_models()
    except Exception as e: print(f"[warn] model training skipped: {e}")
    with SessionLocal() as tpl_db:
        ensure_workflow_templates(tpl_db)
        ensure_subdivision_zones(tpl_db)
        tpl_db.commit()
    if settings.app_env == "production":
        reject_seeded_demo_accounts()
    else:
        seed(); seed_requests()
    yield

class ApiVersionPrefixMiddleware:
    """Supports versioned `/v1/<path>` requests seamlessly alongside unversioned `<path>`."""

    def __init__(self, inner_app):
        self.inner_app = inner_app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path == "/v1" or path.startswith("/v1/"):
                rewritten = path[3:] or "/"
                scope = dict(scope)
                scope["path"] = rewritten
                if "raw_path" in scope:
                    scope["raw_path"] = rewritten.encode("utf-8")
        await self.inner_app(scope, receive, send)


app = FastAPI(title="VidyutFlow", description="PS000125 demo: one end-to-end new-connection flow. ML trained on SYNTHETIC data only.", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Baseline security headers + rolling latency monitor for every response."""
    t0 = time.perf_counter()
    response = None
    if request.method == "POST" and request.url.path.rstrip("/").endswith("/requests/with-document"):
        raw_len = request.headers.get("content-length")
        if raw_len is not None:
            try:
                if int(raw_len) > settings.max_upload_bytes + MULTIPART_OVERHEAD_BYTES:
                    response = JSONResponse(
                        status_code=413,
                        content={
                            "detail": f"Uploaded payload exceeds maximum allowed size of {settings.max_upload_bytes} bytes"
                        },
                    )
            except ValueError:
                pass
    if response is None:
        response = await call_next(request)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    matched_route = request.scope.get("route")
    route_path = getattr(matched_route, "path", None) or request.url.path
    latency_monitor.record(f"{request.method} {route_path}", elapsed_ms, response.status_code)
    response.headers.setdefault("X-Response-Time-Ms", f"{elapsed_ms:.2f}")
    response.headers.setdefault("X-API-Version", "v1")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Cache-Control", "no-store")
    if settings.app_env == "production":
        response.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
    return response

app.add_middleware(ApiVersionPrefixMiddleware)

@app.get("/health")
def health(): return {"status": "ok", "service": "VidyutFlow", "data_notice": "Demo uses synthetic data only."}

app.include_router(auth.router); app.include_router(requests.router); app.include_router(assistant.router); app.include_router(system.router); app.include_router(notifications.router); app.include_router(erp.router); app.include_router(workflows.router); app.include_router(staff.router)
