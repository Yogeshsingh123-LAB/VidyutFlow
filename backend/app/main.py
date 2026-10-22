from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect as sa_inspect, text
from .db import Base, engine, SessionLocal
from . import models  # noqa
from .routers import auth, requests, assistant, system, notifications
from .ml.predict import ensure_models
from .security import hash_password
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
        if not consumer: return
        samples = [
            # (consumer, name, desc, load, doc, zone)
            (consumer, "Sample Applicant (Synthetic)", "live wire hanging near house danger sparking fire", 25.0, "safety_photo.jpg", "North"),
            (consumer, "Demo Consumer", "need new electricity connection for my home", 3.0, "id_proof.pdf", "North"),
            (consumer, "Patel Kirana Store", "new commercial connection for shop meter board pending", 12.0, "shop_licence.pdf", "North"),
            (consumer, "Rameshbhai Desai", "connection needed for agricultural pump set near canal", 7.5, "", "North"),  # no doc -> NEEDS_CORRECTION
            (consumer, "Shakti Textiles Unit 2", "heavy machinery load increase request for factory", 45.0, "load_sanction.pdf", "North"),
        ]
        if south:
            samples.append((south, "Meena Suthar (South zone)", "new connection for household in Palanpur", 2.0, "id_proof.pdf", "South"))
        for owner, name, desc, load, doc, zone in samples:
            r = models.ConnectionRequest(consumer_id=owner.id, applicant_name=name, phone="9876543210",
                address=f"{zone} Zone, Gujarat", zone=zone, request_type="new_connection",
                description=desc, requested_load_kw=load, document_name=doc)
            db.add(r); db.flush(); run_workflow(db, r)
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
    """Add hash-chain columns to a pre-upgrade audit_logs table (SQLite/Postgres)."""
    insp = sa_inspect(engine)
    if "audit_logs" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("audit_logs")}
    with engine.begin() as conn:
        if "prev_hash" not in cols:
            conn.execute(text("ALTER TABLE audit_logs ADD COLUMN prev_hash VARCHAR DEFAULT ''"))
        if "entry_hash" not in cols:
            conn.execute(text("ALTER TABLE audit_logs ADD COLUMN entry_hash VARCHAR DEFAULT ''"))

@asynccontextmanager
async def lifespan(_app):
    Base.metadata.create_all(bind=engine)
    migrate_audit_chain()
    try: ensure_models()
    except Exception as e: print(f"[warn] model training skipped: {e}")
    if settings.app_env == "production":
        reject_seeded_demo_accounts()
    else:
        seed(); seed_requests()
    yield

app = FastAPI(title="VidyutFlow", description="PS000125 demo: one end-to-end new-connection flow. ML trained on SYNTHETIC data only.", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Baseline security headers for every response. HSTS is set in production only,
    where TLS termination is expected at the gateway (see docs/API_CONTRACT.md)."""
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Cache-Control", "no-store")
    if settings.app_env == "production":
        response.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
    return response

@app.get("/health")
def health(): return {"status": "ok", "service": "VidyutFlow", "data_notice": "Demo uses synthetic data only."}

app.include_router(auth.router); app.include_router(requests.router); app.include_router(assistant.router); app.include_router(system.router); app.include_router(notifications.router)
