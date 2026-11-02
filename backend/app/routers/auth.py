from datetime import datetime, timedelta, timezone
import json
import math
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..audit import audit
from ..config import settings
from ..db import get_db
from ..deps import AUTH_COOKIE_NAME, current_user, require
from ..login_limit import enforce_login_limit, enforce_account_limit, reset_account_limit
from ..models import PasswordResetToken, SavedPremise, User, UserSession
from ..security import (
    create_token,
    decode_token,
    decrypt_totp_secret,
    encrypt_totp_secret,
    generate_password_reset_token,
    generate_recovery_codes,
    generate_refresh_token,
    generate_totp_secret,
    get_totp_provisioning_uri,
    hash_password,
    hash_token,
    validate_password_policy,
    verify_password,
    verify_recovery_code,
    verify_totp_code,
)
from .staff import resolve_active_zone

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "vidyutflow_refresh_token"

SSO_SIMULATION_DISCLOSURE = (
    "SIMULATED OIDC / MeriPehchaan Parichay Single Sign-On for hackathon demonstration only — "
    "not connected to live Government of Gujarat or corporate Active Directory IdP."
)

SIMULATED_SSO_PROVIDERS = [
    {
        "id": "parichay-gujarat-demo",
        "name": "MeriPehchaan / Gujarat Parichay OIDC (Simulated Demo)",
        "protocol": "OIDC Authorization Code + PKCE (Simulated)",
        "audience": "Consumers & State Officials",
        "is_simulated": True,
    },
    {
        "id": "ugvcl-workforce-oidc-demo",
        "name": "UGVCL Corporate Workforce SSO (Simulated Demo)",
        "protocol": "OIDC / SAML 2.0 Enterprise Bridge (Simulated)",
        "audience": "Subdivision Officers, Field Engineers, Management & IT Admin",
        "is_simulated": True,
    },
]


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=(settings.app_env == "production"),
        max_age=int(settings.access_token_minutes) * 60,
        path="/",
    )


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=(settings.app_env == "production"),
        max_age=int(settings.refresh_token_days) * 24 * 3600,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/")
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/auth")


def ensure_default_premises(db: Session, u: User) -> None:
    """Seed reusable profile premises for demo consumer accounts on first read (Item #29)."""
    if settings.app_env == "production" or u.role != "consumer":
        return
    if db.query(SavedPremise).filter(SavedPremise.user_id == u.id).count() > 0:
        return
    defaults = [
        SavedPremise(
            user_id=u.id,
            label="Primary Residence — Mehsana",
            applicant_name=u.name,
            phone="9876543210",
            address="Plot 14, Gayatri Society, Modhera Road, Mehsana",
            zone=u.zone or "North",
            pin_code="384002",
            latitude=23.5880,
            longitude=72.3693,
            tariff_category="Residential (RGPU)",
            phase="1-Phase",
            premises_type="Owned",
        ),
        SavedPremise(
            user_id=u.id,
            label="Commercial Unit — Visnagar Road",
            applicant_name=u.name,
            phone="9876543210",
            address="Shop 8, Sardar Market, Visnagar Road, Mehsana",
            zone=u.zone or "North",
            pin_code="384001",
            latitude=23.6032,
            longitude=72.3851,
            tariff_category="Commercial (NRGP)",
            phase="3-Phase",
            premises_type="Leased",
        ),
    ]
    for p in defaults:
        db.add(p)
    db.commit()


class Register(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str = "consumer"
    zone: str = "North"

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, password: str) -> str:
        validate_password_policy(password)
        return password


class SimulatedSsoLoginBody(BaseModel):
    provider_id: str = Field(..., min_length=3, max_length=80)
    email: str = Field(..., min_length=3, max_length=160)
    state: str = Field(..., min_length=8, max_length=128)


class RefreshTokenBody(BaseModel):
    refresh_token: str | None = None


class MfaVerifyBody(BaseModel):
    mfa_token: str
    code: str


