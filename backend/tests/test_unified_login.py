import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import SessionLocal
from backend.app.models import User, ConsumerConnectionLink, UserContact, ConsumerConnectionOtp
from backend.app.security import hash_password

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(autouse=True)
def ensure_seed_consumer():
    with SessionLocal() as db:
        meenaben = db.query(User).filter(User.email == "consumer@vidyutflow.demo").first()
        if not meenaben:
            meenaben = User(
                id="demo-consumer-meenaben-patel",
                email="consumer@vidyutflow.demo",
                name="Smt. Meenaben Patel",
                role="consumer",
                zone="North",
                hashed_password=hash_password("Demo@12345")
            )
            db.add(meenaben)
            db.commit()
            db.refresh(meenaben)

        contact = db.query(UserContact).filter(UserContact.user_id == meenaben.id).first()
        if not contact:
            db.add(UserContact(
                user_id=meenaben.id,
                email=meenaben.email,
                email_verified=True,
                mobile_number="+91 98250 14820",
                mobile_verified=True
            ))
            db.commit()

        link = db.query(ConsumerConnectionLink).filter(ConsumerConnectionLink.consumer_no == "04281-99231").first()
        if not link:
            db.add(ConsumerConnectionLink(
                user_id=meenaben.id,
                consumer_no="04281-99231",
                discom="UGVCL",
                connection_type="Residential (RGPU)",
                sanctioned_load_kw=6.0,
                official_address="14, Anand Nagar Society, Visnagar Road, Mehsana - 384002",
                subdivision="Mehsana City North",
                status="ACTIVE",
                is_primary=True,
                source="OFFICIAL_REGISTRY"
            ))
            db.commit()


def test_consumer_otp_flow_and_security(client):
    # 1. Anti-bot vector CAPTCHA generation
    res_captcha = client.get("/auth/captcha")
    assert res_captcha.status_code == 200
    captcha_data = res_captcha.json()
    assert "captcha_token" in captcha_data
    assert "captcha_svg" in captcha_data
    assert "<svg" in captcha_data["captcha_svg"]
    assert "user-select:none" in captcha_data["captcha_svg"]

    # 2. Reject OTP send with invalid CAPTCHA
    res_bad_captcha = client.post("/auth/consumer/otp/send", json={
        "mobile_number": "9825014820",
        "captcha_token": captcha_data["captcha_token"],
        "captcha_answer": "BADCODE"
    })
    assert res_bad_captcha.status_code == 400
    assert "CAPTCHA" in res_bad_captcha.json()["detail"]

    # 3. Unregistered mobile number must be rejected (Ownership check)
    res_mismatch = client.post("/auth/consumer/otp/send", json={
        "mobile_number": "9111122222"
    })
    assert res_mismatch.status_code == 400
    assert "not registered" in res_mismatch.json()["detail"]

    # 4. Valid Mobile-Only OTP request (Electricity Consumer Number NOT required)
    res_valid_mobile = client.post("/auth/consumer/otp/send", json={
        "mobile_number": "9825014820"
    })
    assert res_valid_mobile.status_code == 200
    data = res_valid_mobile.json()
    assert data["status"] == "OTP_SENT"
    assert data["masked_mobile"].endswith("20")
    otp_code = data["dev_simulation_otp"]
    assert otp_code is not None

    # 5. Incorrect OTP verification with mobile number
    res_wrong_otp = client.post("/auth/consumer/otp/verify", json={
        "mobile_number": "9825014820",
        "otp": "000000"
    })
    assert res_wrong_otp.status_code == 400
    assert "Incorrect verification code" in res_wrong_otp.json()["detail"]

    # 6. Correct OTP verification with mobile number (No consumer number required)
    res_success = client.post("/auth/consumer/otp/verify", json={
        "mobile_number": "9825014820",
        "otp": otp_code
    })
    assert res_success.status_code == 200
    auth_data = res_success.json()
    assert auth_data["authenticated"] is True
    assert auth_data["role"] == "consumer"
    assert auth_data["access_token"] is not None

    # 7. Reusing the single-use OTP must fail
    res_reuse = client.post("/auth/consumer/otp/verify", json={
        "mobile_number": "9825014820",
        "otp": otp_code
    })
    assert res_reuse.status_code == 400

    # 8. Backward-compatible check: explicit consumer_no + mobile_number still supported
    res_compat = client.post("/auth/consumer/otp/send", json={
        "consumer_no": "04281-99231",
        "mobile_number": "9825014820"
    })
    # If cooldown is active (429) or success (200), both validate schema compatibility
    assert res_compat.status_code in (200, 429)


def test_staff_unified_login_and_role_mismatch(client):
    # 1. Field Engineer Login via Employee ID alias
    res_eng = client.post("/auth/login", json={
        "username": "ugvcl-eng-01",
        "password": "Demo@12345",
        "target_role": "field"
    })
    assert res_eng.status_code == 200
    eng_data = res_eng.json()
    assert eng_data["role"] == "engineer"
    assert eng_data["user"]["role"] == "engineer"
    assert eng_data["discom"] == "UGVCL"

    # 2. Officer Login via Employee ID alias
    res_off = client.post("/auth/login", json={
        "username": "emp-ugvcl-001",
        "password": "Demo@12345",
        "target_role": "employee"
    })
    assert res_off.status_code == 200
    off_data = res_off.json()
    assert off_data["role"] == "officer"
    assert off_data["user"]["role"] == "officer"

    # 3. Administrator Login via Admin ID alias
    res_adm = client.post("/auth/login", json={
        "username": "adm-ugvcl-01",
        "password": "Demo@12345",
        "target_role": "admin"
    })
    assert res_adm.status_code == 200
    adm_data = res_adm.json()
    assert adm_data["role"] == "admin"
    assert adm_data["user"]["role"] == "admin"

    # 4. Role mismatch rejection (Officer attempting to enter as Admin)
    res_mismatch = client.post("/auth/login", json={
        "username": "emp-ugvcl-001",
        "password": "Demo@12345",
        "target_role": "admin"
    })
    assert res_mismatch.status_code == 403
    assert "authorized for the 'officer' role, not 'admin'" in res_mismatch.json()["detail"]

    # 5. Invalid password rejection
    res_invalid_pw = client.post("/auth/login", json={
        "username": "emp-ugvcl-001",
        "password": "WrongPassword123!"
    })
    assert res_invalid_pw.status_code == 401

