import uuid
import pytest
import pyotp
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.db import SessionLocal
from app.models import User, UserSession, PasswordResetToken
from app.security import (
    decode_token,
    create_token,
    hash_password,
    validate_password_policy,
    hash_token,
    generate_password_reset_token,
)


def test_jwt_claims_and_fifteen_minute_expiration():
    """Verify RFC 7519 claims: iss, aud, jti, token_type, and 15m expiration."""
    user_id = str(uuid.uuid4())
    token = create_token(
        user_id=user_id,
        role="consumer",
        token_type="access",
    )
    payload = decode_token(token, expected_type="access")
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["role"] == "consumer"
    assert payload["iss"] == settings.jwt_issuer
    assert payload["aud"] == settings.jwt_audience
    assert payload["token_type"] == "access"
    assert "jti" in payload
    assert payload["exp"] - payload["iat"] == 900  # 15 minutes in seconds

    # Reject access token when expected_type is "refresh"
    assert decode_token(token, expected_type="refresh") is None

    # Reject token with invalid/tampered signature
    tampered = token[:-4] + "fake"
    assert decode_token(tampered, expected_type="access") is None


def test_login_creates_session_and_server_side_logout_revokes():
    """Verify UserSession creation and server-side logout via jti revocation."""
    email = f"session-test-{uuid.uuid4().hex[:8]}@example.com"
    password = "SecurePassword123"

    with TestClient(app) as c:
        # Register user (status 201)
        reg = c.post("/auth/register", json={
            "email": email,
            "name": "Session Test User",
            "password": password,
        })
        assert reg.status_code == 201

        # Login
        login_res = c.post("/auth/login", data={"username": email, "password": password})
        assert login_res.status_code == 200
        token_data = login_res.json()
        access_token = token_data["access_token"]
        refresh_token = token_data["refresh_token"]

        payload = decode_token(access_token)
        assert payload is not None
        jti = payload["jti"]

        # Verify active session exists in DB
        with SessionLocal() as db:
            session = db.query(UserSession).filter(UserSession.jti == jti).first()
            assert session is not None
            assert not session.is_revoked
            assert session.refresh_token_hash == hash_token(refresh_token)

        # GET /auth/me succeeds with active session
        me_res = c.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
        assert me_res.status_code == 200
        assert me_res.json()["email"] == email

        # Logout revokes session
        logout_res = c.post("/auth/logout", headers={"Authorization": f"Bearer {access_token}"})
        assert logout_res.status_code == 200

        # Verify session marked revoked in DB
        with SessionLocal() as db:
            session = db.query(UserSession).filter(UserSession.jti == jti).first()
            assert session.is_revoked is True
            assert session.revoked_reason == "LOGOUT"

        # Subsequent requests with same access token are rejected immediately (server-side enforcement)
        me_after_logout = c.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
        assert me_after_logout.status_code == 401
        assert "revoked" in me_after_logout.json()["detail"].lower()


def test_rotating_refresh_tokens_and_reuse_detection():
    """Verify refresh token rotation and reuse detection revoking the token family."""
    email = f"reuse-test-{uuid.uuid4().hex[:8]}@example.com"
    password = "RotationPassword123"

    with TestClient(app) as c:
        reg = c.post("/auth/register", json={
            "email": email,
            "name": "Rotation User",
            "password": password,
        })
        assert reg.status_code == 201

        login_res = c.post("/auth/login", data={"username": email, "password": password})
        assert login_res.status_code == 200
        initial = login_res.json()
        token1 = initial["access_token"]
        refresh1 = initial["refresh_token"]

        # First refresh: exchange refresh1 for (token2, refresh2)
        ref_res = c.post("/auth/refresh", json={"refresh_token": refresh1})
        assert ref_res.status_code == 200
        rotated = ref_res.json()
        token2 = rotated["access_token"]
        refresh2 = rotated["refresh_token"]
        assert refresh2 != refresh1

        # token2 works
        assert c.get("/auth/me", headers={"Authorization": f"Bearer {token2}"}).status_code == 200

        # REUSE DETECTION: Attacker replays already-consumed refresh1
        replay_res = c.post("/auth/refresh", json={"refresh_token": refresh1})
        assert replay_res.status_code == 401
        assert "revoked" in replay_res.json()["detail"].lower()

        # Both sessions under this token_family must be revoked now
        with SessionLocal() as db:
            family_sessions = db.query(UserSession).filter(
                UserSession.revoked_reason == "TOKEN_REUSE_DETECTED"
            ).all()
            assert len(family_sessions) >= 2

        # token2 must now be rejected because reuse detection invalidated the entire family
        assert c.get("/auth/me", headers={"Authorization": f"Bearer {token2}"}).status_code == 401


