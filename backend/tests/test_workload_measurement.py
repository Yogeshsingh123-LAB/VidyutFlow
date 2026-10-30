"""Tests for Costed 3-Tier Infrastructure Proposal (#26) & Workload Measurement (#27)."""
import os
import sys
import uuid

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from test_flow import login

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def test_costed_three_tier_infrastructure_proposal_completeness():
    infra_path = os.path.join(REPO_ROOT, "docs", "INFRASTRUCTURE_ROADMAP.md")
    assert os.path.isfile(infra_path)
    text = open(infra_path, encoding="utf-8").read()
    # Must contain Small, Medium, Large tiers with INR CAPEX, OPEX, and RPO/RTO targets
    for required_token in (
        "Tier 1 — Small",
        "Tier 2 — Medium",
        "Tier 3 — Large",
        "CAPEX",
        "OPEX",
        "RPO",
        "RTO",
        "₹",
        "indicative",
    ):
        assert required_token in text, f"Missing {required_token} in INFRASTRUCTURE_ROADMAP.md"
    assert "no prices are quoted here" not in text.lower()


def test_empirical_workload_reduction_zero_retyping_and_handoffs():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        officer = login(c, "officer@vidyut.local", "Officer@123")

        consumer_payload = {
            "applicant_name": "Workload Audit Applicant",
            "phone": "9876543210",
            "address": "Plot 11, Mehsana North",
            "zone": "North",
            "pin_code": "384002",
            "request_type": "new_connection",
            "description": "new electricity connection for residence",
            "requested_load_kw": 3.5,
            "document_name": "kyc.pdf",
            "tariff_category": "Residential (RGPU)",
            "phase": "1-Phase",
            "premises_type": "Owned",
        }
        r1 = c.post("/v1/requests", headers=consumer, json=consumer_payload)
        assert r1.status_code == 201
        created = r1.json()
        rid = created["id"]
        # 0 manual routing handoffs: already ASSIGNED to both zone officer & field engineer
        assert created["status"] == "ASSIGNED"
        assert created["assigned_officer_id"] and created["assigned_engineer_id"]

        # Staff mutation 1: Field verify (0 applicant fields re-typed)
        assert (
            c.post(
                "/v1/requests/field-sync",
                headers=engineer,
                json={
                    "client_uuid": str(uuid.uuid4()),
                    "request_id": rid,
                    "task_status": "FIELD_VERIFIED",
                    "notes": "LT pole 15m",
                },
            ).status_code
            == 200
        )

        # Staff mutation 2: Officer approve (0 applicant fields re-typed)
        assert (
            c.patch(
                f"/v1/requests/{rid}/status",
                headers=officer,
                json={"status": "APPROVED", "notes": "Sanctioned"},
            ).status_code
            == 200
        )

        # Staff mutation 3: Field meter commission (only 1 new field: meter_serial)
        assert (
            c.post(
                "/v1/requests/field-sync",
                headers=engineer,
                json={
                    "client_uuid": str(uuid.uuid4()),
                    "request_id": rid,
                    "task_status": "COMPLETED",
                    "meter_serial": "UGV-MTR-8812",
                },
            ).status_code
            == 200
        )

        # Verify ERP payload auto-mapped without manual re-keying
        erp_items = c.get("/v1/erp/logs?status=SYNCED", headers=officer).json()["items"]
        matched = [x for x in erp_items if x["request_id"] == rid]
        assert len(matched) >= 2
        assert matched[0]["mapped_payload"]["BP_PARTNER_FULL_NAME"] == "Workload Audit Applicant"
        assert matched[0]["mapped_payload"]["ISU_DEVICE_SERIAL_NO"] == "UGV-MTR-8812"
