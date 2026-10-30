"""Tamper-evident audit chain + security-header / AI-endpoint protection tests."""
import os, sys
os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal
from app.models import AuditLog


def login(c, email, pw):
    r = c.post("/auth/login", data={"username": email, "password": pw})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_audit_chain_valid_after_activity():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        admin = login(c, "admin@vidyut.local", "Admin@123")
        c.post("/requests", headers=consumer, json={
            "applicant_name": "Chain Test User", "phone": "9876543210",
            "address": "Mehsana, Gujarat", "zone": "North",
            "description": "need new connection", "requested_load_kw": 2})
        v = c.get("/requests/audit/verify", headers=admin)
        assert v.status_code == 200
        body = v.json()
        assert body["ok"] is True and body["broken_at"] is None
        assert body["checked"] >= 1 and body["last_entry_hash"]
        # non-admin cannot run the tamper check
        assert c.get("/requests/audit/verify", headers=consumer).status_code == 403


def test_tampered_row_breaks_the_chain():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        admin = login(c, "admin@vidyut.local", "Admin@123")
        c.post("/requests", headers=consumer, json={
            "applicant_name": "Tamper Probe", "phone": "9876543210",
            "address": "Mehsana, Gujarat", "zone": "North",
            "description": "need new connection", "requested_load_kw": 2})
        db = SessionLocal()
        try:
            row = db.query(AuditLog).filter(AuditLog.entry_hash != "").first()
            assert row is not None, "expected at least one chained audit row"
            original = row.detail
            row.detail = "edited by attacker"
            db.commit()
            victim_id = row.id
        finally:
            db.close()
        body = c.get("/requests/audit/verify", headers=admin).json()
        assert body["ok"] is False
        assert body["broken_at"] is not None
        # restore the original row value: recomputed hash matches again, chain heals for later runs
        db = SessionLocal()
        try:
            row = db.get(AuditLog, victim_id)
            row.detail = original
            db.commit()
        finally:
            db.close()
        assert c.get("/requests/audit/verify", headers=admin).json()["ok"] is True


def test_security_headers_present():
    with TestClient(app) as c:
        r = c.get("/health")
        assert r.headers["X-Content-Type-Options"] == "nosniff"
        assert r.headers["X-Frame-Options"] == "DENY"
        assert r.headers["Referrer-Policy"] == "no-referrer"
        assert "no-store" in r.headers["Cache-Control"]


def test_ai_endpoints_require_auth():
    with TestClient(app) as c:
        assert c.post("/assistant/chat", json={"question": "pending?"}).status_code in (401, 403)
        assert c.get("/assistant/ml-metrics").status_code in (401, 403)
