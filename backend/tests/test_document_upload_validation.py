import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


def _consumer_headers(client: TestClient) -> dict[str, str]:
    res = client.post(
        "/auth/login",
        data={"username": "consumer@vidyut.local", "password": "Consumer@123"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _admin_headers(client: TestClient) -> dict[str, str]:
    res = client.post(
        "/auth/login",
        data={"username": "admin@vidyut.local", "password": "Admin@123"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


BASE_FORM = {
    "applicant_name": "Upload Validation User",
    "phone": "9876543210",
    "address": "Mehsana, Gujarat",
    "zone": "North",
    "request_type": "new_connection",
    "requested_load_kw": "3.0",
}


def test_upload_size_limit_boundary_and_oversize_rejection(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "max_upload_bytes", 2048)
    monkeypatch.setattr(settings, "upload_vault_dir", str(tmp_path / "vault"))
    with TestClient(app) as client:
        consumer = _consumer_headers(client)
        admin = _admin_headers(client)

        pdf_prefix = b"%PDF-1.4\n"
        exact_ok = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": ("id_proof.pdf", pdf_prefix + b"x" * (2048 - len(pdf_prefix)), "application/pdf")},
        )
        assert exact_ok.status_code == 201, exact_ok.text
        assert exact_ok.json()["document_name"] == "id_proof.pdf"

        before_count = len(client.get("/requests", headers=admin).json())

        one_byte_over = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": ("id_proof.pdf", pdf_prefix + b"x" * (2049 - len(pdf_prefix)), "application/pdf")},
        )
        assert one_byte_over.status_code == 413, one_byte_over.text

        huge_payload = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": ("id_proof.pdf", pdf_prefix + b"x" * 80_000, "application/pdf")},
        )
        assert huge_payload.status_code == 413, huge_payload.text
        assert huge_payload.headers.get("X-Content-Type-Options") == "nosniff"

        empty_file = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": ("empty.pdf", b"", "application/pdf")},
        )
        assert empty_file.status_code == 400, empty_file.text

        after_count = len(client.get("/requests", headers=admin).json())
        assert after_count == before_count


def _valid_sample_bytes_for_name(name: str) -> bytes:
    low = name.lower()
    if low.endswith(".pdf"):
        return b"%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF"
    if low.endswith(".png"):
        return b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    if low.endswith((".jpg", ".jpeg")):
        return b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01"
    return b"valid utf-8 supporting text document"


@pytest.mark.parametrize(
    ("raw_name", "expected_name"),
    [
        ("../../id_proof.pdf", "id_proof.pdf"),
        (r"C:\Users\Meena\Documents\My Ownership Deed (2026)!.PDF", "My_Ownership_Deed_2026.pdf"),
        (".hidden_id.JPEG", "hidden_id.jpeg"),
        ("scan.v1.2.PNG", "scan_v1_2.png"),
        ("tricky.exe.pdf", "tricky_exe.pdf"),
        ("=formula-name.txt", "formula-name.txt"),
    ],
)
def test_multipart_filename_sanitising_normalizes_safe_names(raw_name, expected_name, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "upload_vault_dir", str(tmp_path / "vault"))
    with TestClient(app) as client:
        consumer = _consumer_headers(client)
        res = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": (raw_name, _valid_sample_bytes_for_name(expected_name), "application/octet-stream")},
        )
        assert res.status_code == 201, res.text
        assert res.json()["document_name"] == expected_name


def test_multipart_long_filename_is_truncated_preserving_extension(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "upload_vault_dir", str(tmp_path / "vault"))
    with TestClient(app) as client:
        consumer = _consumer_headers(client)
        long_name = ("a" * 240) + ".PDF"
        res = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": (long_name, b"%PDF-1.4\nvalid-bytes\n%%EOF", "application/pdf")},
        )
        assert res.status_code == 201, res.text
        saved = res.json()["document_name"]
        assert len(saved) == 120
        assert saved.endswith(".pdf")


@pytest.mark.parametrize(
    "bad_filename",
    [
        "../../etc/passwd",
        "payload.exe",
        "script.html",
        "vector.svg",
        "invoice.pdf.exe",
        "id\x00.pdf",
        "spoof\u202eexe.pdf",
        ".pdf",
        "..",
        "___---.pdf",
    ],
)
def test_multipart_rejects_dangerous_or_degenerate_filenames(bad_filename):
    with TestClient(app) as client:
        consumer = _consumer_headers(client)
        admin = _admin_headers(client)
        before_count = len(client.get("/requests", headers=admin).json())

        res = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": (bad_filename, b"content", "application/pdf")},
        )
        assert res.status_code == 400, f"Expected 400 for {bad_filename!r}, got {res.status_code}: {res.text}"
        assert len(client.get("/requests", headers=admin).json()) == before_count