class MfaEnableBody(BaseModel):
    code: str


class ForgotPasswordBody(BaseModel):
    email: EmailStr


class ResetPasswordBody(BaseModel):
    token: str
    new_password: str


class PremiseCreateBody(BaseModel):
    label: str = Field("Saved Premise", min_length=2, max_length=80)
    applicant_name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., min_length=10, max_length=10)
    address: str = Field(..., min_length=4, max_length=400)
    zone: str = "North"
    pin_code: str = Field("", max_length=12)
    latitude: float | None = None
    longitude: float | None = None
    tariff_category: str = "Residential (RGPU)"
    phase: str = "1-Phase"
    premises_type: str = "Owned"


@router.post("/register", status_code=201, dependencies=[Depends(enforce_login_limit)])
def register(body: Register, db: Session = Depends(get_db)):
    if body.role != "consumer":
        raise HTTPException(403, "Public registration is restricted to consumers")
    canonical_zone = resolve_active_zone(db, body.zone)
    norm_email = body.email.strip().lower()
    if db.query(User).filter(func.lower(User.email) == norm_email).first():
        # Generic message avoids confirming whether the account exists
        raise HTTPException(
            400,
            "Registration could not be completed with the provided details. Please verify your information or proceed to login.",
        )
    try:
        pw_hash = hash_password(body.password)
    except ValueError as exc:
        raise HTTPException(422, str(exc))

    u = User(
        email=norm_email,
        name=body.name.strip(),
        role=body.role,
        zone=canonical_zone,
        hashed_password=pw_hash,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role, "zone": u.zone}