def test_modern_nist_password_policy():
    """Verify NIST SP 800-63B password rules: length >= 8, max 72 bytes, common password check."""
    # Too short (< 8 chars)
    with pytest.raises(ValueError, match="at least 8 characters"):
        validate_password_policy("short")

    # Common compromised passwords
    with pytest.raises(ValueError, match="too common"):
        validate_password_policy("password123")
    with pytest.raises(ValueError, match="too common"):
        validate_password_policy("admin123")

    # Valid passphrases without arbitrary composition rules
    validate_password_policy("correct-horse-battery-staple")
    validate_password_policy("simplepassphrase987")


def test_generic_registration_mitigates_account_enumeration():
    """Verify registration does not leak existing user presence."""
    email = f"enum-{uuid.uuid4().hex[:8]}@example.com"
    with TestClient(app) as c:
        # First registration succeeds
        res1 = c.post("/auth/register", json={
            "email": email,
            "name": "Original User",
            "password": "ValidPassword123",
        })
        assert res1.status_code == 201

        # Duplicate registration returns generic message
        res2 = c.post("/auth/register", json={
            "email": email,
            "name": "Duplicate User",
            "password": "ValidPassword123",
        })
        assert res2.status_code == 400
        # Generic message does not mention 'email already exists' or reveal user presence
        assert "registration could not be completed" in res2.json()["detail"].lower()


def test_secure_password_reset_and_session_invalidation():
    """Verify password reset flow with token hashing and all-session revocation."""
    email = f"reset-{uuid.uuid4().hex[:8]}@example.com"
    old_password = "OldPassword123"
    new_password = "NewPassword123"

    with TestClient(app) as c:
        reg = c.post("/auth/register", json={
            "email": email,
            "name": "Reset Test User",
            "password": old_password,
        })
        assert reg.status_code == 201

        # Login to create session
        login_res = c.post("/auth/login", data={"username": email, "password": old_password})
        assert login_res.status_code == 200
        old_access_token = login_res.json()["access_token"]
        assert c.get("/auth/me", headers={"Authorization": f"Bearer {old_access_token}"}).status_code == 200

        # Forgot password endpoint returns generic response
        forgot_res = c.post("/auth/forgot-password", json={"email": email})
        assert forgot_res.status_code == 200
        assert "if this email address is registered" in forgot_res.json()["message"].lower()

        # Retrieve the reset token record from DB
        with SessionLocal() as db:
            user = db.query(User).filter(User.email == email).first()
            reset_record = db.query(PasswordResetToken).filter(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.is_used == False,
            ).order_by(PasswordResetToken.created_at.desc()).first()
            assert reset_record is not None
            # The database only stores the SHA-256 hash
            token_hash = reset_record.token_hash
            assert len(token_hash) == 64

        # Generate a known raw token and hash for deterministic testing
        from datetime import datetime, timezone, timedelta
        raw_token, test_hash = generate_password_reset_token()
        with SessionLocal() as db:
            user = db.query(User).filter(User.email == email).first()
            db.add(PasswordResetToken(
                user_id=user.id,
                token_hash=test_hash,
                is_used=False,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
            ))
            db.commit()

        # Reset password with valid token
        reset_res = c.post("/auth/reset-password", json={
            "token": raw_token,
            "new_password": new_password,
        })
        assert reset_res.status_code == 200

        # Reusing the same reset token fails
        replay_reset = c.post("/auth/reset-password", json={
            "token": raw_token,
            "new_password": "AnotherPassword123",
        })
        assert replay_reset.status_code == 400

        # Old active sessions are now revoked across all devices
        me_check = c.get("/auth/me", headers={"Authorization": f"Bearer {old_access_token}"})
        assert me_check.status_code == 401
        assert "revoked" in me_check.json()["detail"].lower()

        # Login with old password fails
        assert c.post("/auth/login", data={"username": email, "password": old_password}).status_code == 401

        # Login with new password succeeds
        assert c.post("/auth/login", data={"username": email, "password": new_password}).status_code == 200