def test_json_document_name_sanitises_labels_and_rejects_malicious_inputs():
    with TestClient(app) as client:
        consumer = _consumer_headers(client)
        admin = _admin_headers(client)

        # Standard UI checklist label continues to work
        ui_res = client.post(
            "/requests",
            headers=consumer,
            json={**BASE_FORM, "requested_load_kw": 3.0, "document_name": "Aadhaar Card (PDF, 420 KB)"},
        )
        assert ui_res.status_code == 201, ui_res.text
        assert ui_res.json()["document_name"] == "Aadhaar Card (PDF, 420 KB)"

        # Path traversal and HTML/CSV characters are stripped
        trav_res = client.post(
            "/requests",
            headers=consumer,
            json={
                **BASE_FORM,
                "requested_load_kw": 3.0,
                "document_name": "../../uploads/=cmd|<script>aadhaar</script>.pdf",
            },
        )
        assert trav_res.status_code == 201, trav_res.text
        cleaned = trav_res.json()["document_name"]
        assert "/" not in cleaned and "\\" not in cleaned
        assert "<" not in cleaned and ">" not in cleaned
        assert not cleaned.startswith(("=", "+", "-", "@", "."))

        # Empty/whitespace remains empty so missing-doc workflow check triggers NEEDS_CORRECTION
        missing_res = client.post(
            "/requests",
            headers=consumer,
            json={**BASE_FORM, "requested_load_kw": 3.0, "document_name": "   "},
        )
        assert missing_res.status_code == 201, missing_res.text
        assert missing_res.json()["document_name"] == ""
        assert missing_res.json()["status"] == "NEEDS_CORRECTION"

        # Null byte, bidi override, or degenerate dot-only string rejected with 400
        before_count = len(client.get("/requests", headers=admin).json())
        for invalid_ref in ("bad\x00name.pdf", "bad\u202ename.pdf", "..", "...", "==="):
            bad_res = client.post(
                "/requests",
                headers=consumer,
                json={**BASE_FORM, "requested_load_kw": 3.0, "document_name": invalid_ref},
            )
            assert bad_res.status_code == 400, f"Expected 400 for {invalid_ref!r}"
        assert len(client.get("/requests", headers=admin).json()) == before_count


@pytest.mark.parametrize(
    ("disguised_name", "spoofed_bytes"),
    [
        ("a.pdf", b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00PE_EXE_PAYLOAD"),
        ("a.pdf", b"\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00LINUX_ELF"),
        ("scan.png", b"MZ\x90\x00PE_DISGUISED_AS_PNG"),
        ("photo.jpg", b"\x7fELF\x02\x01ELF_DISGUISED_AS_JPEG"),
        ("photo.jpeg", b"%PDF-1.4\nPDF_DISGUISED_AS_JPEG"),
        ("fake.pdf", b"\x89PNG\r\n\x1a\nPNG_DISGUISED_AS_PDF"),
        ("fake.png", b"\xff\xd8\xff\xe0JPEG_DISGUISED_AS_PNG"),
        ("notes.txt", b"MZ\x90\x00PE_IN_TXT"),
        ("notes.txt", b"\x7fELF\x02\x01ELF_IN_TXT"),
        ("notes.txt", b"null\x00byte_binary_in_txt"),
        ("notes.txt", b"\xff\xfe\xfd\x80invalid_utf8_stream"),
    ],
)
def test_magic_byte_validation_rejects_disguised_executables_and_mismatched_headers(
    disguised_name, spoofed_bytes, monkeypatch, tmp_path
):
    vault = tmp_path / "vault"
    monkeypatch.setattr(settings, "upload_vault_dir", str(vault))
    monkeypatch.delenv("UPLOAD_VAULT_DIR", raising=False)
    with TestClient(app) as client:
        consumer = _consumer_headers(client)
        admin = _admin_headers(client)
        before_count = len(client.get("/requests", headers=admin).json())

        res = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": (disguised_name, spoofed_bytes, "application/pdf")},
        )
        assert res.status_code == 400, f"Disguised payload {disguised_name!r} should fail with 400, got {res.status_code}"
        assert len(client.get("/requests", headers=admin).json()) == before_count
        assert not vault.exists() or list(vault.glob("*.enc")) == []


def test_uploads_always_persisted_encrypted_in_default_vault_without_env_override(monkeypatch, tmp_path):
    from app.uploads import decrypt_upload_at_rest

    default_vault = tmp_path / "uploads_encrypted_default"
    monkeypatch.delenv("UPLOAD_VAULT_DIR", raising=False)
    monkeypatch.setattr(settings, "upload_vault_dir", str(default_vault))

    pdf_payload = b"%PDF-1.4\n%UGVCL-CITIZEN-KYC-PROOF-981122\n1 0 obj<<>>endobj\n%%EOF"
    with TestClient(app) as client:
        consumer = _consumer_headers(client)
        res = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": ("aadhaar_kyc.pdf", pdf_payload, "application/pdf")},
        )
        assert res.status_code == 201, res.text

    enc_files = list(default_vault.glob("*_aadhaar_kyc.pdf.enc"))
    assert len(enc_files) == 1
    cipher_blob = enc_files[0].read_bytes()
    assert cipher_blob.startswith(b"VFENC1")
    assert b"UGVCL-CITIZEN-KYC-PROOF" not in cipher_blob
    recovered = decrypt_upload_at_rest(cipher_blob, settings.secret_key, aad=b"aadhaar_kyc.pdf")
    assert recovered == pdf_payload