@router.post("/login", dependencies=[Depends(enforce_login_limit)])
def login(
    request: Request,
    response: Response,
    use_cookie: bool = False,
    x_use_cookie_session: str | None = Header(default=None),
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    enforce_account_limit(form.username)
    u = db.query(User).filter(func.lower(User.email) == form.username.strip().lower()).first()
    if not u or not u.is_active or not verify_password(form.password, u.hashed_password):
        raise HTTPException(401, "Invalid email or password")

    reset_account_limit(form.username)

    # Multi-factor authentication challenge for enabled accounts
    if getattr(u, "mfa_enabled", False):
        challenge_token = create_token(u.id, u.role, token_type="mfa_challenge", expires_minutes=5)
        return {
            "mfa_required": True,
            "mfa_token": challenge_token,
            "user_id": u.id,
            "email": u.email,
            "role": u.role,
            "name": u.name,
        }

    # Issue access token + refresh token bound to server-side UserSession
    jti = str(uuid.uuid4())
    raw_refresh, refresh_hash = generate_refresh_token()
    token_family = str(uuid.uuid4())
    token = create_token(u.id, u.role, jti=jti)
    now_utc = datetime.now(timezone.utc)
    exp_refresh = now_utc + timedelta(days=settings.refresh_token_days)

    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")[:250]
    session_row = UserSession(
        user_id=u.id,
        jti=jti,
        refresh_token_hash=refresh_hash,
        token_family=token_family,
        is_revoked=False,
        ip_address=client_ip,
        user_agent=user_agent,
        created_at=now_utc,
        expires_at=exp_refresh,
    )
    db.add(session_row)
    db.commit()

    issue_cookie = bool(use_cookie or x_use_cookie_session in ("1", "true"))
    if issue_cookie:
        _set_auth_cookie(response, token)
        _set_refresh_cookie(response, raw_refresh)

    return {
        "access_token": token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "expires_in": settings.access_token_minutes * 60,
        "cookie_auth": issue_cookie,
        "role": u.role,
        "name": u.name,
        "user_id": u.id,
        "zone": u.zone,
    }


@router.post("/refresh")
def refresh_session(
    request: Request,
    response: Response,
    body: RefreshTokenBody = RefreshTokenBody(),
    db: Session = Depends(get_db),
):
    raw_token = body.refresh_token or request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(401, "Refresh token is required")

    h = hash_token(raw_token.strip())
    sess = db.query(UserSession).filter(UserSession.refresh_token_hash == h).first()
    if not sess:
        raise HTTPException(401, "Invalid refresh token")

    now_utc = datetime.now(timezone.utc)
    # Token reuse detection: if a revoked refresh token is presented, revoke entire token family
    if sess.is_revoked:
        db.query(UserSession).filter(UserSession.token_family == sess.token_family).update(
            {"is_revoked": True, "revoked_at": now_utc, "revoked_reason": "TOKEN_REUSE_DETECTED"}
        )
        db.commit()
        audit(db, sess.user, "TOKEN_REUSE_DETECTED", "auth", sess.user_id, f"family={sess.token_family}")
        _clear_auth_cookies(response)
        raise HTTPException(401, "Token reuse detected. All sessions in this family have been revoked.")

    sess_exp = sess.expires_at
    if sess_exp.tzinfo is None:
        sess_exp = sess_exp.replace(tzinfo=timezone.utc)
    if sess_exp < now_utc:
        sess.is_revoked = True
        sess.revoked_at = now_utc
        sess.revoked_reason = "EXPIRED"
        db.commit()
        raise HTTPException(401, "Refresh token has expired")

    u = db.get(User, sess.user_id)
    if not u or not u.is_active:
        raise HTTPException(401, "User not found or inactive")

    # Single-use rotation: consume old session record
    sess.is_revoked = True
    sess.revoked_at = now_utc
    sess.revoked_reason = "ROTATED"

    # Issue new access token + new refresh token in same family
    new_jti = str(uuid.uuid4())
    new_raw_refresh, new_refresh_hash = generate_refresh_token()
    new_access_token = create_token(u.id, u.role, jti=new_jti)
    new_exp_refresh = now_utc + timedelta(days=settings.refresh_token_days)

    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")[:250]
    new_sess = UserSession(
        user_id=u.id,
        jti=new_jti,
        refresh_token_hash=new_refresh_hash,
        token_family=sess.token_family,
        is_revoked=False,
        ip_address=client_ip,
        user_agent=user_agent,
        created_at=now_utc,
        expires_at=new_exp_refresh,
    )
    db.add(new_sess)
    db.commit()

    if request.cookies.get(AUTH_COOKIE_NAME) or request.cookies.get(REFRESH_COOKIE_NAME):
        _set_auth_cookie(response, new_access_token)
        _set_refresh_cookie(response, new_raw_refresh)

    return {
        "access_token": new_access_token,
        "refresh_token": new_raw_refresh,
        "token_type": "bearer",
        "expires_in": settings.access_token_minutes * 60,
    }


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    # Server-side revocation: mark session record as revoked
    raw_token = request.headers.get("authorization", "").replace("Bearer ", "").strip() or request.cookies.get(AUTH_COOKIE_NAME)
    if raw_token:
        p = decode_token(raw_token, expected_type="access")
        if p and p.get("jti"):
            jti = p["jti"]
            now_utc = datetime.now(timezone.utc)
            db.query(UserSession).filter(UserSession.jti == jti).update(
                {"is_revoked": True, "revoked_at": now_utc, "revoked_reason": "LOGOUT"}
            )
            db.commit()

    # If a refresh token cookie is present, revoke that session record too
    refresh_cookie = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_cookie:
        rh = hash_token(refresh_cookie.strip())
        now_utc = datetime.now(timezone.utc)
        db.query(UserSession).filter(UserSession.refresh_token_hash == rh).update(
            {"is_revoked": True, "revoked_at": now_utc, "revoked_reason": "LOGOUT"}
        )
        db.commit()

    _clear_auth_cookies(response)
    return {"logged_out": True}


@router.post("/mfa/setup")
def mfa_setup(
    db: Session = Depends(get_db),
    u: User = Depends(require("admin", "officer", "engineer")),
):
    secret = generate_totp_secret()
    enc_secret = encrypt_totp_secret(secret)
    plain_codes, hash_codes = generate_recovery_codes()
    u.mfa_secret_encrypted = enc_secret
    u.mfa_recovery_hashes_json = json.dumps(hash_codes)
    db.commit()
    return {
        "secret": secret,
        "provisioning_uri": get_totp_provisioning_uri(secret, u.email),
        "recovery_codes": plain_codes,
        "message": "Scan the QR provisioning URI with an authenticator app and store recovery codes securely.",
    }


@router.post("/mfa/enable")
def mfa_enable(
    body: MfaEnableBody,
    db: Session = Depends(get_db),
    u: User = Depends(require("admin", "officer", "engineer")),
):
    if not u.mfa_secret_encrypted:
        raise HTTPException(400, "MFA setup has not been initiated. Call /auth/mfa/setup first.")
    secret = decrypt_totp_secret(u.mfa_secret_encrypted)
    if not verify_totp_code(secret, body.code):
        raise HTTPException(400, "Invalid verification code")
    u.mfa_enabled = True
    audit(db, u, "MFA_ENABLED", "auth", u.id, "TOTP multi-factor enabled")
    db.commit()
    return {"mfa_enabled": True, "message": "Multi-factor authentication successfully enabled"}


@router.post("/mfa/verify")
def mfa_verify_login(
    request: Request,
    response: Response,
    body: MfaVerifyBody,
    use_cookie: bool = False,
    x_use_cookie_session: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    payload = decode_token(body.mfa_token, expected_type="mfa_challenge")
    if not payload:
        raise HTTPException(401, "Invalid or expired MFA challenge token")
    u = db.get(User, payload["sub"])
    if not u or not u.is_active or not u.mfa_enabled or not u.mfa_secret_encrypted:
        raise HTTPException(401, "Invalid MFA state")

    secret = decrypt_totp_secret(u.mfa_secret_encrypted)
    is_valid = verify_totp_code(secret, body.code)
    used_recovery = False
    if not is_valid and u.mfa_recovery_hashes_json:
        stored_hashes = json.loads(u.mfa_recovery_hashes_json)
        is_valid, updated_hashes = verify_recovery_code(body.code, stored_hashes)
        if is_valid:
            used_recovery = True
            u.mfa_recovery_hashes_json = json.dumps(updated_hashes)

    if not is_valid:
        raise HTTPException(401, "Invalid verification code or recovery code")

    jti = str(uuid.uuid4())
    raw_refresh, refresh_hash = generate_refresh_token()
    token_family = str(uuid.uuid4())
    token = create_token(u.id, u.role, jti=jti)
    now_utc = datetime.now(timezone.utc)
    exp_refresh = now_utc + timedelta(days=settings.refresh_token_days)

    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")[:250]
    session_row = UserSession(
        user_id=u.id,
        jti=jti,
        refresh_token_hash=refresh_hash,
        token_family=token_family,
        is_revoked=False,
        ip_address=client_ip,
        user_agent=user_agent,
        created_at=now_utc,
        expires_at=exp_refresh,
    )
    db.add(session_row)
    audit(
        db,
        u,
        "MFA_LOGIN_SUCCESS",
        "auth",
        u.id,
        f"mode={'recovery_code' if used_recovery else 'totp'}",
    )
    db.commit()

    issue_cookie = bool(use_cookie or x_use_cookie_session in ("1", "true"))
    if issue_cookie:
        _set_auth_cookie(response, token)
        _set_refresh_cookie(response, raw_refresh)

    return {
        "access_token": token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "expires_in": settings.access_token_minutes * 60,
        "cookie_auth": issue_cookie,
        "role": u.role,
        "name": u.name,
        "user_id": u.id,
        "zone": u.zone,
    }


@router.post("/forgot-password", dependencies=[Depends(enforce_login_limit)])
def forgot_password(
    body: ForgotPasswordBody,
    db: Session = Depends(get_db),
):
    enforce_account_limit(body.email)
    norm_email = body.email.strip().lower()
    u = db.query(User).filter(func.lower(User.email) == norm_email).first()
    raw_reset = None
    if u and u.is_active:
        raw_reset, token_hash = generate_password_reset_token()
        exp = datetime.now(timezone.utc) + timedelta(minutes=15)
        reset_row = PasswordResetToken(user_id=u.id, token_hash=token_hash, expires_at=exp)
        db.add(reset_row)
        audit(db, u, "PASSWORD_RESET_REQUESTED", "auth", u.id, f"exp={exp.isoformat()}")
        db.commit()

    res = {
        "message": "If this email address is registered, password reset instructions have been issued.",
    }
    if settings.app_env != "production" and raw_reset:
        res["demo_reset_token"] = raw_reset
    return res


@router.post("/reset-password", dependencies=[Depends(enforce_login_limit)])
def reset_password(
    body: ResetPasswordBody,
    db: Session = Depends(get_db),
):
    try:
        validate_password_policy(body.new_password)
    except ValueError as exc:
        raise HTTPException(422, str(exc))

    h = hash_token(body.token.strip())
    now_utc = datetime.now(timezone.utc)
    token_row = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == h, PasswordResetToken.is_used.is_(False))
        .first()
    )
    if not token_row:
        raise HTTPException(400, "Invalid or expired password reset token")

    exp = token_row.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now_utc:
        raise HTTPException(400, "Password reset token has expired")

    token_row.is_used = True
    token_row.used_at = now_utc

    u = db.get(User, token_row.user_id)
    if not u or not u.is_active:
        raise HTTPException(400, "User account not found or inactive")

    u.hashed_password = hash_password(body.new_password)

    # Invalidate all active sessions for this user across all devices
    db.query(UserSession).filter(UserSession.user_id == u.id, UserSession.is_revoked.is_(False)).update(
        {"is_revoked": True, "revoked_at": now_utc, "revoked_reason": "PASSWORD_RESET"}
    )
    audit(db, u, "PASSWORD_RESET_COMPLETED", "auth", u.id, "All active sessions revoked")
    db.commit()
    return {"message": "Password successfully reset. Please sign in with your new password."}


