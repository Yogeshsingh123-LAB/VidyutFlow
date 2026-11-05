"""Tests for Phase 12 Step 6: Alert Lifecycle, Audit Integration, and Field Inspections."""
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
from scripts.seed_demo_transformers import seed_demo_transformers


def login(c, email, pw):
    r = c.post("/auth/login", data={"username": email, "password": pw})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def now_utc_iso():
    return datetime.now(timezone.utc).isoformat()


def test_alert_lifecycle_and_field_inspections_e2e():
    with TestClient(app) as client:
        # 1. Seed demo transformers & sensors
        db = SessionLocal()
        try:
            seed_demo_transformers(db)
            north_tr = db.query(models.TransformerAsset).filter_by(utility_asset_code="DEMO-TR-NORTH-01").first()
            south_tr = db.query(models.TransformerAsset).filter_by(utility_asset_code="DEMO-TR-SOUTH-01").first()
            assert north_tr is not None and south_tr is not None
            north_tr_id = north_tr.id
            south_tr_id = south_tr.id

            # Insert an anomaly reading for north_tr (Load kVA = 360 on 315 kVA rated -> >110% Overload CRITICAL)
            north_sensors = db.query(models.TransformerSensor).filter_by(transformer_id=north_tr_id).all()
            load_sensor = [s for s in north_sensors if s.sensor_type == "LOAD_KVA"][0]

            reading = models.TelemetryReading(
                id=str(uuid.uuid4()),
                transformer_id=north_tr_id,
                sensor_id=load_sensor.id,
                measured_at=datetime.now(timezone.utc),
                received_at=datetime.now(timezone.utc),
                value=360.0,  # 360/315 = 114% -> CRITICAL Overload
                unit="kVA",
                quality="GOOD",
                source="IOT",
                ingestion_id=str(uuid.uuid4()),
            )
            db.add(reading)
            db.commit()
        finally:
            db.close()

        consumer = login(client, "consumer@vidyut.local", "Consumer@123")
        officer = login(client, "officer@vidyut.local", "Officer@123")  # North
        south_officer = login(client, "officer@example.com", "Officer@123")  # South
        engineer = login(client, "engineer@vidyut.local", "Engineer@123")  # North
        south_engineer = login(client, "engineer@example.com", "Engineer@123")  # South
        admin = login(client, "admin@vidyut.local", "Admin@123")

        # ----------------------------------------------------------------------
        # 1. Evaluate Alerts
        # ----------------------------------------------------------------------
        # Consumer forbidden (403)
        r = client.post(f"/transformers/{north_tr_id}/evaluate-alerts", headers=consumer)
        assert r.status_code == 403

        # South officer cannot evaluate North transformer (403)
        r = client.post(f"/transformers/{north_tr_id}/evaluate-alerts", headers=south_officer)
        assert r.status_code == 403

        # North officer evaluates North transformer (200)
        r = client.post(f"/transformers/{north_tr_id}/evaluate-alerts", headers=officer)
        assert r.status_code == 200
        data = r.json()
        assert data["evaluated_alerts"] >= 1
        overload_alerts = [a for a in data["items"] if a["alert_type"] == "OVERLOAD"]
        assert len(overload_alerts) >= 1
        active_alert = overload_alerts[0]
        assert active_alert["severity"] == "CRITICAL"
        assert active_alert["status"] == "ACTIVE"

        # ----------------------------------------------------------------------
        # 2. List Alerts & Scoping
        # ----------------------------------------------------------------------
        # Consumer cannot list alerts (403)
        assert client.get("/transformers/alerts", headers=consumer).status_code == 403

        # North officer sees North alerts
        r = client.get("/transformers/alerts", headers=officer)
        assert r.status_code == 200
        north_alerts = r.json()["items"]
        assert len(north_alerts) >= 1
        assert all(a["zone"] == "North" for a in north_alerts)

        # South officer sees 0 North alerts
        r = client.get("/transformers/alerts", headers=south_officer)
        assert r.status_code == 200
        south_alerts = r.json()["items"]
        assert not any(a["id"] == active_alert["id"] for a in south_alerts)

        # Admin sees all alerts cross-zone
        r = client.get("/transformers/alerts", headers=admin)
        assert r.status_code == 200
        assert any(a["id"] == active_alert["id"] for a in r.json()["items"])

        # Transformer-specific alert listing
        r = client.get(f"/transformers/{north_tr_id}/alerts", headers=officer)
        assert r.status_code == 200
        assert any(a["id"] == active_alert["id"] for a in r.json()["items"])

        # ----------------------------------------------------------------------
        # 3. Alert Lifecycle: Acknowledge & Resolve
        # ----------------------------------------------------------------------
        # South engineer cannot acknowledge North alert (403)
        r = client.post(f"/transformers/alerts/{active_alert['id']}/acknowledge", headers=south_engineer)
        assert r.status_code == 403

        # North engineer acknowledges alert (200)
        r = client.post(f"/transformers/alerts/{active_alert['id']}/acknowledge", headers=engineer)
        assert r.status_code == 200
        ack_data = r.json()
        assert ack_data["status"] == "ACKNOWLEDGED"

        # Verify audit log for ACKNOWLEDGE
        db = SessionLocal()
        try:
            audit_ack = (
                db.query(models.AuditLog)
                .filter_by(action="TRANSFORMER_ALERT_ACKNOWLEDGED", entity_id=active_alert["id"])
                .first()
            )
            assert audit_ack is not None
        finally:
            db.close()

        # Admin resolves alert (200)
        r = client.post(f"/transformers/alerts/{active_alert['id']}/resolve", headers=admin)
        assert r.status_code == 200
        res_data = r.json()
        assert res_data["status"] == "RESOLVED"
        assert res_data["resolved_at"] is not None

        # Verify audit log for RESOLVE
        db = SessionLocal()
        try:
            audit_res = (
                db.query(models.AuditLog)
                .filter_by(action="TRANSFORMER_ALERT_RESOLVED", entity_id=active_alert["id"])
                .first()
            )
            assert audit_res is not None
        finally:
            db.close()

        # Cannot acknowledge a resolved alert (400)
        r = client.post(f"/transformers/alerts/{active_alert['id']}/acknowledge", headers=engineer)
        assert r.status_code == 400

        # ----------------------------------------------------------------------
        # 4. Field Inspections (POST & GET)
        # ----------------------------------------------------------------------
        client_uuid = str(uuid.uuid4())
        insp_payload = {
            "client_uuid": client_uuid,
            "work_order_id": "WO-2026-NORTH-001",
            "checklist": {"oil_level": "NORMAL", "silica_gel": "BLUE", "bushings": "INTACT"},
            "observations": "Routine thermal inspection confirmed load spike resolved",
            "photo_refs": ["https://vault.vidyutflow.local/photos/insp-01.jpg"],
            "gps_accuracy": 4.2,
            "signature": "SIG-VIKRAM-ZALA",
            "review_status": "VERIFIED",
        }

        # 4a. Consumer and Officer cannot submit inspections (403)
        assert client.post(f"/transformers/{north_tr_id}/inspections", headers=consumer, json=insp_payload).status_code == 403
        assert client.post(f"/transformers/{north_tr_id}/inspections", headers=officer, json=insp_payload).status_code == 403

        # 4b. South engineer cannot inspect North transformer (403)
        assert client.post(f"/transformers/{north_tr_id}/inspections", headers=south_engineer, json=insp_payload).status_code == 403

        # 4c. North engineer submits inspection (201 Created)
        r = client.post(f"/transformers/{north_tr_id}/inspections", headers=engineer, json=insp_payload)
        assert r.status_code == 201
        created_insp = r.json()
        assert created_insp["id"] == client_uuid
        assert created_insp["transformer_id"] == north_tr_id
        assert created_insp["review_status"] == "VERIFIED"

        # Verify audit log for inspection
        db = SessionLocal()
        try:
            audit_insp = (
                db.query(models.AuditLog)
                .filter_by(action="TRANSFORMER_INSPECTION_RECORDED", entity_id=client_uuid)
                .first()
            )
            assert audit_insp is not None
        finally:
            db.close()

        # 4d. Idempotency: Re-submitting with the same client_uuid succeeds and returns existing record
        r = client.post(f"/transformers/{north_tr_id}/inspections", headers=engineer, json=insp_payload)
        assert r.status_code in (200, 201)
        assert r.json()["id"] == client_uuid

        # 4e. Query Inspections: GET /transformers/{id}/inspections
        # Consumer cannot read inspections (403)
        assert client.get(f"/transformers/{north_tr_id}/inspections", headers=consumer).status_code == 403

        # South officer cannot read North inspections (403)
        assert client.get(f"/transformers/{north_tr_id}/inspections", headers=south_officer).status_code == 403

        # North officer and North engineer can read inspections (200)
        r_off = client.get(f"/transformers/{north_tr_id}/inspections", headers=officer)
        assert r_off.status_code == 200
        assert r_off.json()["total"] >= 1
        assert any(i["id"] == client_uuid for i in r_off.json()["items"])

        r_eng = client.get(f"/transformers/{north_tr_id}/inspections", headers=engineer)
        assert r_eng.status_code == 200
        assert any(i["id"] == client_uuid for i in r_eng.json()["items"])

        # Admin can read cross-zone inspections
        r_adm = client.get(f"/transformers/{north_tr_id}/inspections", headers=admin)
        assert r_adm.status_code == 200
        assert any(i["id"] == client_uuid for i in r_adm.json()["items"])
