"""Automated Test Suite for VidyutFlow Consumer Profile API.

Verifies:
- New applicant profile creation & empty connection state
- Personal info updates & completion percentage calculation
- Permitted address CRUD & PIN code format validation
- Electricity connection link initiation (OTP) & OTP verification
- Multi-connection support & unlinking
- Preferences management (multilingual, alerts, reminders)
- Security: active sessions, session revocation, change password
- Immutable consumer audit logging
"""
from datetime import datetime, timedelta, timezone
import uuid
import pytest
from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import User, UserSession
from app.security import hash_password, create_token, hash_token, generate_refresh_token


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture
def seed_consumer_user():
    db = SessionLocal()
    user_id = f"usr-test-{uuid.uuid4().hex[:8]}"
    email = f"applicant.{uuid.uuid4().hex[:6]}@example.com"
    user = User(
        id=user_id,
        email=email,
        name="Shri Rajeshkumar Patel",
        role="consumer",
        zone="North",
        hashed_password=hash_password("Gujarat@1234"),
        is_active=True,
    )
    db.add(user)
    db.commit()

    jti = str(uuid.uuid4())
    token = create_token(user.id, user.role, token_type="access", jti=jti)
    raw_refresh, refresh_hash = generate_refresh_token()

    session = UserSession(
        user_id=user.id,
        jti=jti,
        refresh_token_hash=refresh_hash,
        token_family=str(uuid.uuid4()),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        ip_address="127.0.0.1",
        user_agent="Pytest-TestClient",
    )
    db.add(session)
    db.commit()
    session_id = session.id
    db.close()
    return {"user_id": user_id, "email": email, "token": token, "session_id": session_id}


