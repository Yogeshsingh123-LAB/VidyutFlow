"""Backend tests for Phase 13 Work Order Evidence and Verification endpoints."""
import uuid
import os
import sys
import pytest

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from test_flow import login


def test_evidence_submission_idempotency_and_review_workflow():
    with TestClient(app) as client:
        engineer = login(client, "engineer@vidyut.local", "Engineer@123")
        officer = login(client, "officer@vidyut.local", "Officer@123")
        consumer = login(client, "consumer@vidyut.local", "Consumer@123")

        client_uuid = str(uuid.uuid4())
        wo_id = f"WO-TEST-{uuid.uuid4().hex[:6]}"

        evidence_payload = {
            "client_uuid": client_uuid,
            "work_order_id": wo_id,
            "complaint_id": "CMP-TEST-001",
            "evidence_type": "photo_after",
            "storage_ref": f"field_evidence_{client_uuid}",
            "file_size_bytes": 102400,
            "mime_type": "image/jpeg",
            "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "latitude": 23.5880,
            "longitude": 72.3693,
            "metadata_json": '{"step": "repair_transformer", "materials": "16mm cable"}'
        }

        # 1. Consumer cannot submit field evidence (RBAC 403)
        res_consumer_submit = client.post("/v1/evidence", headers=consumer, json=evidence_payload)
        assert res_consumer_submit.status_code == 403

        # 2. Field engineer submits evidence
        res_submit = client.post("/v1/evidence", headers=engineer, json=evidence_payload)
        assert res_submit.status_code == 201, res_submit.text
        data = res_submit.json()
        assert data["client_uuid"] == client_uuid
        assert data["work_order_id"] == wo_id
        assert data["verification_status"] == "pending_verification"
        evidence_id = data["id"]

        # 3. Idempotent replay: Resubmitting identical client_uuid returns existing record
        res_replay = client.post("/v1/evidence", headers=engineer, json=evidence_payload)
        assert res_replay.status_code == 201 or res_replay.status_code == 200
        assert res_replay.json()["id"] == evidence_id

        # 4. Query evidence for work order
        res_list = client.get(f"/v1/evidence/work-order/{wo_id}", headers=engineer)
        assert res_list.status_code == 200
        items = res_list.json()
        assert len(items) == 1
        assert items[0]["id"] == evidence_id

        # 5. Field engineer cannot verify evidence (officer/admin only)
        review_payload = {
            "verification_status": "approved",
            "review_remarks": "Photo clearly confirms proper replacement of damaged jumper and neutral connection."
        }
        res_eng_review = client.post(f"/v1/evidence/{evidence_id}/verify", headers=engineer, json=review_payload)
        assert res_eng_review.status_code == 403

        # 6. Officer verifies and approves evidence
        res_review = client.post(f"/v1/evidence/{evidence_id}/verify", headers=officer, json=review_payload)
        assert res_review.status_code == 200, res_review.text
        reviewed_data = res_review.json()
        assert reviewed_data["verification_status"] == "approved"
        assert reviewed_data["review_remarks"] == review_payload["review_remarks"]
        assert reviewed_data["reviewed_by"] is not None
        assert reviewed_data["reviewed_at"] is not None

        # 7. Check KPIs summary
        res_kpis = client.get("/v1/evidence/kpis/summary", headers=officer)
        assert res_kpis.status_code == 200
        kpis = res_kpis.json()
        assert kpis["total_evidence_items"] >= 1
        assert kpis["approved"] >= 1
