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


def test_upload_size_limit_boundary_and_oversize_rejection(monkeypatch):
    monkeypatch.setattr(settings, "max_upload_bytes", 2048)
    with TestClient(app) as client:
        consumer = _consumer_headers(client)
        admin = _admin_headers(client)

        exact_ok = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": ("id_proof.pdf", b"x" * 2048, "application/pdf")},
        )
        assert exact_ok.status_code == 201, exact_ok.text
        assert exact_ok.json()["document_name"] == "id_proof.pdf"

        before_count = len(client.get("/requests", headers=admin).json())

        one_byte_over = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": ("id_proof.pdf", b"x" * 2049, "application/pdf")},
        )
        assert one_byte_over.status_code == 413, one_byte_over.text

        huge_payload = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": ("id_proof.pdf", b"x" * 80_000, "application/pdf")},
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
def test_multipart_filename_sanitising_normalizes_safe_names(raw_name, expected_name):
    with TestClient(app) as client:
        consumer = _consumer_headers(client)
        res = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": (raw_name, b"valid-bytes", "application/octet-stream")},
        )
        assert res.status_code == 201, res.text
        assert res.json()["document_name"] == expected_name


def test_multipart_long_filename_is_truncated_preserving_extension():
    with TestClient(app) as client:
        consumer = _consumer_headers(client)
        long_name = ("a" * 240) + ".PDF"
        res = client.post(
            "/requests/with-document",
            headers=consumer,
            data=BASE_FORM,
            files={"document": (long_name, b"valid-bytes", "application/pdf")},
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
