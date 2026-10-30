"""Comprehensive backend tests for teammate backlog items (#1, #4, #8, #18, #21, #23, #28, #29, #30)."""
from concurrent.futures import ThreadPoolExecutor
import json
import os
import subprocess
import sys
import tempfile
import uuid

import pytest

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.audit import audit, verify_chain
from app.config import settings
from app.db import SessionLocal
from app.login_limit import LoginLimiter
from app.main import app
from app.uploads import decrypt_upload_at_rest, encrypt_upload_at_rest
from test_flow import login

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BACKEND_DIR = os.path.join(REPO_ROOT, "backend")


def test_item1_and_item30_zone_validation_and_admin_staff_assignment():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        admin = login(c, "admin@vidyut.local", "Admin@123")

        # Item #1: Unknown and blank zones are rejected with 422 on both JSON and multipart endpoints
        for bad_zone in ("", "   ", "MarsSector9", "Unknown_Zone_XYZ"):
            r_json = c.post(
                "/v1/requests",
                headers=consumer,
                json={
                    "applicant_name": "Bad Zone Test",
                    "phone": "9876543210",
                    "address": "Test Address",
                    "zone": bad_zone,
                    "document_name": "id.pdf",
                },
            )
            assert r_json.status_code == 422, bad_zone

            r_doc = c.post(
                "/v1/requests/with-document",
                headers=consumer,
                data={
                    "applicant_name": "Bad Zone Multipart",
                    "phone": "9876543210",
                    "address": "Test Address",
                    "zone": bad_zone,
                },
                files={"document": ("id.txt", b"kyc proof", "text/plain")},
            )
            assert r_doc.status_code == 422, bad_zone

        # Case-insensitive normalization ("north" -> "North")
        r_norm = c.post(
            "/v1/requests",
            headers=consumer,
            json={
                "applicant_name": "Lowercase North",
                "phone": "9876543210",
                "address": "Mehsana",
                "zone": "  north ",
                "document_name": "id.pdf",
            },
        )
        assert r_norm.status_code == 201
        assert r_norm.json()["zone"] == "North"

        # Item #30: Admin creates a new zone, consumer submits (ROUTED), Admin assigns staff -> auto-claimed!
        z_code = f"SubDiv_{uuid.uuid4().hex[:6]}"
        assert c.get("/v1/staff/members", headers=consumer).status_code == 403
        zc = c.post(
            "/v1/staff/zones",
            headers=admin,
            json={
                "code": z_code,
                "display_name": "Deesa Rural Subdivision",
                "circle_name": "Palanpur Circle",
            },
        )
        assert zc.status_code == 201

        stranded = c.post(
            "/v1/requests",
            headers=consumer,
            json={
                "applicant_name": "Waiting For Staff",
                "phone": "9876543210",
                "address": "Deesa Highway",
                "zone": z_code,
                "document_name": "id.pdf",
            },
        ).json()
        assert stranded["status"] == "ROUTED"
        assert stranded["assigned_officer_id"] == ""
        assert stranded["assigned_engineer_id"] == ""

        # Onboard Officer + Engineer in z_code -> automatically claims the stranded request!
        off_res = c.post(
            "/v1/staff/members",
            headers=admin,
            json={
                "email": f"off.{z_code.lower()}@vidyut.local",
                "name": "Deesa Officer",
                "role": "officer",
                "zone": z_code,
                "password": "Officer@123",
            },
        )
        assert off_res.status_code == 201
        assert off_res.json()["claimed_requests"] == 1

        eng_res = c.post(
            "/v1/staff/members",
            headers=admin,
            json={
                "email": f"eng.{z_code.lower()}@vidyut.local",
                "name": "Deesa Engineer",
                "role": "engineer",
                "zone": z_code,
                "password": "Engineer@123",
            },
        )
        assert eng_res.status_code == 201
        assert eng_res.json()["claimed_requests"] == 1

        refreshed = c.get(f"/v1/requests/{stranded['id']}", headers=admin).json()
        assert refreshed["status"] == "ASSIGNED"
        assert refreshed["assigned_officer_id"] == off_res.json()["id"]
        assert refreshed["assigned_engineer_id"] == eng_res.json()["id"]


