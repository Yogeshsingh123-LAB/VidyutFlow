"""Tests for Phase 12 Step 2: Transformer Asset Registry API and RBAC Scoping."""
import os
import sys
import uuid
from datetime import date
import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.db import SessionLocal
from app import models
from scripts.seed_demo_transformers import seed_demo_transformers


def login(c, email, pw):
    r = c.post("/auth/login", data={"username": email, "password": pw})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_transformer_asset_registry_rbac_and_crud():
    with TestClient(app) as client:
        # Seed demo transformers within test client context
        db = SessionLocal()
        try:
            seed_demo_transformers(db)
        finally:
            db.close()

        consumer = login(client, "consumer@vidyut.local", "Consumer@123")
        officer = login(client, "officer@vidyut.local", "Officer@123")
        engineer = login(client, "engineer@vidyut.local", "Engineer@123")
        admin = login(client, "admin@vidyut.local", "Admin@123")

        # 1. Consumer is forbidden from all asset registry operations (403)
        r = client.get("/transformers", headers=consumer)
        assert r.status_code == 403

        r = client.post(
            "/transformers",
            headers=consumer,
            json={
                "utility_asset_code": "CONSUMER-TR-01",
                "feeder_id": "F-01",
                "substation_id": "S-01",
                "zone": "North",
                "rated_kva": 100.0,
            },
        )
        assert r.status_code == 403

        r = client.get("/transformers/DEMO-TR-NORTH-01", headers=consumer)
        assert r.status_code == 403

        r = client.patch(
            "/transformers/DEMO-TR-NORTH-01",
            headers=consumer,
            json={"status": "FAULT"},
        )
        assert r.status_code == 403

        r = client.get("/transformers/DEMO-TR-NORTH-01/sensors", headers=consumer)
        assert r.status_code == 403

        # 2. Officer & Engineer: Read operations scoped to own zone
        # Officer (North zone) lists transformers -> only North transformers returned
        r = client.get("/transformers", headers=officer)
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        assert all(it["zone"] == "North" for it in items)

        # Engineer (North zone) can view North transformer and its sensors
        r = client.get("/transformers/DEMO-TR-NORTH-01", headers=engineer)
        assert r.status_code == 200
        assert r.json()["utility_asset_code"] == "DEMO-TR-NORTH-01"
        assert r.json()["subdivision_id"] == "North"

        r = client.get("/transformers/DEMO-TR-NORTH-01/sensors", headers=engineer)
        assert r.status_code == 200
        sensors = r.json()["items"]
        assert len(sensors) == 7
        sensor_types = {s["sensor_type"] for s in sensors}
        assert "LOAD_KVA" in sensor_types
        assert "OIL_TEMP" in sensor_types
        assert "WINDING_TEMP" in sensor_types

        # Officer & Engineer cannot read transformers outside their zone (403)
        r = client.get("/transformers/DEMO-TR-SOUTH-01", headers=officer)
        assert r.status_code == 403
        assert "outside your assigned" in r.json()["detail"].lower()

        r = client.get("/transformers/DEMO-TR-SOUTH-01/sensors", headers=engineer)
        assert r.status_code == 403

        # Officer & Engineer cannot create or patch transformers (403)
        r = client.post(
            "/transformers",
            headers=officer,
            json={
                "utility_asset_code": "OFFICER-TR-01",
                "feeder_id": "F-01",
                "substation_id": "S-01",
                "zone": "North",
                "rated_kva": 250.0,
            },
        )
        assert r.status_code == 403

        r = client.patch(
            "/transformers/DEMO-TR-NORTH-01",
            headers=engineer,
            json={"status": "MAINTENANCE"},
        )
        assert r.status_code == 403

        # 3. Admin: Full cross-zone read, POST create, and PATCH update
        r = client.get("/transformers", headers=admin)
        assert r.status_code == 200
        all_tr = r.json()["items"]
        zones = {it["zone"] for it in all_tr}
        assert "North" in zones
        assert "South" in zones
        assert "Central" in zones

        # Admin can filter by zone
        r = client.get("/transformers?zone=South", headers=admin)
        assert r.status_code == 200
        assert all(it["zone"] == "South" for it in r.json()["items"])

        # Admin can create a new transformer asset (201)
        new_code = f"TEST-TR-ADM-{uuid.uuid4().hex[:6].upper()}"
        r = client.post(
            "/transformers",
            headers=admin,
            json={
                "utility_asset_code": new_code,
                "feeder_id": "FEEDER-TEST-01",
                "substation_id": "SUB-TEST-01",
                "zone": "North",
                "rated_kva": 400.0,
                "phases": 3,
                "voltage_class": "11kV/415V",
                "status": "IN_SERVICE",
            },
        )
        assert r.status_code == 201
        created = r.json()
        assert created["utility_asset_code"] == new_code
        assert created["rated_kva"] == 400.0
        assert created["metadata_version"] == 1
        new_id = created["id"]

        # Duplicate utility_asset_code returns 409
        r = client.post(
            "/transformers",
            headers=admin,
            json={
                "utility_asset_code": new_code,
                "feeder_id": "FEEDER-TEST-01",
                "substation_id": "SUB-TEST-01",
                "zone": "North",
                "rated_kva": 400.0,
            },
        )
        assert r.status_code == 409

        # Admin can update transformer metadata (PATCH)
        r = client.patch(
            f"/transformers/{new_id}",
            headers=admin,
            json={
                "status": "MAINTENANCE",
                "rated_kva": 500.0,
                "latitude": 23.5900,
                "longitude": 72.3700,
            },
        )
        assert r.status_code == 200
        updated = r.json()
        assert updated["status"] == "MAINTENANCE"
        assert updated["rated_kva"] == 500.0
        assert updated["metadata_version"] == 2
        assert updated["latitude"] == 23.5900

        # Verify audit log was created for both CREATE and UPDATE
        db = SessionLocal()
        try:
            audit_create = (
                db.query(models.AuditLog)
                .filter(
                    models.AuditLog.action == "TRANSFORMER_CREATED",
                    models.AuditLog.entity_id == new_id,
                )
                .first()
            )
            assert audit_create is not None

            audit_update = (
                db.query(models.AuditLog)
                .filter(
                    models.AuditLog.action == "TRANSFORMER_UPDATED",
                    models.AuditLog.entity_id == new_id,
                )
                .first()
            )
            assert audit_update is not None
        finally:
            db.close()

        # Non-existent transformer returns 404
        r = client.get("/transformers/NON-EXISTENT-ID-12345", headers=admin)
        assert r.status_code == 404