@router.get("/sso/providers")
def list_sso_providers():
    return {
        "is_simulated": True,
        "enabled_in_current_env": settings.app_env != "production",
        "disclosure": SSO_SIMULATION_DISCLOSURE,
        "providers": SIMULATED_SSO_PROVIDERS,
    }


@router.post("/sso/login", dependencies=[Depends(enforce_login_limit)])
def simulated_sso_login(
    body: SimulatedSsoLoginBody,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    if settings.app_env == "production":
        raise HTTPException(
            403,
            "Simulated demo SSO is disabled in production; configure a real OIDC identity provider",
        )
    valid_ids = {p["id"] for p in SIMULATED_SSO_PROVIDERS}
    if body.provider_id not in valid_ids:
        raise HTTPException(422, f"Unsupported SSO provider: {body.provider_id}")
    u = db.query(User).filter(User.email == str(body.email).lower()).first()
    if not u or not u.is_active:
        raise HTTPException(401, "SSO identity is not mapped to an active VidyutFlow account")

    jti = str(uuid.uuid4())
    raw_refresh, refresh_hash = generate_refresh_token()
    token_family = str(uuid.uuid4())
    token = create_token(u.id, u.role, jti=jti)
    now_utc = datetime.now(timezone.utc)
    exp_refresh = now_utc + timedelta(days=settings.refresh_token_days)

    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")[:250]
    session_row = UserSession(
        user_id=u.id,
        jti=jti,
        refresh_token_hash=refresh_hash,
        token_family=token_family,
        is_revoked=False,
        ip_address=client_ip,
        user_agent=user_agent,
        created_at=now_utc,
        expires_at=exp_refresh,
    )
    db.add(session_row)

    _set_auth_cookie(response, token)
    _set_refresh_cookie(response, raw_refresh)
    audit(
        db,
        u,
        "SSO_SIMULATED_LOGIN",
        "auth",
        u.id,
        f"provider={body.provider_id} state_prefix={body.state[:8]}",
    )
    db.commit()
    return {
        "access_token": token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "expires_in": settings.access_token_minutes * 60,
        "cookie_auth": True,
        "sso_simulated": True,
        "provider_id": body.provider_id,
        "disclosure": SSO_SIMULATION_DISCLOSURE,
        "role": u.role,
        "name": u.name,
        "user_id": u.id,
        "zone": u.zone,
    }


@router.get("/me")
def me(u: User = Depends(current_user)):
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role, "zone": u.zone}


