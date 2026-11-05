"""Tests for Phase 12 Step 8: Server-Sent Events (SSE) Real-Time Transformer Stream."""
import asyncio
from datetime import datetime, timezone
import os
from pathlib import Path
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

try:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
    import export_openapi
except Exception:
    pass

from app.main import app
from app.db import SessionLocal
from app import models
from app.services.event_bus import transformer_event_bus
from scripts.seed_demo_transformers import seed_demo_transformers


def login(c, email, pw):
    r = c.post("/auth/login", data={"username": email, "password": pw})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_sse_stream_authentication_and_security():
    with TestClient(app) as client:
        # 1. Unauthenticated -> 401
        r = client.get("/transformers/stream?max_events=1")
        assert r.status_code == 401

        # 2. Query param token alone does not authenticate -> 401
        r = client.get("/transformers/stream?token=fake_jwt_param&max_events=1")
        assert r.status_code == 401

        # 3. Authenticated officer passing prohibited query param token -> 400
        officer = login(client, "officer@vidyut.local", "Officer@123")
        r = client.get("/transformers/stream?token=fake_jwt_param&max_events=1", headers=officer)
        assert r.status_code == 400
        assert "prohibited" in r.json()["detail"].lower()

        # 4. Consumer role -> 403
        consumer = login(client, "consumer@vidyut.local", "Consumer@123")
        r = client.get("/transformers/stream?max_events=1", headers=consumer)
        assert r.status_code == 403


def test_sse_stream_headers_and_handshake():
    with TestClient(app) as client:
        officer = login(client, "officer@vidyut.local", "Officer@123")  # North
        r = client.get("/transformers/stream?max_events=1", headers=officer)

        assert r.status_code == 200
        assert "text/event-stream" in r.headers["content-type"]
        assert r.headers.get("x-accel-buffering") == "no"
        assert "no-cache" in r.headers.get("cache-control", "")

        # Verify initial handshake event
        body = r.text
        assert "event: connected" in body
        assert '"status": "connected"' in body
        assert '"role": "officer"' in body
        assert '"zone": "North"' in body


def test_sse_stream_heartbeat_generation():
    with TestClient(app) as client:
        admin = login(client, "admin@vidyut.local", "Admin@123")
        # Request 2 events with very fast heartbeat (50ms) and replay_history=false
        r = client.get("/transformers/stream?max_events=2&heartbeat_seconds=0.05&replay_history=false", headers=admin)
        assert r.status_code == 200
        body = r.text
        assert "event: connected" in body
        assert ": heartbeat" in body


def test_sse_stream_telemetry_and_alert_delivery():
    with TestClient(app) as client:
        db = SessionLocal()
        try:
            seed_demo_transformers(db)
            north_tr = db.query(models.TransformerAsset).filter_by(utility_asset_code="DEMO-TR-NORTH-01").first()
            assert north_tr is not None
            north_tr_id = north_tr.id
        finally:
            db.close()

        officer = login(client, "officer@vidyut.local", "Officer@123")  # North

        # Publish a simulated event right before reading with max_events=2
        transformer_event_bus.publish_sync(
            "telemetry",
            {
                "transformer_id": north_tr_id,
                "utility_asset_code": "DEMO-TR-NORTH-01",
                "sensor_type": "LOAD_KVA",
                "value": 298.5,
                "unit": "kVA",
                "quality": "GOOD",
                "zone": "North",
            },
            zone="North",
        )

        r = client.get(f"/transformers/stream?transformer_id={north_tr_id}&max_events=2&heartbeat_seconds=0.05", headers=officer)
        assert r.status_code == 200
        body = r.text
        assert "event: connected" in body
        assert "DEMO-TR-NORTH-01" in body

