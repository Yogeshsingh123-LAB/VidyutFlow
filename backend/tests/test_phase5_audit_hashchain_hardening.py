import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app
from app.models import AuditLog, User
from app.security import hash_password
from app.audit import verify_chain


def _auth_headers(client: TestClient, email: str, role: str, zone: str = "North") -> dict[str, str]:
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                name=f"Test {role.capitalize()}",
                role=role,
                zone=zone,
                hashed_password=hash_password("Hardened@2026!Sec"),
                is_active=True,
                mfa_enabled=False,
            )
            db.add(user)
            db.commit()

    res = client.post("/auth/login", data={"username": email, "password": "Hardened@2026!Sec"})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_audit_hash_chain_walk_and_anti_repudiation():
    with TestClient(app) as client:
        consumer = _auth_headers(client, "p5_consumer@example.com", "consumer", "North")
        admin = _auth_headers(client, "p5_admin@example.com", "admin", "North")

        # 1. Trigger various audited events
        # Failed login attempt
        client.post("/auth/login", data={"username": "nonexistent@example.com", "password": "WrongPassword!123"})

        # Successful request creation
        req_res = client.post(
            "/requests",
            headers=consumer,
            json={
                "applicant_name": "Audit Chain Applicant",
                "phone": "9876543210",
                "address": "Audit Square, Mehsana",
                "zone": "North",
                "request_type": "new_connection",
                "requested_load_kw": 2.5,
                "document_name": "id.pdf",
            },
        )
        assert req_res.status_code == 201
        req_id = req_res.json()["id"]

        # Status update by admin
        client.patch(
            f"/requests/{req_id}/status",
            headers=admin,
            json={"status": "APPROVED", "notes": "Approved in compliance audit"},
        )

        # 2. Verify audit chain from admin endpoint
        verify_res = client.get("/requests/audit/verify", headers=admin)
        assert verify_res.status_code == 200, verify_res.text
        report = verify_res.json()
        assert report["ok"] is True
        assert report["broken_at"] is None
        assert report["checked"] >= 3
        assert report["last_entry_hash"]


def test_tamper_detection_mutation_and_deletion():
    with TestClient(app) as client:
        admin = _auth_headers(client, "p5_tamper_admin@example.com", "admin", "North")

        with SessionLocal() as db:
            initial = verify_chain(db)
            assert initial["ok"] is True

            # Grab a chained row to mutate
            row = db.query(AuditLog).filter(AuditLog.entry_hash != "").first()
            assert row is not None
            original_detail = row.detail
            target_id = row.id

            # Mutate detail field
            row.detail = "MUTATED_BY_ATTACKER_UNAUTHORIZED"
            db.commit()

            # Tamper verification should immediately catch broken link
            tampered_report = verify_chain(db)
            assert tampered_report["ok"] is False
            assert tampered_report["broken_at"] == target_id

            # Revert mutation
            row = db.get(AuditLog, target_id)
            row.detail = original_detail
            db.commit()

            # Chain heals back
            healed = verify_chain(db)
            assert healed["ok"] is True


def test_siem_events_and_cef_export():
    with TestClient(app) as client:
        admin = _auth_headers(client, "p5_siem_admin@example.com", "admin", "North")
        consumer = _auth_headers(client, "p5_siem_consumer@example.com", "consumer", "North")

        # Non-admin forbidden
        assert client.get("/system/siem-events", headers=consumer).status_code == 403

        # JSON SIEM export
        res_json = client.get("/system/siem-events?limit=20", headers=admin)
        assert res_json.status_code == 200
        siem_data = res_json.json()
        assert siem_data["schema"] == "vidyutflow.siem.v1"
        assert "events" in siem_data
        assert siem_data["audit_chain_integrity"]["valid"] is True

        # CEF SIEM export
        res_cef = client.get("/system/siem-events?format=cef&limit=20", headers=admin)
        assert res_cef.status_code == 200
        assert "text/plain" in res_cef.headers["Content-Type"]
        cef_text = res_cef.text
        assert "CEF:0|UGVCL|VidyutFlow|1.0|" in cef_text
        assert "AUDIT_CHAIN_VERIFY" in cef_text


def test_security_posture_verification():
    with TestClient(app) as client:
        admin = _auth_headers(client, "p5_posture_admin@example.com", "admin", "North")
        consumer = _auth_headers(client, "p5_posture_consumer@example.com", "consumer", "North")

        # Non-admin forbidden
        assert client.get("/system/security-posture", headers=consumer).status_code == 403

        # Admin posture self-test
        posture_res = client.get("/system/security-posture", headers=admin)
        assert posture_res.status_code == 200
        posture = posture_res.json()
        assert posture["encryption_at_rest"]["roundtrip_verified"] is True
        assert posture["encryption_at_rest"]["tamper_tag_rejection_verified"] is True
        assert posture["application_defenses"]["xss_defense_verified"] is True
        assert posture["audit_and_siem"]["hash_chain_valid"] is True
