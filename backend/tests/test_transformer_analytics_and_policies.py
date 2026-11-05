"""Tests for Phase 12 Step 7: Predictive Risk Baseline, Analytics Summary, Policies, and Work Orders."""
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


def test_transformer_analytics_policies_and_work_orders_e2e():
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

            # North engineer user
            north_eng = db.query(models.User).filter_by(email="engineer@vidyut.local").first()
            south_eng = db.query(models.User).filter_by(email="engineer@example.com").first()
            assert north_eng is not None and south_eng is not None
            north_eng_id = north_eng.id
            south_eng_id = south_eng.id
        finally:
            db.close()

        consumer = login(client, "consumer@vidyut.local", "Consumer@123")
        officer = login(client, "officer@vidyut.local", "Officer@123")  # North
        south_officer = login(client, "officer@example.com", "Officer@123")  # South
        engineer = login(client, "engineer@vidyut.local", "Engineer@123")  # North
        admin = login(client, "admin@vidyut.local", "Admin@123")

        # ----------------------------------------------------------------------
        # A. GET /transformer-analytics/summary
        # ----------------------------------------------------------------------
        # Consumer -> 403
        r = client.get("/transformer-analytics/summary", headers=consumer)
        assert r.status_code == 403

        # Engineer -> 403 (analytics summary is for officer & admin)
        r = client.get("/transformer-analytics/summary", headers=engineer)
        assert r.status_code == 403

        # Officer (North) -> Scoped to North
        r = client.get("/transformer-analytics/summary", headers=officer)
        assert r.status_code == 200
        data = r.json()
        assert data["zone_filter"] == "North"
        assert "total_transformers" in data
        assert "fleet_health_index" in data
        assert "status_counts" in data
        assert "risk_distribution" in data

        # Admin -> Cross-zone full summary
        r = client.get("/transformer-analytics/summary", headers=admin)
        assert r.status_code == 200
        admin_data = r.json()
        assert admin_data["zone_filter"] is None
        assert admin_data["total_transformers"] >= 3
        assert "zone_breakdown" in admin_data
        assert "North" in admin_data["zone_breakdown"]
        assert "South" in admin_data["zone_breakdown"]
        assert len(admin_data["top_risk_transformers"]) <= 10

        # ----------------------------------------------------------------------
        # B. GET /transformer-policies & POST /transformer-policies
        # ----------------------------------------------------------------------
        # Consumer -> 403
        r = client.get("/transformer-policies", headers=consumer)
        assert r.status_code == 403

        # Officer -> 403
        r = client.get("/transformer-policies", headers=officer)
        assert r.status_code == 403

        # Admin GET -> 200 with seeded policies
        r = client.get("/transformer-policies", headers=admin)
        assert r.status_code == 200
        policies = r.json()
        assert policies["total"] >= 2
        classes = [p["transformer_class"] for p in policies["items"]]
        assert "DISTRIBUTION_11KV_DEMO" in classes or "POWER_66KV_DEMO" in classes

        # Officer POST -> 403
        policy_payload = {
            "transformer_class": "SOLAR_INVERTER_STEPUP",
            "version": "v2026.11-solar",
            "thresholds": {
                "overload_pct_warning": 100.0,
                "overload_pct_critical": 115.0,
                "oil_temp_c_warning": 80.0,
                "oil_temp_c_critical": 90.0,
            },
            "source_evidence": "CEA_RENEWABLE_GRID_CODE_2026",
        }
        r = client.post("/transformer-policies", json=policy_payload, headers=officer)
        assert r.status_code == 403

        # Admin POST -> 201 Created & Audited
        r = client.post("/transformer-policies", json=policy_payload, headers=admin)
        assert r.status_code == 201
        created_policy = r.json()
        assert created_policy["transformer_class"] == "SOLAR_INVERTER_STEPUP"
        assert created_policy["version"] == "v2026.11-solar"
        assert created_policy["approved_by"] is not None

        # Verify in DB audit log
        db = SessionLocal()
        try:
            audit_entry = (
                db.query(models.AuditLog)
                .filter(models.AuditLog.action == "TRANSFORMER_POLICY_CREATED")
                .order_by(models.AuditLog.created_at.desc())
                .first()
            )
            assert audit_entry is not None
            assert "SOLAR_INVERTER_STEPUP" in (audit_entry.detail or "")
        finally:
            db.close()

        # ----------------------------------------------------------------------
        # C. POST /transformers/{id}/maintenance-work-orders
        # ----------------------------------------------------------------------
        # Consumer -> 403
        wo_payload = {
            "work_order_type": "TRANSFORMER_OVERLOAD_INSPECTION",
            "priority": "HIGH",
            "assigned_engineer_id": north_eng_id,
            "description": "Investigate recurring overload alerts on North-01",
            "recommended_action": "Thermal camera scan and load tap changer check",
        }
        r = client.post(f"/transformers/{north_tr_id}/maintenance-work-orders", json=wo_payload, headers=consumer)
        assert r.status_code == 403

        # Engineer -> 403
        r = client.post(f"/transformers/{north_tr_id}/maintenance-work-orders", json=wo_payload, headers=engineer)
        assert r.status_code == 403

        # South Officer -> 403 on North transformer
        r = client.post(f"/transformers/{north_tr_id}/maintenance-work-orders", json=wo_payload, headers=south_officer)
        assert r.status_code == 403
        assert "outside your assigned" in r.json()["detail"]

        # North Officer assigning South engineer -> 400 Bad Request (zone mismatch)
        mismatched_payload = dict(wo_payload, assigned_engineer_id=south_eng_id)
        r = client.post(f"/transformers/{north_tr_id}/maintenance-work-orders", json=mismatched_payload, headers=officer)
        assert r.status_code == 400
        assert "belongs to 'South'" in r.json()["detail"]

        # North Officer -> 201 Created on North transformer with North engineer
        r = client.post(f"/transformers/{north_tr_id}/maintenance-work-orders", json=wo_payload, headers=officer)
        assert r.status_code == 201
        wo_data = r.json()
        assert wo_data["transformer_id"] == north_tr_id
        assert wo_data["utility_asset_code"] == "DEMO-TR-NORTH-01"
        assert wo_data["work_order_id"].startswith("WO-TR-DEMO-TR-NORTH-01-")
        assert wo_data["status"] == "DISPATCHED"
        assert wo_data["assigned_engineer_id"] == north_eng_id

        # Verify InspectionRecord created in DB
        db = SessionLocal()
        try:
            insp = (
                db.query(models.InspectionRecord)
                .filter(models.InspectionRecord.work_order_id == wo_data["work_order_id"])
                .first()
            )
            assert insp is not None
            assert insp.review_status == "PENDING"
            assert insp.assigned_to == north_eng_id

            # Verify audit log
            wo_audit = (
                db.query(models.AuditLog)
                .filter(models.AuditLog.action == "TRANSFORMER_WORK_ORDER_CREATED")
                .order_by(models.AuditLog.created_at.desc())
                .first()
            )
            assert wo_audit is not None
            assert wo_data["work_order_id"] in (wo_audit.detail or "")
        finally:
            db.close()

        # Admin CRITICAL work order transitions transformer to MAINTENANCE
        critical_wo = {
            "work_order_type": "EMERGENCY_DEGAS_REPAIR",
            "priority": "CRITICAL",
            "assigned_engineer_id": None,
            "description": "High combustible gas level detected",
        }
        r = client.post(f"/transformers/{south_tr_id}/maintenance-work-orders", json=critical_wo, headers=admin)
        assert r.status_code == 201
        assert r.json()["status"] == "PENDING_ASSIGNMENT"

        db = SessionLocal()
        try:
            south_tr_db = db.query(models.TransformerAsset).filter_by(id=south_tr_id).first()
            assert south_tr_db.status == "MAINTENANCE"
        finally:
            db.close()

        # ----------------------------------------------------------------------
        # D. POST /transformers/{id}/assessments & GET /transformers/{id}/assessments
        # ----------------------------------------------------------------------
        # Consumer -> 403 on POST
        r = client.post(f"/transformers/{north_tr_id}/assessments", headers=consumer)
        assert r.status_code == 403

        # South Officer -> 403 on North transformer
        r = client.post(f"/transformers/{north_tr_id}/assessments", headers=south_officer)
        assert r.status_code == 403

        # North Officer -> 201 Created
        r = client.post(f"/transformers/{north_tr_id}/assessments", headers=officer)
        assert r.status_code == 201
        assess = r.json()
        assert assess["transformer_id"] == north_tr_id
        assert 0.0 <= assess["risk_probability"] <= 1.0
        assert 0.0 <= assess["uncertainty"] <= 1.0
        assert assess["prediction_horizon"] in ["7D", "30D"]
        assert "features" in assess
        assert "utilization_pct" in assess["features"]
        assert len(assess["explanation"]) > 0
        assert assess["human_decision"] == "PENDING"

        # GET /transformers/{id}/assessments
        # Consumer -> 403
        r = client.get(f"/transformers/{north_tr_id}/assessments", headers=consumer)
        assert r.status_code == 403

        # North Officer -> 200 OK
        r = client.get(f"/transformers/{north_tr_id}/assessments", headers=officer)
        assert r.status_code == 200
        history = r.json()
        assert history["transformer_id"] == north_tr_id
        assert history["total"] >= 1
        assert history["items"][0]["id"] == assess["id"]

        # ----------------------------------------------------------------------
        # E. POST /transformers/{id}/assessments/{id}/decision (HITL Governance)
        # ----------------------------------------------------------------------
        # Consumer -> 403
        r = client.post(
            f"/transformers/{north_tr_id}/assessments/{assess['id']}/decision",
            headers=consumer,
            json={"decision": "ACCEPTED", "notes": "Approved by supervisor"},
        )
        assert r.status_code == 403

        # North Officer -> 200 OK
        r = client.post(
            f"/transformers/{north_tr_id}/assessments/{assess['id']}/decision",
            headers=officer,
            json={"decision": "ACCEPTED", "notes": "Approved by supervisor"},
        )
        assert r.status_code == 200
        dec_res = r.json()
        assert dec_res["human_decision"] == "ACCEPTED"

        # ----------------------------------------------------------------------
        # F. GET /transformers/{id}/health
        # ----------------------------------------------------------------------
        # Consumer -> 403
        r = client.get(f"/transformers/{north_tr_id}/health", headers=consumer)
        assert r.status_code == 403

        # North Officer -> 200 OK
        r = client.get(f"/transformers/{north_tr_id}/health", headers=officer)
        assert r.status_code == 200
        h_res = r.json()
        assert h_res["transformer_id"] == north_tr_id
        assert "health_score" in h_res
        assert "data_freshness" in h_res

        # ----------------------------------------------------------------------
        # G. GET /transformers/{id}/maintenance-history
        # ----------------------------------------------------------------------
        # Consumer -> 403
        r = client.get(f"/transformers/{north_tr_id}/maintenance-history", headers=consumer)
        assert r.status_code == 403

        # North Officer -> 200 OK
        r = client.get(f"/transformers/{north_tr_id}/maintenance-history", headers=officer)
        assert r.status_code == 200
        mh_res = r.json()
        assert mh_res["transformer_id"] == north_tr_id
        assert "items" in mh_res

        # ----------------------------------------------------------------------
        # H. GET & POST /transformer-policies/risk-model-mode
        # ----------------------------------------------------------------------
        # Consumer -> 403
        r = client.get("/transformer-policies/risk-model-mode", headers=consumer)
        assert r.status_code == 403

        # Officer -> GET 200 (read-only allowed for officer)
        r = client.get("/transformer-policies/risk-model-mode", headers=officer)
        assert r.status_code == 200
        assert "mode" in r.json()

        # Officer POST -> 403 (Admin-only toggle)
        r = client.post("/transformer-policies/risk-model-mode", headers=officer, json={"mode": "rules_baseline"})
        assert r.status_code == 403

        # Admin POST -> 200 OK
        r = client.post("/transformer-policies/risk-model-mode", headers=admin, json={"mode": "rules_baseline"})
        assert r.status_code == 200
        assert r.json()["mode"] == "rules_baseline"

        # Restore mode back to ml_advisory
        r = client.post("/transformer-policies/risk-model-mode", headers=admin, json={"mode": "ml_advisory"})
        assert r.status_code == 200
        assert r.json()["mode"] == "ml_advisory"

