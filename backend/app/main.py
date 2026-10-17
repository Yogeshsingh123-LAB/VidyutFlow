from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine, SessionLocal
from . import models  # noqa
from .routers import auth, requests, assistant, system
from .ml.predict import ensure_models
from .security import hash_password
from .workflow import run_workflow
from .config import settings

_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if settings.secret_key.startswith(("dev-only", "change-me")):
    print("[security] WARNING: default SECRET_KEY in use - set a long random SECRET_KEY outside local demos.")

DEMO = [
 ("admin@vidyut.local","Admin User","admin","North","Admin@123"),
 ("officer@vidyut.local","officer (North)","officer","North","Officer@123"),
 ("officer@example.com","Officer South","officer","South","Officer@123"),
 ("engineer@vidyut.local","engineer (North)","engineer","North","Engineer@123"),
 ("engineer@example.com","Engineer South","engineer","South","Engineer@123"),
 ("consumer@vidyut.local","Demo Consumer","consumer","North","Consumer@123"),
]
def seed():
    db = SessionLocal()
    try:
        for email, name, role, zone, pw in DEMO:
            if not db.query(models.User).filter(models.User.email==email).first():
                db.add(models.User(email=email, name=name, role=role, zone=zone, hashed_password=hash_password(pw)))
        db.commit()
    finally: db.close()

def seed_requests():
    # Synthetic sample rows so the officer dashboard / SLA assistant are not empty on first login.
    db = SessionLocal()
    try:
        if db.query(models.ConnectionRequest).count(): return
        consumer = db.query(models.User).filter(models.User.email=="consumer@vidyut.local").first()
        if not consumer: return
        samples = [
            ("Sample Applicant (Synthetic)", "live wire hanging near house danger sparking fire", 25.0, "safety_photo.jpg"),
            ("Demo Consumer", "need new electricity connection for my home", 3.0, "id_proof.pdf"),
        ]
        for name, desc, load, doc in samples:
            r = models.ConnectionRequest(consumer_id=consumer.id, applicant_name=name, phone="9876543210",
                address="Mehsana, Gujarat", zone="North", request_type="new_connection",
                description=desc, requested_load_kw=load, document_name=doc)
            db.add(r); db.flush(); run_workflow(db, r)
        db.commit()
    finally: db.close()

@asynccontextmanager
async def lifespan(_app):
    Base.metadata.create_all(bind=engine)
    try: ensure_models()
    except Exception as e: print(f"[warn] model training skipped: {e}")
    seed(); seed_requests()
    yield

app = FastAPI(title="VidyutFlow", description="PS000125 demo: one end-to-end new-connection flow. ML trained on SYNTHETIC data only.", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health(): return {"status": "ok", "service": "VidyutFlow", "data_notice": "Demo uses synthetic data only."}

app.include_router(auth.router); app.include_router(requests.router); app.include_router(assistant.router); app.include_router(system.router)