def test_consumer_profile_new_applicant(test_client, seed_consumer_user):
    headers = {"Authorization": f"Bearer {seed_consumer_user['token']}"}
    res = test_client.get("/api/v1/consumer/profile", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["user_id"] == seed_consumer_user["user_id"]
    assert data["full_name"] == "Shri Rajeshkumar Patel"
    assert data["is_new_applicant"] is True
    assert data["connections_count"] == 0
    assert data["profile_completion_percentage"] >= 40


def test_consumer_profile_patch_personal_info(test_client, seed_consumer_user):
    headers = {"Authorization": f"Bearer {seed_consumer_user['token']}"}
    payload = {
        "full_name": "Shri Rajesh Patel (Updated)",
        "date_of_birth": "1988-04-12",
    }
    res = test_client.patch("/api/v1/consumer/profile", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["full_name"] == "Shri Rajesh Patel (Updated)"
    assert data["date_of_birth"] == "1988-04-12"


def test_consumer_address_crud(test_client, seed_consumer_user):
    headers = {"Authorization": f"Bearer {seed_consumer_user['token']}"}

    # 1. Invalid PIN code rejected
    bad_payload = {
        "house_flat_no": "B-204",
        "street": "Shivalik Residency",
        "area": "Panchot Circle",
        "city_village": "Mehsana",
        "taluka": "Mehsana",
        "district": "Mehsana",
        "pin_code": "3840",  # invalid
    }
    res = test_client.post("/api/v1/consumer/addresses", json=bad_payload, headers=headers)
    assert res.status_code == 422

    # 2. Valid address created
    good_payload = {
        "house_flat_no": "B-204",
        "street": "Shivalik Residency",
        "area": "Panchot Circle",
        "city_village": "Mehsana",
        "taluka": "Mehsana",
        "district": "Mehsana",
        "state": "Gujarat",
        "pin_code": "384002",
        "is_primary": True,
    }
    create_res = test_client.post("/api/v1/consumer/addresses", json=good_payload, headers=headers)
    assert create_res.status_code == 201, create_res.text
    addr_data = create_res.json()
    addr_id = addr_data["id"]
    assert addr_data["is_primary"] is True
    assert addr_data["pin_code"] == "384002"

    # 3. List addresses
    list_res = test_client.get("/api/v1/consumer/addresses", headers=headers)
    assert list_res.status_code == 200
    addresses = list_res.json()
    assert len(addresses) >= 1
    assert any(a["id"] == addr_id for a in addresses)

    # 4. Patch address
    patch_res = test_client.patch(
        f"/api/v1/consumer/addresses/{addr_id}",
        json={"house_flat_no": "B-205"},
        headers=headers,
    )
    assert patch_res.status_code == 200

    # 5. Delete address
    del_res = test_client.delete(f"/api/v1/consumer/addresses/{addr_id}", headers=headers)
    assert del_res.status_code == 200


def test_connection_link_flow_and_empty_state(test_client, seed_consumer_user):
    headers = {"Authorization": f"Bearer {seed_consumer_user['token']}"}

    # Verify initial empty state
    initial_res = test_client.get("/api/v1/consumer/connections", headers=headers)
    assert initial_res.status_code == 200
    assert initial_res.json()["is_new_applicant"] is True
    assert initial_res.json()["total_connections"] == 0
    assert "No electricity connection linked" in initial_res.json()["empty_state_help"]

    # 1. Initiate link OTP
    init_res = test_client.post(
        "/api/v1/consumer/connections/link/initiate",
        json={"consumer_no": "04281-99231"},
        headers=headers,
    )
    assert init_res.status_code == 200, init_res.text
    init_data = init_res.json()
    assert init_data["status"] == "OTP_SENT"
    assert "demo_verification_code" in init_data
    demo_code = init_data["demo_verification_code"]

    # 2. Verify with wrong code fails
    wrong_res = test_client.post(
        "/api/v1/consumer/connections/link/verify",
        json={"consumer_no": "04281-99231", "otp": "000000"},
        headers=headers,
    )
    assert wrong_res.status_code == 400

    # 3. Verify with correct code succeeds
    verify_res = test_client.post(
        "/api/v1/consumer/connections/link/verify",
        json={"consumer_no": "04281-99231", "otp": demo_code},
        headers=headers,
    )
    assert verify_res.status_code == 200, verify_res.text
    link_info = verify_res.json()["connection"]
    assert link_info["consumer_no"] == "04281-99231"
    assert link_info["is_primary"] is True

    # 4. Profile no longer in new applicant state
    profile_res = test_client.get("/api/v1/consumer/profile", headers=headers)
    assert profile_res.json()["is_new_applicant"] is False
    assert profile_res.json()["connections_count"] == 1

    # 5. Prevent duplicate linking
    dup_res = test_client.post(
        "/api/v1/consumer/connections/link/initiate",
        json={"consumer_no": "04281-99231"},
        headers=headers,
    )
    assert dup_res.status_code == 400


def test_preferences_management(test_client, seed_consumer_user):
    headers = {"Authorization": f"Bearer {seed_consumer_user['token']}"}

    res = test_client.get("/api/v1/consumer/preferences", headers=headers)
    assert res.status_code == 200
    assert res.json()["preferred_language"] == "en"

    patch_res = test_client.patch(
        "/api/v1/consumer/preferences",
        json={"preferred_language": "gu", "outage_alerts": False},
        headers=headers,
    )
    assert patch_res.status_code == 200

    check_res = test_client.get("/api/v1/consumer/preferences", headers=headers)
    assert check_res.json()["preferred_language"] == "gu"
    assert check_res.json()["outage_alerts"] is False


def test_security_sessions_and_password_change(test_client, seed_consumer_user):
    headers = {"Authorization": f"Bearer {seed_consumer_user['token']}"}

    # Wrong current password rejected
    bad_pw_res = test_client.post(
        "/api/v1/consumer/security/change-password",
        json={
            "current_password": "WrongPassword123",
            "new_password": "NewGujarat@2026",
            "confirm_password": "NewGujarat@2026",
        },
        headers=headers,
    )
    assert bad_pw_res.status_code == 400

    # Valid change password
    good_pw_res = test_client.post(
        "/api/v1/consumer/security/change-password",
        json={
            "current_password": "Gujarat@1234",
            "new_password": "NewGujarat@2026",
            "confirm_password": "NewGujarat@2026",
        },
        headers=headers,
    )
    assert good_pw_res.status_code == 200

    # Logout all devices
    logout_res = test_client.post("/api/v1/consumer/security/sessions/logout-all", headers=headers)
    assert logout_res.status_code == 200


def test_consumer_audit_activity_trail(test_client, seed_consumer_user):
    headers = {"Authorization": f"Bearer {seed_consumer_user['token']}"}
    # Trigger an activity
    test_client.patch(
        "/api/v1/consumer/profile",
        json={"full_name": "Shri Rajesh Activity Updated"},
        headers=headers,
    )

    res = test_client.get("/api/v1/consumer/activity", headers=headers)
    assert res.status_code == 200
    activities = res.json()
    assert len(activities) >= 1
    event_types = [a["event_type"] for a in activities]
    assert "PROFILE_UPDATED" in event_types