def test_item4_concurrent_audit_writes_never_fork_hash_chain():
    with TestClient(app):
        def _worker(idx: int) -> str:
            db = SessionLocal()
            try:
                actor = type("Actor", (), {"id": f"worker-{idx}", "role": "admin"})()
                row = audit(
                    db,
                    actor,
                    "CONCURRENT_WRITE_TEST",
                    "concurrency_probe",
                    f"probe-{idx}",
                    f"thread={idx}",
                )
                db.commit()
                return row.entry_hash
            finally:
                db.close()

        with ThreadPoolExecutor(max_workers=10) as pool:
            hashes = list(pool.map(_worker, range(25)))

        assert len(set(hashes)) == 25
        with SessionLocal() as verify_db:
            report = verify_chain(verify_db)
            assert report["ok"] is True, report
            assert report["broken_at"] is None


def test_item8_item18_item21_cookie_auth_sso_encryption_and_redis_rate_limiter(monkeypatch):
    with TestClient(app) as c:
        # Item #8 & #21: HttpOnly cookie authentication without Bearer header
        login_res = c.post(
            "/v1/auth/login?use_cookie=true",
            data={"username": "consumer@vidyut.local", "password": "Consumer@123"},
        )
        assert login_res.status_code == 200
        set_cookie = login_res.headers.get("set-cookie", "")
        assert "vidyutflow_access_token=" in set_cookie
        assert "httponly" in set_cookie.lower()

        # TestClient retains cookie jar -> /auth/me works with zero Authorization header
        me_cookie = c.get("/v1/auth/me")
        assert me_cookie.status_code == 200
        assert me_cookie.json()["email"] == "consumer@vidyut.local"

        # Logout clears cookie
        assert c.post("/v1/auth/logout").status_code == 200
        assert c.get("/v1/auth/me").status_code == 401

        # Item #18: Simulated OIDC / Parichay SSO
        providers = c.get("/v1/auth/sso/providers").json()
        assert providers["is_simulated"] is True
        assert len(providers["providers"]) >= 2

        sso_ok = c.post(
            "/v1/auth/sso/login",
            json={
                "provider_id": "parichay-gujarat-demo",
                "email": "officer@vidyut.local",
                "state": "csrf-state-token-12345",
            },
        )
        assert sso_ok.status_code == 200
        assert sso_ok.json()["sso_simulated"] is True
        assert sso_ok.json()["role"] == "officer"

        # Simulated SSO must hard-fail in production
        monkeypatch.setattr(settings, "app_env", "production")
        sso_prod = c.post(
            "/v1/auth/sso/login",
            json={
                "provider_id": "parichay-gujarat-demo",
                "email": "officer@vidyut.local",
                "state": "csrf-state-token-12345",
            },
        )
        assert sso_prod.status_code == 403
        monkeypatch.setattr(settings, "app_env", "development")

    # Item #21: AES-256-GCM upload encryption at rest + tamper rejection
    secret = "super-secret-master-key-for-at-rest-aes-gcm"
    raw_doc = b"%PDF-1.7 synthetic consumer KYC deed"
    blob = encrypt_upload_at_rest(raw_doc, secret, aad=b"req-123")
    assert blob != raw_doc and raw_doc not in blob
    assert decrypt_upload_at_rest(blob, secret, aad=b"req-123") == raw_doc
    tampered = bytearray(blob)
    tampered[-1] ^= 0xFF
    with pytest.raises(Exception):
        decrypt_upload_at_rest(bytes(tampered), secret, aad=b"req-123")
    with pytest.raises(Exception):
        decrypt_upload_at_rest(blob, secret, aad=b"wrong-req")

    # Item #21: Central Redis rate-limiter path
    class _FakePipe:
        def __init__(self, store, key):
            self.store = store
            self.key = key

        def incr(self, key, amt):
            self.store[key] = self.store.get(key, 0) + amt
            return self

        def ttl(self, _key):
            return self

        def execute(self):
            return [self.store[self.key], 45]

    class _FakeRedis:
        def __init__(self):
            self.counts = {}

        def pipeline(self):
            return _FakePipe(self.counts, "vidyutflow:rl:test:10.0.0.5")

        def expire(self, _k, _w):
            return True

    limiter = LoginLimiter(attempts=2, window=60, redis_url="redis://mock", namespace="vidyutflow:rl:test")
    limiter._redis = _FakeRedis()
    limiter.check("10.0.0.5")
    limiter.check("10.0.0.5")
    with pytest.raises( Exception ) as exc_info:
        limiter.check("10.0.0.5")
    assert getattr(exc_info.value, "status_code", None) == 429


