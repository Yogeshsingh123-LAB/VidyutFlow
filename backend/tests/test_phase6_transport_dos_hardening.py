import pytest
from fastapi.testclient import TestClient

from app.config import Settings, settings
from app.main import app


def test_oversized_json_payload_dos_rejection(monkeypatch):
    monkeypatch.setattr(settings, "max_json_body_bytes", 1024)

    with TestClient(app) as client:
        # Huge JSON payload exceeding max_json_body_bytes
        oversized_data = "x" * 2048
        res = client.post(
            "/requests",
            content=f'{{"applicant_name": "{oversized_data}"}}',
            headers={"Content-Type": "application/json"},
        )
        assert res.status_code == 413, res.text
        assert "exceeds maximum allowed size" in res.json()["detail"]


def test_security_and_permissions_headers_present():
    with TestClient(app) as client:
        res = client.get("/health")
        assert res.status_code == 200
        headers = res.headers

        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-Frame-Options") == "DENY"
        assert headers.get("Referrer-Policy") == "no-referrer"
        assert "no-store" in headers.get("Cache-Control", "")
        assert headers.get("Permissions-Policy") == "camera=(), microphone=(), geolocation=(self)"

        csp = headers.get("Content-Security-Policy", "")
        assert "frame-ancestors 'none'" in csp
        assert "object-src 'none'" in csp
        assert "default-src 'self'" in csp


def test_production_hsts_and_cors_wildcard_validation(monkeypatch):
    # 1. Production startup blocks demo accounts
    monkeypatch.setattr(settings, "app_env", "production")
    with pytest.raises(RuntimeError, match="Production database contains seeded demo accounts"):
        with TestClient(app):
            pass

    # 2. Production HSTS header includes preload when running clean
    monkeypatch.setattr("app.main.reject_seeded_demo_accounts", lambda: None)
    with TestClient(app) as client:
        res = client.get("/health")
        hsts = res.headers.get("Strict-Transport-Security", "")
        assert "max-age=63072000" in hsts
        assert "includeSubDomains" in hsts
        assert "preload" in hsts

    # 3. Production settings reject wildcard '*' CORS origin
    with pytest.raises(ValueError, match="Production CORS origins must not contain wildcard"):
        Settings(
            app_env="production",
            secret_key="A" * 32,
            cors_origins="*",
        )
