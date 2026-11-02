import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app
from app.models import ConnectionRequest, User
from app.security import hash_password


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


def test_xss_payload_sanitization_in_requests():
    with TestClient(app) as client:
        consumer = _auth_headers(client, "p4_consumer_xss@example.com", "consumer", "North")

        xss_form = {
            "applicant_name": "<script>alert('pwned')</script>Ramesh Patel",
            "phone": "9876543210",
            "address": "<img src=x onerror=alert('xss')>Plot 42, Modhera Road",
            "zone": "North",
            "request_type": "new_connection",
            "description": "<iframe src='javascript:alert(1)'></iframe>Need standard single-phase supply",
            "requested_load_kw": 3.0,
            "document_name": "id.pdf",
            "pin_code": "384002",
        }

        # 1. JSON POST /requests
        res = client.post("/requests", headers=consumer, json=xss_form)
        assert res.status_code == 201, res.text
        data = res.json()
        assert "<script" not in data["applicant_name"].lower()
        assert "<img" not in data["address"].lower()
        assert "onerror=" not in data["address"].lower()
        assert "<iframe" not in data["description"].lower()
        assert "javascript:" not in data["description"].lower()
        assert "Ramesh Patel" in data["applicant_name"]
        assert "Plot 42, Modhera Road" in data["address"]

        # 2. Multipart POST /requests/with-document
        with_doc_res = client.post(
            "/requests/with-document",
            headers=consumer,
            data={**xss_form, "applicant_name": "<svg onload=alert(2)>Suresh Shah"},
            files={"document": ("proof.pdf", b"%PDF-1.4\nvalid", "application/pdf")},
        )
        assert with_doc_res.status_code == 201, with_doc_res.text
        doc_data = with_doc_res.json()
        assert "<svg" not in doc_data["applicant_name"].lower()
        assert "onload=" not in doc_data["applicant_name"].lower()
        assert "Suresh Shah" in doc_data["applicant_name"]


def test_xss_sanitization_in_user_registration():
    with TestClient(app) as client:
        reg_payload = {
            "email": "p4_xss_reg@example.com",
            "password": "ValidPass#2026!Sec",
            "name": "<script>evil()</script>Deepak Mehta",
            "role": "consumer",
            "zone": "North",
        }
        res = client.post("/auth/register", json=reg_payload)
        assert res.status_code == 201, res.text
        data = res.json()
        assert "<script" not in data["name"].lower()
        assert "Deepak Mehta" in data["name"]


def test_pin_code_validation_in_workflow_and_premises():
    with TestClient(app) as client:
        consumer = _auth_headers(client, "p4_consumer_pin@example.com", "consumer", "North")

        base_req = {
            "applicant_name": "Pincode Test",
            "phone": "9876543210",
            "address": "Mehsana Highway",
            "zone": "North",
            "request_type": "new_connection",
            "requested_load_kw": 2.0,
            "document_name": "id.pdf",
        }

        # 1. Valid 6-digit Indian PIN code -> ROUTED / ASSIGNED
        ok_res = client.post("/requests", headers=consumer, json={**base_req, "pin_code": "384001"})
        assert ok_res.status_code == 201, ok_res.text
        assert ok_res.json()["status"] in ("ROUTED", "ASSIGNED")

        # 2. Invalid PIN codes (letters, too short, leading zero, symbols) -> NEEDS_CORRECTION
        for bad_pin in ("123", "abcdef", "012345", "3840019", "384-01"):
            bad_res = client.post("/requests", headers=consumer, json={**base_req, "pin_code": bad_pin})
            assert bad_res.status_code == 201, bad_res.text
            assert bad_res.json()["status"] == "NEEDS_CORRECTION"
            assert any(issue["code"] == "PIN_CODE_INVALID" for issue in bad_res.json()["validation_issues"])

        # 3. Saved premise rejects invalid PIN code with 422
        premise_bad = client.post(
            "/auth/premises",
            headers=consumer,
            json={
                "label": "Test Premise",
                "applicant_name": "Pin Test",
                "phone": "9876543210",
                "address": "Modhera Circle",
                "zone": "North",
                "pin_code": "invalid_pin",
            },
        )
        assert premise_bad.status_code == 422


def test_sqli_payload_handled_safely_as_literals():
    with TestClient(app) as client:
        consumer = _auth_headers(client, "p4_consumer_sqli@example.com", "consumer", "North")

        # SQL Injection attempt in text fields
        sqli_name = "Robert'); DROP TABLE users;--"
        sqli_address = "' OR '1'='1"
        res = client.post(
            "/requests",
            headers=consumer,
            json={
                "applicant_name": sqli_name,
                "phone": "9876543210",
                "address": sqli_address,
                "zone": "North",
                "request_type": "new_connection",
                "requested_load_kw": 2.0,
                "document_name": "id.pdf",
            },
        )
        assert res.status_code == 201, res.text
        req_id = res.json()["id"]

        # Verify users table still exists and caller can be fetched
        with SessionLocal() as db:
            user = db.query(User).filter(User.email == "p4_consumer_sqli@example.com").first()
            assert user is not None
            req = db.get(ConnectionRequest, req_id)
            assert req is not None
            # Stored safely as literal string
            assert "Robert'); DROP TABLE users;--" in req.applicant_name


def test_status_update_and_field_sync_notes_sanitized():
    with TestClient(app) as client:
        consumer = _auth_headers(client, "p4_consumer_notes@example.com", "consumer", "North")
        officer = _auth_headers(client, "p4_officer_notes@example.com", "officer", "North")

        create_res = client.post(
            "/requests",
            headers=consumer,
            json={
                "applicant_name": "Notes Test",
                "phone": "9876543210",
                "address": "North Sector 5",
                "zone": "North",
                "request_type": "new_connection",
                "requested_load_kw": 2.0,
                "document_name": "id.pdf",
            },
        )
        assert create_res.status_code == 201
        req_id = create_res.json()["id"]

        # Officer updates status with XSS in notes
        patch_res = client.patch(
            f"/requests/{req_id}/status",
            headers=officer,
            json={
                "status": "APPROVED",
                "notes": "<script>alert('officer')</script>Sanctioned after meter review",
            },
        )
        assert patch_res.status_code == 200, patch_res.text
        updated = patch_res.json()
        assert "<script" not in updated["validation_notes"].lower()
        assert "Sanctioned after meter review" in updated["validation_notes"]
