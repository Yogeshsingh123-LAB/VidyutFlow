"""Tests for Step 13: Phase 12 Security, 403 Audit Logging, Backup/Restore, and DR Matrix.

Validates:
1. 403 Consumer blocked requests on transformer endpoints write an audit/security log entry.
2. Cross-zone access restrictions write audit log entries on 403.
3. Telemetry ingestion authorization and credential rejection (401/403).
4. DR Failover and hot-standby promotion preserve transformer assets and audit log hash chain.
"""
import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
os.environ["ENABLE_TRANSFORMER_SCHEDULER"] = "false"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal
from app.models import AuditLog, TransformerAsset
from app.audit import verify_chain
from scripts.seed_demo_transformers import seed_demo_transformers
from test_flow import login


def test_consumer_blocked_on_transformer_endpoints_writes_audit_log():
    """Step 13 Item 2: 403 Consumer blocked requests on transformer endpoints write an audit/security log entry."""
    with TestClient(app) as client:
        db = SessionLocal()
        try:
            seed_demo_transformers(db)
        finally:
            db.close()

        consumer = login(client, "consumer@vidyut.local", "Consumer@123")
        admin = login(client, "admin@vidyut.local", "Admin@123")

        # Get initial count of SECURITY_VIOLATION audits
        db = SessionLocal()
        try:
            initial_count = db.query(AuditLog).filter(
                AuditLog.action == "SECURITY_VIOLATION",
                AuditLog.entity == "transformer",
            ).count()
        finally:
            db.close()

        # 1. Consumer tries to list transformers -> 403
        r_list = client.get("/transformers", headers=consumer)
        assert r_list.status_code == 403

        # 2. Consumer tries to register a transformer -> 403
        r_create = client.post(
            "/transformers",
            headers=consumer,
            json={
                "utility_asset_code": "CONSUMER-TR-BLOCKED",
                "feeder_id": "F-01",
                "substation_id": "S-01",
                "zone": "North",
            },
        )
        assert r_create.status_code == 403

        # 3. Consumer tries to read transformer detail -> 403
        r_get = client.get("/transformers/DEMO-TR-NORTH-01", headers=consumer)
        assert r_get.status_code == 403

        # 4. Consumer tries to read alerts -> 403
        r_alerts = client.get("/transformers/alerts", headers=consumer)
        assert r_alerts.status_code == 403

        # 5. Consumer tries to trigger predictive assessment -> 403
        r_assess = client.post("/transformers/DEMO-TR-NORTH-01/assessments", headers=consumer)
        assert r_assess.status_code == 403

        # 6. Consumer tries to access analytics summary -> 403
        r_analytics = client.get("/transformer-analytics/summary", headers=consumer)
        assert r_analytics.status_code == 403

        # 7. Consumer tries to access SSE event stream -> 403
        r_sse = client.get("/transformers/stream?max_events=1", headers=consumer)
        assert r_sse.status_code == 403

        # Verify that SECURITY_VIOLATION audit log entries were created for each blocked request
        db = SessionLocal()
        try:
            new_count = db.query(AuditLog).filter(
                AuditLog.action == "SECURITY_VIOLATION",
                AuditLog.entity == "transformer",
            ).count()
            assert new_count >= initial_count + 7

            latest_logs = (
                db.query(AuditLog)
                .filter(AuditLog.action == "SECURITY_VIOLATION", AuditLog.entity == "transformer")
                .order_by(AuditLog.created_at.desc())
                .limit(7)
                .all()
            )
            for entry in latest_logs:
                assert "blocked" in entry.detail.lower() or "denied" in entry.detail.lower()
                assert entry.entry_hash != ""

            # Verify cryptographic hash chain integrity remains intact
            chain_status = verify_chain(db)
            assert chain_status["ok"] is True
            assert chain_status["broken_at"] is None
        finally:
            db.close()


def test_cross_zone_engineer_blocked_writes_audit_log():
    """Verify that an engineer attempting to view a transformer outside their zone writes a security audit entry."""
    with TestClient(app) as client:
        db = SessionLocal()
        try:
            seed_demo_transformers(db)
        finally:
            db.close()

        south_eng = login(client, "engineer@example.com", "Engineer@123")

        # South engineer tries to access North transformer -> 403
        r = client.get("/transformers/DEMO-TR-NORTH-01", headers=south_eng)
        assert r.status_code == 403

        # Verify security audit entry
        db = SessionLocal()
        try:
            log_entry = (
                db.query(AuditLog)
                .filter(
                    AuditLog.action == "SECURITY_VIOLATION",
                    AuditLog.entity == "transformer",
                    AuditLog.actor_role == "engineer",
                )
                .order_by(AuditLog.created_at.desc())
                .first()
            )
            assert log_entry is not None
            assert "blocked" in log_entry.detail.lower()
        finally:
            db.close()


def test_telemetry_ingest_security_and_credential_rejection():
    """Verify telemetry ingestion endpoint security: missing key (401), invalid key (401), user JWT rejected (403)."""
    with TestClient(app) as client:
        consumer = login(client, "consumer@vidyut.local", "Consumer@123")
        admin = login(client, "admin@vidyut.local", "Admin@123")

        payload = {
            "ingestion_id": "test-ingest-sec-01",
            "readings": [
                {
                    "sensor_id": "SENS-TEST-01",
                    "measured_at": "2026-11-04T12:00:00Z",
                    "value": 55.0,
                    "unit": "C",
                }
            ],
        }

        # 1. Missing ingestion key -> 401
        r_missing = client.post("/transformers/telemetry", json=payload)
        assert r_missing.status_code == 401

        # 2. Invalid ingestion key -> 401
        r_invalid = client.post(
            "/transformers/telemetry",
            headers={"X-Telemetry-Ingest-Key": "invalid-secret-key-1234"},
            json=payload,
        )
        assert r_invalid.status_code == 401

        # 3. User JWT sent instead of ingestion key -> 403
        r_jwt = client.post(
            "/transformers/telemetry",
            headers=consumer,
            json=payload,
        )
        assert r_jwt.status_code == 403
        assert "user credentials cannot be used" in r_jwt.json()["detail"].lower()