@router.get("/users")
def list_users(db: Session = Depends(get_db), _u: User = Depends(require("admin"))):
    """Admin user directory (VidyutFlow Admin > Users & Roles). Never returns password hashes."""
    return [
        {
            "id": x.id,
            "email": x.email,
            "name": x.name,
            "role": x.role,
            "zone": x.zone,
            "is_active": x.is_active,
        }
        for x in db.query(User).order_by(User.role, User.name).all()
    ]


def _premise_out(p: SavedPremise) -> dict:
    return {
        "id": p.id,
        "label": p.label,
        "applicant_name": p.applicant_name,
        "phone": p.phone,
        "address": p.address,
        "zone": p.zone,
        "pin_code": p.pin_code,
        "latitude": p.latitude,
        "longitude": p.longitude,
        "tariff_category": p.tariff_category,
        "phase": p.phase,
        "premises_type": p.premises_type,
        "created_at": p.created_at,
    }


@router.get("/premises")
def list_saved_premises(
    db: Session = Depends(get_db),
    u: User = Depends(require("consumer")),
):
    ensure_default_premises(db, u)
    rows = (
        db.query(SavedPremise)
        .filter(SavedPremise.user_id == u.id)
        .order_by(SavedPremise.created_at.asc())
        .all()
    )
    return {
        "profile": {
            "name": u.name,
            "email": u.email,
            "default_zone": u.zone,
        },
        "items": [_premise_out(r) for r in rows],
    }


