"""Tests for Phase 12 Step 4: Telemetry Ingestion, Service Authentication & Simulator."""
from datetime import datetime, timezone
import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.config import settings
from app.db import SessionLocal
from app import models
from scripts.seed_demo_transformers import seed_demo_transformers


def login(c, email, pw):
    r = c.post("/auth/login", data={"username": email, "password": pw})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def now_utc_iso():
    return datetime.now(timezone.utc).isoformat()


def test_telemetry_ingestion_auth_dead_letter_and_idempotency():
    with TestClient(app) as client:
        # 1. Ensure seed data exists
        db = SessionLocal()
        try:
            seed_demo_transformers(db)
            north_tr = db.query(models.TransformerAsset).filter_by(utility_asset_code="DEMO-TR-NORTH-01").first()
            south_tr = db.query(models.TransformerAsset).filter_by(utility_asset_code="DEMO-TR-SOUTH-01").first()
            assert north_tr is not None and south_tr is not None

            north_sensors = db.query(models.TransformerSensor).filter_by(transformer_id=north_tr.id).all()
            south_sensors = db.query(models.TransformerSensor).filter_by(transformer_id=south_tr.id).all()
            assert len(north_sensors) >= 1 and len(south_sensors) >= 1

            north_load_sensor = [s for s in north_sensors if s.sensor_type == "LOAD_KVA"][0]
            south_load_sensor = [s for s in south_sensors if s.sensor_type == "LOAD_KVA"][0]
        finally:
            db.close()

        consumer = login(client, "consumer@vidyut.local", "Consumer@123")
        officer = login(client, "officer@vidyut.local", "Officer@123")
        admin = login(client, "admin@vidyut.local", "Admin@123")

        valid_headers = {"X-Telemetry-Ingest-Key": settings.telemetry_ingest_secret}

        # ----------------------------------------------------------------------
        # 1. Authentication rules
        # ----------------------------------------------------------------------
        ingest_id_1 = str(uuid.uuid4())
        valid_payload = {
            "readings": [
                {
                    "transformer_id": north_tr.id,
                    "sensor_id": north_load_sensor.id,
                    "measured_at": now_utc_iso(),
                    "value": 210.5,
                    "unit": "kVA",
                    "quality": "GOOD",
                    "source": "IOT",
                    "ingestion_id": ingest_id_1,
                }
            ]
        }

        # 1a. Missing X-Telemetry-Ingest-Key returns 401
        r = client.post("/transformers/telemetry", json=valid_payload)
        assert r.status_code == 401
        assert "Missing" in r.json()["detail"] or "invalid" in r.json()["detail"].lower()

        # 1b. Invalid X-Telemetry-Ingest-Key returns 401
        r = client.post("/transformers/telemetry", headers={"X-Telemetry-Ingest-Key": "bad-key-xyz"}, json=valid_payload)
        assert r.status_code == 401
        assert "Invalid" in r.json()["detail"]

        # 1c. Normal user JWT calling without valid ingest key returns 403
        r = client.post("/transformers/telemetry", headers=consumer, json=valid_payload)
        assert r.status_code == 403
        assert "credentials" in r.json()["detail"].lower()

        r = client.post("/transformers/telemetry", headers=officer, json=valid_payload)
        assert r.status_code == 403

        # 1d. Valid X-Telemetry-Ingest-Key succeeds with 201
        r = client.post("/transformers/telemetry", headers=valid_headers, json=valid_payload)
        assert r.status_code == 201
        resp = r.json()
        assert resp["status"] == "success"
        assert resp["ingested"] == 1
        assert resp["duplicates"] == 0
        assert resp["dead_lettered"] == 0

        # Verify sensor last_seen_at was updated
        db = SessionLocal()
        try:
            s_updated = db.query(models.TransformerSensor).filter_by(id=north_load_sensor.id).first()
            assert s_updated.last_seen_at is not None
            assert s_updated.quality_state == "GOOD"
        finally:
            db.close()

        # ----------------------------------------------------------------------
        # 2. Idempotency check: Replay same ingestion_id
        # ----------------------------------------------------------------------
        r = client.post("/transformers/telemetry", headers=valid_headers, json=valid_payload)
        assert r.status_code == 201
        resp = r.json()
        assert resp["ingested"] == 0
        assert resp["duplicates"] == 1

        # ----------------------------------------------------------------------
        # 3. Item 3 rule: sensor_id must belong to transformer_id (Dead Letter)
        # ----------------------------------------------------------------------
        # Pair South sensor with North transformer -> mismatch!
        mismatched_id = str(uuid.uuid4())
        mismatched_payload = {
            "readings": [
                {
                    "transformer_id": north_tr.id,
                    "sensor_id": south_load_sensor.id,  # Belongs to South transformer!
                    "measured_at": now_utc_iso(),
                    "value": 195.0,
                    "unit": "kVA",
                    "quality": "GOOD",
                    "source": "IOT",
                    "ingestion_id": mismatched_id,
                }
            ]
        }
        r = client.post("/transformers/telemetry", headers=valid_headers, json=mismatched_payload)
        assert r.status_code == 201
        resp = r.json()
        assert resp["ingested"] == 0
        assert resp["dead_lettered"] == 1
        assert "does not belong to transformer" in resp["dead_letters"][0]["error"]

        # Verify dead letter row was persisted
        db = SessionLocal()
        try:
            dl_row = db.query(models.TelemetryDeadLetter).filter_by(ingestion_id=mismatched_id).first()
            assert dl_row is not None
            assert "does not belong" in dl_row.error_reason
        finally:
            db.close()

        # ----------------------------------------------------------------------
        # 4. Unknown transformer or sensor dead-letters cleanly
        # ----------------------------------------------------------------------
        unknown_id = str(uuid.uuid4())
        bad_tr_payload = {
            "readings": [
                {
                    "transformer_id": "UNKNOWN-TR-9999",
                    "sensor_id": north_load_sensor.id,
                    "measured_at": now_utc_iso(),
                    "value": 150.0,
                    "unit": "kVA",
                    "quality": "GOOD",
                    "source": "IOT",
                    "ingestion_id": unknown_id,
                }
            ]
        }
        r = client.post("/transformers/telemetry", headers=valid_headers, json=bad_tr_payload)
        assert r.status_code == 201
        resp = r.json()
        assert resp["dead_lettered"] == 1
        assert "not found" in resp["dead_letters"][0]["error"].lower()

        # ----------------------------------------------------------------------
        # 5. Query endpoints: GET /{transformer_id}/telemetry & dead-letters
        # ----------------------------------------------------------------------
        # Consumer cannot read telemetry (403)
        r = client.get(f"/transformers/{north_tr.id}/telemetry", headers=consumer)
        assert r.status_code == 403

        # North officer can read North transformer telemetry (200)
        r = client.get(f"/transformers/{north_tr.id}/telemetry", headers=officer)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        assert any(it["ingestion_id"] == ingest_id_1 for it in data["items"])

        # North officer cannot read South transformer telemetry (403)
        r = client.get(f"/transformers/{south_tr.id}/telemetry", headers=officer)
        assert r.status_code == 403

        # Admin can read telemetry for any transformer
        r = client.get(f"/transformers/{south_tr.id}/telemetry", headers=admin)
        assert r.status_code == 200

        # Filter by sensor_type
        r = client.get(f"/transformers/{north_tr.id}/telemetry?sensor_type=LOAD_KVA", headers=officer)
        assert r.status_code == 200
        assert r.json()["total"] >= 1

        # Officer cannot access dead-letter queue (admin only 403)
        r = client.get("/transformers/telemetry/dead-letters", headers=officer)
        assert r.status_code == 403

        # Admin can inspect dead-letter queue (200)
        r = client.get("/transformers/telemetry/dead-letters", headers=admin)
        assert r.status_code == 200
        dl_items = r.json()["items"]
        assert len(dl_items) >= 2
        assert any(d["ingestion_id"] == mismatched_id for d in dl_items)

