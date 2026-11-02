"""Tests for Real-Data Executive Analytics API (Item #24):
RBAC, officer zone isolation, live DB recomputation across requests, load,
ERP syncs, field updates, and provenance honesty."""
import os
import sys
import uuid

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from test_flow import login


def test_executive_analytics_rbac_and_zone_isolation():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        south_officer = login(c, "officer@example.com", "Officer@123")
        admin = login(c, "admin@vidyut.local", "Admin@123")

        for forbidden in (consumer, engineer):
            assert c.get("/requests/kpis/executive-analytics", headers=forbidden).status_code == 403

        south_res = c.get("/requests/kpis/executive-analytics", headers=south_officer)
        assert south_res.status_code == 200
        south_body = south_res.json()
        assert {z["zone"] for z in south_body["by_zone_matrix"]}.issubset({"South"})

        admin_res = c.get("/requests/kpis/executive-analytics", headers=admin)
        assert admin_res.status_code == 200
        admin_body = admin_res.json()
        assert {"North", "South"}.issubset({z["zone"] for z in admin_body["by_zone_matrix"]})


def test_executive_analytics_recomputes_live_from_database_mutations():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        admin = login(c, "admin@vidyut.local", "Admin@123")

        before = c.get("/requests/kpis/executive-analytics", headers=admin).json()
        base_total = before["overview"]["total_requests"]
        base_load = before["overview"]["total_requested_load_kw"]
        base_field = before["overview"]["field_sync_count"]

        created = c.post(
            "/requests",
            headers=consumer,
            json={
                "applicant_name": "Executive Live Metric Applicant",
                "phone": "9876543210",
                "address": "Mehsana North",
                "zone": "North",
                "request_type": "load_extension",
                "description": "commercial load extension",
                "requested_load_kw": 12.5,
                "document_name": "load_doc.pdf",
            },
        )
        assert created.status_code == 201
        req_id = created.json()["id"]

        after_submit = c.get("/requests/kpis/executive-analytics", headers=admin).json()
        assert after_submit["overview"]["total_requests"] == base_total + 1
        assert round(after_submit["overview"]["total_requested_load_kw"] - base_load, 2) == 12.5

        # Field engineer sync updates field_sync_count immediately
        sync = c.post(
            "/requests/field-sync",
            headers=engineer,
            json={
                "client_uuid": str(uuid.uuid4()),
                "request_id": req_id,
                "task_status": "FIELD_VERIFIED",
                "notes": "Feeder checked",
            },
        )
        assert sync.status_code == 200
        after_sync = c.get("/requests/kpis/executive-analytics", headers=admin).json()
        assert after_sync["overview"]["field_sync_count"] == base_field + 1


def test_executive_analytics_data_provenance_contract():
    with TestClient(app) as c:
        mgmt = login(c, "management@vidyutflow.demo", "Demo@12345")
        res = c.get("/requests/kpis/executive-analytics", headers=mgmt)
        assert res.status_code == 200
        prov = res.json()["data_provenance"]
        assert "zone_sla_matrix" in prov["live_db_backed"]
        assert "scada_feeder_telemetry_kv_mw" in prov["simulated_roadmap_streams"]
        assert "simulated" in prov["disclosure"].lower()