@router.post("/premises", status_code=201)
def create_saved_premise(
    body: PremiseCreateBody,
    db: Session = Depends(get_db),
    u: User = Depends(require("consumer")),
):
    digits = body.phone.strip()
    if len(digits) != 10 or not digits.isascii() or not digits.isdigit():
        raise HTTPException(422, "Valid 10-digit ASCII mobile number is required")
    if (body.latitude is None) != (body.longitude is None):
        raise HTTPException(422, "Both latitude and longitude must be provided together")
    if body.latitude is not None and body.longitude is not None:
        if not (
            math.isfinite(body.latitude)
            and math.isfinite(body.longitude)
            and -90.0 <= body.latitude <= 90.0
            and -180.0 <= body.longitude <= 180.0
        ):
            raise HTTPException(422, "Coordinates out of valid WGS84 range")
    canonical_zone = resolve_active_zone(db, body.zone)
    row = SavedPremise(
        user_id=u.id,
        label=body.label.strip(),
        applicant_name=body.applicant_name.strip(),
        phone=digits,
        address=body.address.strip(),
        zone=canonical_zone,
        pin_code=body.pin_code.strip(),
        latitude=round(float(body.latitude), 6) if body.latitude is not None else None,
        longitude=round(float(body.longitude), 6) if body.longitude is not None else None,
        tariff_category=body.tariff_category.strip(),
        phase=body.phase.strip(),
        premises_type=body.premises_type.strip(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _premise_out(row)


@router.delete("/premises/{premise_id}")
def delete_saved_premise(
    premise_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(require("consumer")),
):
    row = db.get(SavedPremise, premise_id)
    if not row or row.user_id != u.id:
        raise HTTPException(404, "Saved premise not found")
    db.delete(row)
    db.commit()
    return {"deleted": True, "id": premise_id}
