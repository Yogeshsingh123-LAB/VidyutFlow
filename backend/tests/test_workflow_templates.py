"""End-to-end tests for Configurable Workflow Templates (Item #19):
seeded service templates, RBAC, template-driven document/load/SLA/field-dispatch
rules, custom template creation & deactivation, and hash-chained audit logs."""
import os
import sys
from datetime import datetime, timezone

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.db import SessionLocal
from app.main import app
from app.models import AuditLog
from test_flow import login


def test_seeded_templates_rbac_and_distinct_routing_rules():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        officer = login(c, "officer@vidyut.local", "Officer@123")

        res = c.get("/workflows/templates", headers=consumer)
        assert res.status_code == 200
        codes = {item["template_code"] for item in res.json()["items"]}
        assert {
            "new_connection",
            "load_extension",
            "meter_replacement",
            "billing_dispute",
            "outage_safety",
        }.issubset(codes)

        # Non-admins cannot create or mutate templates
        for hdr in (consumer, officer):
            assert c.post("/workflows/templates", headers=hdr, json={
                "template_code": "unauth_tpl",
                "name": "Unauthorized",
            }).status_code == 403
            assert c.patch("/workflows/templates/load_extension", headers=hdr, json={
                "sla_hours": 24,
            }).status_code == 403

        # meter_replacement: require_document=False, require_field_visit=True -> ASSIGNED without doc
        meter_req = c.post("/requests", headers=consumer, json={
            "applicant_name": "Meter Consumer",
            "phone": "9876543210",
            "address": "Mehsana North",
            "zone": "North",
            "request_type": "meter_replacement",
            "description": "",
            "requested_load_kw": 3.0,
            "document_name": "",
        })
        assert meter_req.status_code == 201
        m_data = meter_req.json()
        assert m_data["status"] == "ASSIGNED"
        assert m_data["category"] == "METER_FAULT"
        assert m_data["assigned_engineer_id"] is not None

        # billing_dispute: require_document=False, require_field_visit=False -> ROUTED (desk officer only)
        bill_req = c.post("/requests", headers=consumer, json={
            "applicant_name": "Billing Consumer",
            "phone": "9876543210",
            "address": "Mehsana North",
            "zone": "North",
            "request_type": "billing_dispute",
            "description": "",
            "requested_load_kw": 2.0,
            "document_name": "",
        })
        assert bill_req.status_code == 201
        b_data = bill_req.json()
        assert b_data["status"] == "ROUTED"
        assert b_data["category"] == "BILLING"
        assert b_data["assigned_officer_id"]
        assert not b_data["assigned_engineer_id"]

        # Unknown workflow template -> 400
        bad = c.post("/requests", headers=consumer, json={
            "applicant_name": "Bad Template",
            "phone": "9876543210",
            "address": "Mehsana North",
            "zone": "North",
            "request_type": "unknown_workflow_xyz",
            "requested_load_kw": 2.0,
        })
        assert bad.status_code == 400


