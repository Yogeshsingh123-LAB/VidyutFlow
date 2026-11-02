"""End-to-end tests for the Operational Alert Engine (Item #17):
SLA breach risk, unassigned > Xh, repeated zone failures, simulated SMS/Email
outbox + PII masking, idempotent deduplication, zone RBAC, and audit hash chain."""
import os
import sys
from datetime import datetime, timedelta, timezone

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.db import SessionLocal
from app.main import app
from app.models import AuditLog, ConnectionRequest, User
from test_flow import login


def test_alert_endpoints_rbac_and_officer_zone_scoping():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        north_officer = login(c, "officer@vidyut.local", "Officer@123")
        south_officer = login(c, "officer@example.com", "Officer@123")

        for forbidden in (consumer, engineer):
            assert c.get("/notifications/alerts/dispatches", headers=forbidden).status_code == 403
            assert c.post("/notifications/alerts/evaluate", headers=forbidden).status_code == 403

        assert c.post("/notifications/alerts/evaluate", headers=north_officer, json={}).status_code == 200
        north_items = c.get("/notifications/alerts/dispatches", headers=north_officer).json()["items"]
        assert north_items and all(item["zone"] == "North" for item in north_items)

        south_items = c.get("/notifications/alerts/dispatches", headers=south_officer).json()["items"]
        assert all(item["zone"] == "South" for item in south_items)

        # Officer with blank zone fails closed
        with SessionLocal() as db:
            u = db.query(User).filter(User.email == "officer@example.com").one()
            orig_zone = u.zone
            u.zone = ""
            db.commit()
        try:
            empty_res = c.get("/notifications/alerts/dispatches", headers=south_officer).json()
            assert empty_res["items"] == []
            assert empty_res["summary"]["total"] == 0
        finally:
            with SessionLocal() as db:
                db.query(User).filter(User.email == "officer@example.com").one().zone = orig_zone
                db.commit()


def test_sla_breach_unassigned_stale_and_repeated_zone_failure_rules_with_idempotent_dedup():
    zone_name = "UnstaffedAlertZone"
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        admin = login(c, "admin@vidyut.local", "Admin@123")
        assert c.post(
            "/staff/zones",
            headers=admin,
            json={"code": zone_name, "display_name": "Unstaffed Alert Subdivision", "circle_name": "Mehsana Circle"},
        ).status_code == 201

        # Request 1: Critical hazard + unstaffed zone (ROUTED, unassigned)
        r1 = c.post(
            "/requests",
            headers=consumer,
            json={
                "applicant_name": "Hazard Stale Applicant",
                "phone": "9876543210",
                "address": "Sector 9, Gujarat",
                "zone": zone_name,
                "description": "live wire hanging near house sparking fire danger",
                "requested_load_kw": 35.0,
                "document_name": "photo.jpg",
            },
        )
        assert r1.status_code == 201
        rid1 = r1.json()["id"]

        # Backdate created_at by 6 hours and ensure sla_breach_risk >= 0.70 so both Rule 1 & Rule 2 match
        with SessionLocal() as db:
            row1 = db.get(ConnectionRequest, rid1)
            row1.created_at = datetime.now(timezone.utc) - timedelta(hours=6)
            row1.sla_breach_risk = max(float(row1.sla_breach_risk or 0.0), 0.88)
            db.commit()

        # Request 2: Missing document -> NEEDS_CORRECTION in same zone (brings abnormal count in zone to 2 -> Rule 3)
        r2 = c.post(
            "/requests",
            headers=consumer,
            json={
                "applicant_name": "Second Zone Failure",
                "phone": "9123456789",
                "address": "Sector 10, Gujarat",
                "zone": zone_name,
                "description": "new agricultural connection",
                "requested_load_kw": 5.0,
                "document_name": "",
            },
        )
        assert r2.status_code == 201

        # Evaluate all rules as admin
        sweep1 = c.post(
            "/notifications/alerts/evaluate",
            headers=admin,
            json={"sla_risk_threshold": 0.70, "unassigned_hours": 4.0, "zone_failure_threshold": 2},
        )
        assert sweep1.status_code == 200
        dispatches_all = c.get("/notifications/alerts/dispatches", headers=admin).json()
        assert dispatches_all["is_simulated"] is True
        assert "no external telecom" in dispatches_all["disclosure"].lower()

        zone_items = [x for x in dispatches_all["items"] if x["zone"] == zone_name]
        fired_rules = {x["rule_code"] for x in zone_items}
        assert fired_rules == {"SLA_BREACH_RISK", "UNASSIGNED_STALE", "REPEATED_ZONE_FAILURES"}

        # Each rule produces IN_APP, SIMULATED_SMS, and SIMULATED_EMAIL (3 * 3 = 9 rows)
        assert len(zone_items) == 9
        assert {x["channel"] for x in zone_items} == {"IN_APP", "SIMULATED_SMS", "SIMULATED_EMAIL"}

        # Verify PII phone masking on SIMULATED_SMS
        sms_rows = [x for x in zone_items if x["channel"] == "SIMULATED_SMS" and x["request_id"] == rid1]
        assert sms_rows and all(x["recipient"] == "+91-XXXXXX3210" for x in sms_rows)
        assert all("9876543210" not in x["recipient"] for x in sms_rows)

        # Second immediate sweep is 100% idempotent (0 duplicate dispatches)
        sweep2 = c.post(
            "/notifications/alerts/evaluate",
            headers=admin,
            json={"sla_risk_threshold": 0.70, "unassigned_hours": 4.0, "zone_failure_threshold": 2},
        )
        assert sweep2.status_code == 200
        assert sweep2.json()["newly_dispatched"] == 0


def test_alert_dispatches_write_hash_chained_audit_logs():
    with TestClient(app) as c:
        admin = login(c, "admin@vidyut.local", "Admin@123")
        c.post("/notifications/alerts/evaluate", headers=admin, json={})

        with SessionLocal() as db:
            alert_audits = db.query(AuditLog).filter(AuditLog.action == "ALERT_DISPATCHED").all()
            assert len(alert_audits) >= 1
            assert all(a.entry_hash for a in alert_audits)

        verify = c.get("/requests/audit/verify", headers=admin)
        assert verify.status_code == 200 and verify.json()["ok"] is True