def test_staff_totp_mfa_flow():
    """Verify staff TOTP MFA enrollment, step-up authentication, and recovery codes."""
    email = f"staff-{uuid.uuid4().hex[:8]}@example.com"
    password = "StaffPassword123"
    staff_id = str(uuid.uuid4())

    with SessionLocal() as db:
        user = User(
            id=staff_id,
            email=email,
            name="Staff Member",
            hashed_password=hash_password(password),
            role="officer",
            zone="North",
            is_active=True,
        )
        db.add(user)
        db.commit()

    with TestClient(app) as c:
        # Initial login without MFA
        login1 = c.post("/auth/login", data={"username": email, "password": password})
        assert login1.status_code == 200
        token = login1.json()["access_token"]

        # Step 1: MFA setup
        setup_res = c.post("/auth/mfa/setup", headers={"Authorization": f"Bearer {token}"})
        assert setup_res.status_code == 200
        setup_data = setup_res.json()
        secret = setup_data["secret"]
        recovery_codes = setup_data["recovery_codes"]
        assert len(recovery_codes) == 8

        # Step 2: Enable MFA with wrong code fails
        enable_bad = c.post(
            "/auth/mfa/enable",
            headers={"Authorization": f"Bearer {token}"},
            json={"code": "000000"},
        )
        assert enable_bad.status_code == 400

        # Enable MFA with valid TOTP code
        totp = pyotp.TOTP(secret)
        enable_good = c.post(
            "/auth/mfa/enable",
            headers={"Authorization": f"Bearer {token}"},
            json={"code": totp.now()},
        )
        assert enable_good.status_code == 200

        # Step 3: Login now challenges for MFA
        login_mfa = c.post("/auth/login", data={"username": email, "password": password})
        assert login_mfa.status_code == 200
        mfa_payload = login_mfa.json()
        assert mfa_payload["mfa_required"] is True
        mfa_token = mfa_payload["mfa_token"]

        # Step 4: Verify with wrong code fails
        bad_verify = c.post("/auth/mfa/verify", json={"mfa_token": mfa_token, "code": "999999"})
        assert bad_verify.status_code == 401

        # Verify with valid TOTP code succeeds
        good_verify = c.post("/auth/mfa/verify", json={"mfa_token": mfa_token, "code": totp.now()})
        assert good_verify.status_code == 200
        assert "access_token" in good_verify.json()

        # Step 5: Test backup recovery code
        login_mfa2 = c.post("/auth/login", data={"username": email, "password": password})
        mfa_token2 = login_mfa2.json()["mfa_token"]
        recovery_code = recovery_codes[0]

        recovery_verify = c.post("/auth/mfa/verify", json={"mfa_token": mfa_token2, "code": recovery_code})
        assert recovery_verify.status_code == 200
        assert "access_token" in recovery_verify.json()

        # Step 6: Recovery code cannot be reused (single-use)
        login_mfa3 = c.post("/auth/login", data={"username": email, "password": password})
        mfa_token3 = login_mfa3.json()["mfa_token"]
        reuse_verify = c.post("/auth/mfa/verify", json={"mfa_token": mfa_token3, "code": recovery_code})
        assert reuse_verify.status_code == 401


def test_account_rate_limiting():
    """Verify distributed account-based rate limiting on consecutive failed logins."""
    email = f"brute-{uuid.uuid4().hex[:8]}@example.com"
    with TestClient(app) as c:
        # Register user
        reg = c.post("/auth/register", json={
            "email": email,
            "name": "Lockout User",
            "password": "ValidPassword123",
        })
        assert reg.status_code == 201

        # Submit 5 incorrect attempts
        for _ in range(5):
            res = c.post("/auth/login", data={"username": email, "password": "WrongPassword"})
            assert res.status_code == 401

        # 6th attempt is blocked by account lockout
        res_blocked = c.post("/auth/login", data={"username": email, "password": "WrongPassword"})
        assert res_blocked.status_code == 429
        assert "account" in res_blocked.json()["detail"].lower()