def test_admin_updates_template_rules_and_drives_live_intake():
    with TestClient(app) as c:
        admin = login(c, "admin@vidyut.local", "Admin@123")
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")

        # Cannot deactivate default new_connection template
        assert c.patch(
            "/workflows/templates/new_connection",
            headers=admin,
            json={"is_active": False},
        ).status_code == 400

        try:
            patch_res = c.patch(
                "/workflows/templates/load_extension",
                headers=admin,
                json={"sla_hours": 36, "max_auto_load_kw": 20.0, "require_document": False},
            )
            assert patch_res.status_code == 200
            assert patch_res.json()["sla_hours"] == 36

            # 15 kW without doc -> passes & gets 36h SLA!
            before = datetime.now(timezone.utc)
            ok_req = c.post("/requests", headers=consumer, json={
                "applicant_name": "Extension OK",
                "phone": "9876543210",
                "address": "Mehsana",
                "zone": "North",
                "request_type": "load_extension",
                "description": "",
                "requested_load_kw": 15.0,
                "document_name": "",
            })
            assert ok_req.status_code == 201
            ok_json = ok_req.json()
            assert ok_json["status"] == "ASSIGNED"
            due = datetime.fromisoformat(ok_json["sla_due_at"].replace("Z", "+00:00"))
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            delta_hours = (due - before).total_seconds() / 3600.0
            assert 35.5 <= delta_hours <= 36.5

            # 25 kW exceeds template's 20 kW cap -> NEEDS_CORRECTION with threshold_kw == 20
            over_req = c.post("/requests", headers=consumer, json={
                "applicant_name": "Extension Over Cap",
                "phone": "9876543210",
                "address": "Mehsana",
                "zone": "North",
                "request_type": "load_extension",
                "description": "",
                "requested_load_kw": 25.0,
                "document_name": "",
            })
            assert over_req.status_code == 201
            over_json = over_req.json()
            assert over_json["status"] == "NEEDS_CORRECTION"
            assert any(
                x["code"] == "DEMO_LOAD_REVIEW" and x["threshold_kw"] == 20.0
                for x in over_json["validation_issues"]
            )
        finally:
            c.patch(
                "/workflows/templates/load_extension",
                headers=admin,
                json={"sla_hours": 48, "max_auto_load_kw": 100.0, "require_document": True},
            )


def test_custom_template_creation_deactivation_and_audit_chain():
    with TestClient(app) as c:
        admin = login(c, "admin@vidyut.local", "Admin@123")
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")

        created = c.post("/workflows/templates", headers=admin, json={
            "template_code": "solar_net_metering",
            "name": "Rooftop Solar Net Metering",
            "description": "Bi-directional net meter workflow",
            "default_category": "OTHER",
            "default_severity": "MEDIUM",
            "sla_hours": 60,
            "require_document": False,
            "require_field_visit": True,
            "max_auto_load_kw": 50.0,
            "steps": ["SUBMITTED", "SOLAR_CHECK", "FIELD_INSPECTION", "OFFICER_APPROVAL", "COMPLETED"],
        })
        assert created.status_code == 201

        # Duplicate code -> 409
        dup = c.post("/workflows/templates", headers=admin, json={
            "template_code": "solar_net_metering",
            "name": "Duplicate",
        })
        assert dup.status_code == 409

        # Consumer submits against custom template
        sub = c.post("/requests", headers=consumer, json={
            "applicant_name": "Solar Consumer",
            "phone": "9876543210",
            "address": "Mehsana",
            "zone": "North",
            "request_type": "solar_net_metering",
            "requested_load_kw": 5.0,
        })
        assert sub.status_code == 201
        assert sub.json()["request_type"] == "solar_net_metering"

        # Deactivate custom template -> hidden from consumer list & rejected on intake
        assert c.patch(
            "/workflows/templates/solar_net_metering",
            headers=admin,
            json={"is_active": False},
        ).status_code == 200
        consumer_codes = {x["template_code"] for x in c.get("/workflows/templates", headers=consumer).json()["items"]}
        assert "solar_net_metering" not in consumer_codes
        admin_codes = {
            x["template_code"]
            for x in c.get("/workflows/templates?include_inactive=true", headers=admin).json()["items"]
        }
        assert "solar_net_metering" in admin_codes

        assert c.post("/requests", headers=consumer, json={
            "applicant_name": "Solar Consumer",
            "phone": "9876543210",
            "address": "Mehsana",
            "zone": "North",
            "request_type": "solar_net_metering",
            "requested_load_kw": 5.0,
        }).status_code == 400

        with SessionLocal() as db:
            actions = {a.action for a in db.query(AuditLog).filter(AuditLog.entity == "workflow_template").all()}
            assert {"WORKFLOW_TEMPLATE_CREATED", "WORKFLOW_TEMPLATE_UPDATED"}.issubset(actions)

        verify = c.get("/requests/audit/verify", headers=admin)
        assert verify.status_code == 200 and verify.json()["ok"] is True
