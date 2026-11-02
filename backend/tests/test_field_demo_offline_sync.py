"""End-to-end verification of Field Portal demo accounts, seeded assignments,
offline UUID sync idempotency, and stale-state conflict responses (Item #22)."""
import os
import sys
import uuid

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app, seed, seed_requests
from test_flow import login


def test_portal_field_demo_accounts_have_live_tasks_and_offline_sync_handles_dedup_and_conflicts():
    with TestClient(app) as c:
        seed()
        seed_requests()

        field_zala = login(c, "field@vidyutflow.demo", "Demo@12345")
        field_vikram = login(c, "vikramaditya.solanki@vidyutflow.demo", "Demo@12345")
        officer = login(c, "employee@vidyutflow.demo", "Demo@12345")

        zala_tasks = c.get("/requests", headers=field_zala).json()
        vikram_tasks = c.get("/requests", headers=field_vikram).json()
        assert len(zala_tasks) >= 1, "field@vidyutflow.demo must see at least 1 seeded assigned request"
        assert len(vikram_tasks) >= 1, "vikramaditya.solanki@vidyutflow.demo must see at least 1 seeded assigned request"

        # 1. Offline sync + UUID de-duplication on Zala's assigned task
        target_id = zala_tasks[0]["id"]
        client_uuid = str(uuid.uuid4())
        sync_payload = {
            "client_uuid": client_uuid,
            "request_id": target_id,
            "task_status": "FIELD_VERIFIED",
            "notes": "Offline feasibility inspection completed",
            "meter_serial": "UGVCL-OFF-101",
            "created_offline_at": "2026-10-30T10:15:00Z",
        }
        first = c.post("/requests/field-sync", headers=field_zala, json=sync_payload)
        assert first.status_code == 200 and first.json()["synced"] is True
        second = c.post("/requests/field-sync", headers=field_zala, json=sync_payload)
        assert second.status_code == 200 and second.json()["duplicate"] is True

        # 2. Stale offline entry conflicting with officer terminal decision returns 409
        conflict_id = vikram_tasks[0]["id"]
        reject_res = c.patch(
            f"/requests/{conflict_id}/status",
            headers=officer,
            json={"status": "REJECTED", "notes": "Rejected during office verification"},
        )
        assert reject_res.status_code == 200

        stale_sync = c.post(
            "/requests/field-sync",
            headers=field_vikram,
            json={
                "client_uuid": str(uuid.uuid4()),
                "request_id": conflict_id,
                "task_status": "COMPLETED",
                "notes": "Recorded while engineer had no signal",
                "meter_serial": "UGVCL-STALE-99",
                "created_offline_at": "2026-10-30T10:16:00Z",
            },
        )
        assert stale_sync.status_code == 409
        assert "REJECTED" in stale_sync.json()["detail"]
