import os
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db import SessionLocal
from app.main import app
from app.models import ConnectionRequest, User
from app.security import hash_password
from app.uploads import decrypt_upload_at_rest, encrypt_upload_at_rest


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


BASE_FORM = {
    "applicant_name": "Phase 3 Applicant",
    "phone": "9876543210",
    "address": "Solar Park, Mehsana",
    "zone": "North",
    "request_type": "new_connection",
    "requested_load_kw": "3.0",
}


def test_dangerous_extensions_and_disguised_html_rejected(tmp_path, monkeypatch):
    vault = tmp_path / "vault"
    monkeypatch.setattr(settings, "upload_vault_dir", str(vault))

    with TestClient(app) as client:
        consumer = _auth_headers(client, "p3_consumer_a@example.com", "consumer", "North")

        # 1. Dangerous extensions rejected (.svg, .sh, .exe, .html)
        for bad_ext in ("payload.svg", "script.sh", "malware.exe", "index.html", "exploit.php"):
            res = client.post(
                "/requests/with-document",
                headers=consumer,
                data=BASE_FORM,
                files={"document": (bad_ext, b"some content", "application/octet-stream")},
            )
            assert res.status_code == 400, f"Expected 400 for {bad_ext}, got {res.status_code}: {res.text}"

        # 2. HTML/SVG script disguised as .txt rejected
        for script_body in (
            b"<script>alert(1)</script>",
            b"<!DOCTYPE html><html><body>Stored XSS</body></html>",
            b"<svg onload=alert(1)>",
            b"<?xml version='1.0'?><svg></svg>",
        ):
            res = client.post(
                "/requests/with-document",
                headers=consumer,
                data=BASE_FORM,
                files={"document": ("notes.txt", script_body, "text/plain")},
            )
            assert res.status_code == 400, f"Expected 400 for disguised script in .txt, got {res.status_code}"


def test_envelope_encryption_at_rest_and_tamper_detection(tmp_path, monkeypatch):
    vault = tmp_path / "vault"
    monkeypatch.setattr(settings, "upload_vault_dir", str(vault))

    with TestClient(app) as client:
        consumer = _auth_headers(client, "p3_consumer_enc@example.com", "consumer", "North")
        plain_pdf = b"%PDF-1.4\n%TOP-SECRET-CONFIDENTIAL-IDENTITY-DATA-98765\n%%EOF"

        res = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": ("kyc_passport.pdf", plain_pdf, "application/pdf")},
        )
        assert res.status_code == 201, res.text
        req_id = res.json()["id"]
        doc_name = res.json()["document_name"]
        assert doc_name == "kyc_passport.pdf"

        # Verify vault contains ciphertext starting with VFENC1
        enc_files = list(vault.glob("*_kyc_passport.pdf.enc"))
        assert len(enc_files) == 1
        cipher_bytes = enc_files[0].read_bytes()
        assert cipher_bytes.startswith(b"VFENC1")

        # Verify plaintext is nowhere on disk in ciphertext
        assert b"TOP-SECRET-CONFIDENTIAL-IDENTITY-DATA" not in cipher_bytes

        # Verify legitimate decryption recovers original payload
        decrypted = decrypt_upload_at_rest(cipher_bytes, settings.secret_key, aad=b"kyc_passport.pdf")
        assert decrypted == plain_pdf

        # Verify AAD mismatch (e.g. file renamed or transposed) fails decryption
        with pytest.raises(Exception):
            decrypt_upload_at_rest(cipher_bytes, settings.secret_key, aad=b"different_name.pdf")

        # Verify bit-flip tamper detection: flipping 1 byte causes failure
        tampered_bytes = bytearray(cipher_bytes)
        tampered_bytes[-1] ^= 0x01
        with pytest.raises(Exception):
            decrypt_upload_at_rest(bytes(tampered_bytes), settings.secret_key, aad=b"kyc_passport.pdf")


