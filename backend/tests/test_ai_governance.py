"""Tests for AI Governance, Model Monitoring, API Versioning & Human Approval (Item #25)."""
import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from test_flow import login


def test_api_v1_prefix_rewrite_and_version_header():
    with TestClient(app) as c:
        h1 = c.get("/health")
        h2 = c.get("/v1/health")
        assert h1.status_code == 200 and h2.status_code == 200
        assert h1.json() == h2.json()
        assert h1.headers.get("X-API-Version") == "v1"
        assert h2.headers.get("X-API-Version") == "v1"

        admin = login(c, "admin@vidyut.local", "Admin@123")
        v1_reqs = c.get("/v1/requests", headers=admin)
        raw_reqs = c.get("/requests", headers=admin)
        assert v1_reqs.status_code == 200
        assert len(v1_reqs.json()) == len(raw_reqs.json())


def test_ai_governance_rbac_and_model_registry_contract():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        officer = login(c, "officer@vidyut.local", "Officer@123")
        admin = login(c, "admin@vidyut.local", "Admin@123")

        for forbidden in (consumer, engineer):
            assert c.get("/assistant/ai-governance", headers=forbidden).status_code == 403
            assert c.get("/v1/assistant/ai-governance", headers=forbidden).status_code == 403

        off_res = c.get("/v1/assistant/ai-governance", headers=officer)
        assert off_res.status_code == 200
        gov = c.get("/v1/assistant/ai-governance", headers=admin).json()

        assert gov["api_version"] == "v1"
        assert "/v1" in gov["supported_version_prefixes"]
        assert "synthetic" in gov["disclosure"].lower()
        assert len(gov["model_registry"]) == 3
        for m in gov["model_registry"]:
            assert m["held_out_accuracy"] > m["majority_baseline"]


def test_ai_governance_tracks_live_inferences_ood_caps_and_human_only_approvals():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        officer = login(c, "officer@vidyut.local", "Officer@123")
        admin = login(c, "admin@vidyut.local", "Admin@123")

        before = c.get("/v1/assistant/ai-governance", headers=admin).json()
        base_cls = before["monitoring"]["runtime_counters"]["classification_inferences"]
        base_ood = before["monitoring"]["runtime_counters"]["ood_capped_load_inputs"]
        base_human = before["advisory_governance"]["verified_human_officer_decisions"]

        # 1. Submit an out-of-distribution (>100 kW) request -> triggers OOD cap + NEEDS_CORRECTION
        ood_req = c.post(
            "/v1/requests",
            headers=consumer,
            json={
                "applicant_name": "OOD Governance Test",
                "phone": "9876543210",
                "address": "Mehsana North",
                "zone": "North",
                "request_type": "new_connection",
                "description": "factory power setup",
                "requested_load_kw": 250.0,
                "document_name": "id.pdf",
            },
        )
        assert ood_req.status_code == 201
        assert ood_req.json()["status"] == "NEEDS_CORRECTION"

        # 2. Submit a valid request & have human officer approve after field verification
        ok_req = c.post(
            "/v1/requests",
            headers=consumer,
            json={
                "applicant_name": "Human Approval Proof",
                "phone": "9876543210",
                "address": "Mehsana North",
                "zone": "North",
                "request_type": "billing_dispute",
                "description": "check slab tariff",
                "requested_load_kw": 2.0,
            },
        )
        assert ok_req.status_code == 201
        rid = ok_req.json()["id"]
        assert c.patch(
            f"/v1/requests/{rid}/status",
            headers=officer,
            json={"status": "APPROVED", "notes": "Officer reviewed tariff ledger"},
        ).status_code == 200

        after = c.get("/v1/assistant/ai-governance", headers=admin).json()
        assert after["monitoring"]["runtime_counters"]["classification_inferences"] >= base_cls + 2
        assert after["monitoring"]["runtime_counters"]["ood_capped_load_inputs"] >= base_ood + 1
        assert after["advisory_governance"]["models_can_approve_or_reject"] is False
        assert after["advisory_governance"]["ai_auto_approvals_or_rejections"] == 0
        assert after["advisory_governance"]["verified_human_officer_decisions"] == base_human + 1
        assert after["advisory_governance"]["every_score_has_reasons"] is True
