"""End-to-end tests for the simulated Discom ERP webhook adapter (Item #16):
field mappings, automatic & manual sync logs, failed-sync queue, retry recovery,
zone-scoped RBAC, and audit hash-chain integrity."""
import os
import sys
import uuid

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from test_flow import login


def _create_request(c, consumer_headers, zone="North"):
    r = c.post(
        "/requests",
        headers=consumer_headers,
        json={
            "applicant_name": "ERP Adapter Test Consumer",
            "phone": "9876543210",
            "address": f"{zone} Circle, Gujarat",
            "zone": zone,
            "request_type": "new_connection",
            "description": "new commercial connection for retail unit",
            "requested_load_kw": 8.5,
            "tariff_category": "Commercial (NRGP)",
            "phase": "3-Phase",
            "document_name": "shop_act.pdf",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_erp_mappings_and_rbac_boundaries():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        officer = login(c, "officer@vidyut.local", "Officer@123")

        req = _create_request(c, consumer)

        for forbidden in (consumer, engineer):
            assert c.get("/erp/mappings", headers=forbidden).status_code == 403
            assert c.get("/erp/logs", headers=forbidden).status_code == 403
            assert c.post(f"/erp/sync/{req['id']}", headers=forbidden).status_code == 403

        res = c.get("/erp/mappings", headers=officer)
        assert res.status_code == 200
        body = res.json()
        assert body["is_simulated"] is True
        assert "not connected to live ugvcl" in body["disclosure"].lower()
        assert len(body["mappings"]) == 10
        assert {m["erp_field"] for m in body["mappings"]} >= {
            "EXT_SERVICE_ORDER_ID",
            "BP_PARTNER_FULL_NAME",
            "BP_PRIMARY_MOBILE_IN",
            "DISCOM_CIRCLE_CODE",
            "ISU_RATE_CATEGORY",
            "SUPPLY_PHASE_CODE",
            "CONTRACTED_LOAD_KW",
            "ISU_WORKFLOW_STAGE",
            "ISU_DEVICE_SERIAL_NO",
            "EVENT_UTC_TIMESTAMP",
        }


def test_automatic_erp_handoff_failed_queue_and_meter_retry():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        officer = login(c, "officer@vidyut.local", "Officer@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        admin = login(c, "admin@vidyut.local", "Admin@123")

        req = _create_request(c, consumer, zone="North")
        rid = req["id"]

        # 1. Officer sanction approval -> automatic SANCTION_APPROVED SYNCED log
        assert c.patch(f"/requests/{rid}/status", headers=officer, json={"status": "APPROVED"}).status_code == 200
        logs_after_approve = [
            x for x in c.get("/erp/logs", headers=officer).json()["items"] if x["request_id"] == rid
        ]
        assert len(logs_after_approve) == 1
        approved_log = logs_after_approve[0]
        assert approved_log["status"] == "SYNCED"
        assert approved_log["event_type"] == "SANCTION_APPROVED"
        assert approved_log["mapped_payload"]["DISCOM_CIRCLE_CODE"] == "UGVCL-CIR-N01"
        assert approved_log["mapped_payload"]["ISU_RATE_CATEGORY"] == "LT_COM_NRGP"
        assert approved_log["mapped_payload"]["SUPPLY_PHASE_CODE"] == "3P_415V_AC"
        assert approved_log["mapped_payload"]["ISU_WORKFLOW_STAGE"] == "SANCTION_RELEASED"

        # 2. Field engineer completes WITHOUT meter_serial -> request completes, ERP handoff parks in FAILED queue
        sync_res = c.post(
            "/requests/field-sync",
            headers=engineer,
            json={"client_uuid": str(uuid.uuid4()), "request_id": rid, "task_status": "COMPLETED", "meter_serial": ""},
        )
        assert sync_res.status_code == 200 and sync_res.json()["synced"] is True

        failed_logs = [
            x
            for x in c.get("/erp/logs?status=FAILED", headers=officer).json()["items"]
            if x["request_id"] == rid
        ]
        assert len(failed_logs) == 1
        failed_entry = failed_logs[0]
        assert failed_entry["event_type"] == "METER_COMMISSIONED"
        assert "ISU_DEVICE_SERIAL_NO" in failed_entry["error_message"]

        # 3. Retry without meter_serial stays FAILED (attempt_count increments to 2)
        still_failed = c.post(f"/erp/logs/{failed_entry['id']}/retry", headers=officer, json={})
        assert still_failed.status_code == 200
        assert still_failed.json()["status"] == "FAILED"
        assert still_failed.json()["attempt_count"] == 2

        # 4. Retry supplying meter_serial succeeds -> SYNCED (attempt_count == 3), and second retry returns 409
        recovered = c.post(
            f"/erp/logs/{failed_entry['id']}/retry",
            headers=officer,
            json={"meter_serial": "UGVCL-SM-2026-5501"},
        )
        assert recovered.status_code == 200
        rec_body = recovered.json()
        assert rec_body["status"] == "SYNCED"
        assert rec_body["attempt_count"] == 3
        assert rec_body["erp_reference_id"].startswith("SIM-ERP-N01-")
        assert rec_body["mapped_payload"]["ISU_DEVICE_SERIAL_NO"] == "UGVCL-SM-2026-5501"

        assert c.post(f"/erp/logs/{failed_entry['id']}/retry", headers=officer, json={}).status_code == 409

        # 5. Hash-chained audit log remains 100% valid
        chain = c.get("/requests/audit/verify", headers=admin).json()
        assert chain["ok"] is True


def test_simulated_timeout_injection_and_officer_zone_isolation():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        north_officer = login(c, "officer@vidyut.local", "Officer@123")
        south_officer = login(c, "officer@example.com", "Officer@123")

        north_req = _create_request(c, consumer, zone="North")
        nid = north_req["id"]

        # South officer cannot trigger or view North request ERP syncs
        assert c.post(f"/erp/sync/{nid}", headers=south_officer, json={"simulate_failure": True}).status_code == 403

        sim_fail = c.post(f"/erp/sync/{nid}", headers=north_officer, json={"simulate_failure": True})
        assert sim_fail.status_code == 200
        log_id = sim_fail.json()["id"]
        assert sim_fail.json()["status"] == "FAILED"
        assert "503" in sim_fail.json()["error_message"]

        south_visible_ids = {x["id"] for x in c.get("/erp/logs", headers=south_officer).json()["items"]}
        assert log_id not in south_visible_ids
        assert c.post(f"/erp/logs/{log_id}/retry", headers=south_officer, json={}).status_code == 403

        retried = c.post(f"/erp/logs/{log_id}/retry", headers=north_officer, json={})
        assert retried.status_code == 200 and retried.json()["status"] == "SYNCED"