def test_secure_document_retrieval_and_access_control(tmp_path, monkeypatch):
    vault = tmp_path / "vault"
    monkeypatch.setattr(settings, "upload_vault_dir", str(vault))

    with TestClient(app) as client:
        owner_headers = _auth_headers(client, "p3_owner@example.com", "consumer", "North")
        attacker_headers = _auth_headers(client, "p3_attacker@example.com", "consumer", "North")
        south_officer = _auth_headers(client, "p3_officer_south@example.com", "officer", "South")
        north_officer = _auth_headers(client, "p3_officer_north@example.com", "officer", "North")
        assigned_eng = _auth_headers(client, "p3_eng_assigned@example.com", "engineer", "North")
        other_eng = _auth_headers(client, "p3_eng_other@example.com", "engineer", "North")
        admin_headers = _auth_headers(client, "p3_admin@example.com", "admin", "North")

        pdf_content = b"%PDF-1.4\n%AUTHENTICATED-DOCUMENT-DOWNLOAD-TEST\n%%EOF"
        create_res = client.post(
            "/requests/with-document",
            headers=owner_headers,
            data=BASE_FORM,
            files={"document": ("ownership_deed.pdf", pdf_content, "application/pdf")},
        )
        assert create_res.status_code == 201, create_res.text
        req_id = create_res.json()["id"]

        # Assign engineer to request in DB
        with SessionLocal() as db:
            eng_user = db.query(User).filter(User.email == "p3_eng_assigned@example.com").first()
            r = db.get(ConnectionRequest, req_id)
            r.assigned_engineer_id = eng_user.id
            db.commit()

        # 1. Owner can download document with secure headers
        owner_get = client.get(f"/requests/{req_id}/document", headers=owner_headers)
        assert owner_get.status_code == 200, owner_get.text
        assert owner_get.content == pdf_content
        assert owner_get.headers["Content-Disposition"] == 'attachment; filename="ownership_deed.pdf"'
        assert owner_get.headers["X-Content-Type-Options"] == "nosniff"
        assert owner_get.headers["Cache-Control"] == "no-store, private"
        assert owner_get.headers["Content-Type"] == "application/pdf"

        # 2. BOLA: Another consumer cannot download document (403)
        attacker_get = client.get(f"/requests/{req_id}/document", headers=attacker_headers)
        assert attacker_get.status_code == 403, attacker_get.text

        # 3. Cross-zone officer cannot download document (403)
        south_get = client.get(f"/requests/{req_id}/document", headers=south_officer)
        assert south_get.status_code == 403, south_get.text

        # 4. Same-zone subdivision officer CAN download document (200)
        north_get = client.get(f"/requests/{req_id}/document", headers=north_officer)
        assert north_get.status_code == 200, north_get.text
        assert north_get.content == pdf_content

        # 5. Assigned engineer CAN download document (200)
        eng_get = client.get(f"/requests/{req_id}/document", headers=assigned_eng)
        assert eng_get.status_code == 200, eng_get.text
        assert eng_get.content == pdf_content

        # 6. Unassigned engineer CANNOT download document (403)
        unassigned_get = client.get(f"/requests/{req_id}/document", headers=other_eng)
        assert unassigned_get.status_code == 403, unassigned_get.text

        # 7. Administrator CAN download document (200)
        admin_get = client.get(f"/requests/{req_id}/document", headers=admin_headers)
        assert admin_get.status_code == 200, admin_get.text
        assert admin_get.content == pdf_content

        # 8. Nonexistent request returns 404
        assert client.get("/requests/nonexistent_id/document", headers=admin_headers).status_code == 404

        # 9. Request without document returns 404
        no_doc_res = client.post(
            "/requests",
            headers=owner_headers,
            json={**BASE_FORM, "requested_load_kw": 3.0, "document_name": ""},
        )
        assert no_doc_res.status_code == 201
        no_doc_id = no_doc_res.json()["id"]
        assert client.get(f"/requests/{no_doc_id}/document", headers=owner_headers).status_code == 404