def test_item28_and_item29_gps_coordinates_and_reusable_saved_premises():
    with TestClient(app) as c:
        c.cookies.clear()
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")

        # Item #29: Seeded saved premises returned on GET /auth/premises
        prem_list = c.get("/v1/auth/premises", headers=consumer)
        assert prem_list.status_code == 200
        assert len(prem_list.json()["items"]) >= 2

        new_prem = c.post(
            "/v1/auth/premises",
            headers=consumer,
            json={
                "label": "Farm Pump — Unjha",
                "applicant_name": "Demo Consumer",
                "phone": "9876543210",
                "address": "Survey 44, Unjha Highway",
                "zone": "North",
                "pin_code": "384170",
                "latitude": 23.8037,
                "longitude": 72.3912,
                "tariff_category": "Agricultural (AG)",
                "phase": "3-Phase",
                "premises_type": "Owned",
            },
        )
        assert new_prem.status_code == 201
        pid = new_prem.json()["id"]

        # Item #28: Submit request with GPS coordinates; reject half-specified or out-of-range coords
        bad_coord = c.post(
            "/v1/requests",
            headers=consumer,
            json={
                "applicant_name": "GPS Test",
                "phone": "9876543210",
                "address": "Unjha",
                "zone": "North",
                "latitude": 99.5,
                "longitude": 72.39,
                "document_name": "id.pdf",
            },
        )
        assert bad_coord.status_code == 422

        good_coord = c.post(
            "/v1/requests",
            headers=consumer,
            json={
                "applicant_name": new_prem.json()["applicant_name"],
                "phone": new_prem.json()["phone"],
                "address": new_prem.json()["address"],
                "zone": new_prem.json()["zone"],
                "pin_code": new_prem.json()["pin_code"],
                "latitude": new_prem.json()["latitude"],
                "longitude": new_prem.json()["longitude"],
                "document_name": "7_12_extract.pdf",
            },
        )
        assert good_coord.status_code == 201
        assert good_coord.json()["latitude"] == 23.8037
        assert good_coord.json()["longitude"] == 72.3912

        assert c.delete(f"/v1/auth/premises/{pid}", headers=consumer).status_code == 200


def test_item23_offsite_replication_script_verifies_checksum_and_manifest():
    with tempfile.TemporaryDirectory() as tmpdir:
        dummy_db = os.path.join(tmpdir, "vidyutflow-20261030-120000.db")
        with open(dummy_db, "wb") as fh:
            fh.write(b"SQLite format 3\x00synthetic-dr-test-payload")
        subprocess.run(
            ["sha256sum", os.path.basename(dummy_db)],
            cwd=tmpdir,
            stdout=open(dummy_db + ".sha256", "w"),
            check=True,
        )
        offsite_vault = os.path.join(tmpdir, "offsite_vault")
        env = dict(os.environ, OFFSITE_BACKUP_DIR=offsite_vault, DR_RPO_TARGET_MINUTES="60", DR_RTO_TARGET_MINUTES="120")
        proc = subprocess.run(
            ["bash", os.path.join(BACKEND_DIR, "scripts", "offsite_replicate.sh"), dummy_db],
            env=env,
            capture_output=True,
            text=True,
            check=True,
        )
        manifest = json.loads(proc.stdout.strip())
        assert manifest["offsite_verified"] is True
        assert manifest["rpo_target_minutes"] == 60
        assert manifest["rto_target_minutes"] == 120
        assert os.path.isfile(os.path.join(offsite_vault, "dr_manifest.json"))
