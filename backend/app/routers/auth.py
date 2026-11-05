from datetime import datetime, timedelta, timezone
import json
import math
import uuid
import hashlib
import hmac
import time
import secrets
from sqlalchemy import or_
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
from ..models import PasswordResetToken, SavedPremise, User, UserSession, ConsumerConnectionLink, ConsumerConnectionOtp, UserContact
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
    sanitize_untrusted_text,
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
    model_config = {"extra": "ignore"}
    email: EmailStr
    name: str
    password: str
    role: str = "consumer"
    zone: str = "North"
    phone: str | None = None
    mobileNumber: str | None = Field(default=None, alias="mobile_number")

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, password: str) -> str:
        validate_password_policy(password)
        return password


class SignupRequest(BaseModel):
    model_config = {"extra": "ignore"}
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str
    mobileNumber: str | None = Field(default=None, alias="mobile_number")
    phone: str | None = None
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


def to_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_consumed_captcha_tokens: dict[str, float] = {}


def _cleanup_consumed_captchas(now_ts: float) -> None:
    cutoff = now_ts - 300
    expired = [k for k, ts in _consumed_captcha_tokens.items() if ts < cutoff]
    for k in expired:
        _consumed_captcha_tokens.pop(k, None)


def generate_secure_captcha() -> tuple[str, str]:
    now_ts = time.time()
    _cleanup_consumed_captchas(now_ts)

    # 5 random characters from distinct alphabet (no 0/O, 1/I confusion)
    code = "".join(secrets.choice(CAPTCHA_CHARS) for _ in range(5))
    salt = secrets.token_hex(8)
    ts_int = int(now_ts)

    # Cryptographic signature bound to server secret and time
    mac = hmac.new(
        settings.secret_key.encode("utf-8"),
        f"{code}:{ts_int}:{salt}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    token = f"{ts_int}.{salt}.{mac}"

    # Render anti-bot vector SVG with interference noise and warped typography
    w = 180
    h = 50

    dots = []
    colors = ["#cbd5e1", "#94a3b8", "#64748b", "#3b82f6", "#6366f1"]
    for _ in range(25):
        cx = secrets.randbelow(w)
        cy = secrets.randbelow(h)
        r = secrets.choice([1, 1.5, 2, 2.5])
        col = secrets.choice(colors)
        dots.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{col}" opacity="0.6"/>')

    lines = []
    line_colors = ["#2563eb", "#4f46e5", "#0284c7", "#475569", "#7c3aed"]
    for _ in range(4):
        x1 = secrets.randbelow(30)
        y1 = secrets.randbelow(h)
        x2 = secrets.randbelow(60) + 60
        y2 = secrets.randbelow(h)
        x3 = secrets.randbelow(30) + 150
        y3 = secrets.randbelow(h)
        col = secrets.choice(line_colors)
        sw = secrets.choice([1.2, 1.6, 2.0])
        lines.append(
            f'<path d="M {x1} {y1} Q {x2} {y2} {x3} {y3}" stroke="{col}" stroke-width="{sw}" fill="none" opacity="0.75"/>'
        )

    font_families = ["Arial, sans-serif", "Courier New, monospace", "Georgia, serif", "Verdana, sans-serif"]
    char_elements = []
    start_x = 22
    step_x = 28
    for i, ch in enumerate(code):
        char_x = start_x + (i * step_x) + (secrets.randbelow(6) - 3)
        char_y = 33 + (secrets.randbelow(6) - 3)
        angle = secrets.randbelow(30) - 15
        font_size = secrets.randbelow(5) + 23
        font_family = secrets.choice(font_families)
        font_weight = secrets.choice(["600", "700", "800"])
        char_col = secrets.choice(["#0f172a", "#1e3a8a", "#1e1b4b", "#0f766e", "#1e293b"])
        char_elements.append(
            f'<text x="{char_x}" y="{char_y}" font-family="{font_family}" font-size="{font_size}" '
            f'font-weight="{font_weight}" fill="{char_col}" transform="rotate({angle} {char_x} {char_y})" '
            f'pointer-events="none" style="user-select:none;-webkit-user-select:none;">{ch}</text>'
        )

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
        f'style="background-color:#f8fafc; border-radius:8px; border:1px solid #cbd5e1; user-select:none; -webkit-user-select:none; pointer-events:none;">'
        + "".join(dots)
        + "".join(lines)
        + "".join(char_elements)
        + "</svg>"
    )

    return token, svg


def verify_secure_captcha(token: str, answer: str) -> bool:
    if not token or not answer:
        return False
    parts = token.split(".")
    if len(parts) != 3:
        return False
    ts_str, salt, expected_mac = parts
    try:
        ts = int(ts_str)
    except ValueError:
        return False

    now_ts = time.time()
    # 3-minute TTL
    if now_ts - ts > 180 or ts > now_ts + 60:
        return False

    # Prevent replay / single-use check
    token_h = hashlib.sha256(token.encode("utf-8")).hexdigest()
    if token_h in _consumed_captcha_tokens:
        return False

    norm_ans = answer.strip().upper()
    expected = hmac.new(
        settings.secret_key.encode("utf-8"),
        f"{norm_ans}:{ts}:{salt}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, expected_mac):
        return False

    # Mark consumed
    _consumed_captcha_tokens[token_h] = now_ts
    return True


@router.get("/captcha")
def get_captcha():
    """Generates an uncopyable, bot-resistant vector CAPTCHA with tamper-proof HMAC nonce."""
    token, svg = generate_secure_captcha()
    return {
        "captcha_token": token,
        "captcha_svg": svg,
        "expires_in_seconds": 180,
    }


class ConsumerOtpSendRequest(BaseModel):
    mobile_number: str = Field(..., min_length=10, max_length=15)
    captcha_token: str | None = None
    captcha_answer: str | None = None
    consumer_no: str | None = None
    discom: str = "UGVCL"


class ConsumerOtpVerifyRequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6)
    mobile_number: str | None = None
    consumer_no: str | None = None


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


def register_consumer_internal(
    db: Session,
    email: str,
    name: str,
    password: str,
    role: str = "consumer",
    zone: str = "North",
    phone: str | None = None,
) -> User:
    if role != "consumer":
        raise HTTPException(403, "Public registration is restricted to consumers")
    canonical_zone = resolve_active_zone(db, zone)
    norm_email = email.strip().lower()
    if db.query(User).filter(func.lower(User.email) == norm_email).first():
        raise HTTPException(
            400,
            "Registration could not be completed with the provided information. Please check your details or proceed to login.",
        )
    try:
        pw_hash = hash_password(password)
    except ValueError as exc:
        raise HTTPException(422, str(exc))

    clean_name = sanitize_untrusted_text(name)
    if not clean_name:
        raise HTTPException(422, "Valid applicant name is required")
    u = User(
        email=norm_email,
        name=clean_name,
        role=role,
        zone=canonical_zone,
        hashed_password=pw_hash,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    audit(db, u.id, "USER_REGISTERED", "user", u.id, f"email={norm_email}")
    db.commit()
    return u


@router.post("/register", status_code=201, dependencies=[Depends(enforce_login_limit)])
def register(body: Register, db: Session = Depends(get_db)):
    u = register_consumer_internal(
        db,
        email=body.email,
        name=body.name,
        password=body.password,
        role=body.role,
        zone=body.zone,
        phone=getattr(body, "phone", None) or getattr(body, "mobileNumber", None),
    )
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role, "zone": u.zone}


@router.post("/signup", status_code=201, dependencies=[Depends(enforce_login_limit)])
def signup(
    body: SignupRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Public consumer registration issuing HttpOnly session cookie and structured identity payload."""
    phone_val = body.phone or body.mobileNumber or ""
    u = register_consumer_internal(
        db,
        email=body.email,
        name=body.name,
        password=body.password,
        role=body.role,
        zone=body.zone,
        phone=phone_val,
    )

    access_tok = create_token(u.id, u.role, token_type="access", expires_minutes=int(settings.access_token_minutes))
    refresh_tok = generate_refresh_token()
    refresh_h = hash_token(refresh_tok)

    now_dt = datetime.now(timezone.utc)
    exp_dt = now_dt + timedelta(days=int(settings.refresh_token_days))

    p = decode_token(access_tok, expected_type="access") or {}
    jti = p.get("jti") or str(uuid.uuid4())
    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")

    sess = UserSession(
        user_id=u.id,
        jti=jti,
        refresh_token_hash=refresh_h,
        token_family=str(uuid.uuid4()),
        ip_address=client_ip,
        user_agent=user_agent[:255] if user_agent else "",
        expires_at=exp_dt,
    )
    db.add(sess)
    db.commit()

    _set_auth_cookie(response, access_tok)
    _set_refresh_cookie(response, refresh_tok)

    login_time = now_dt.isoformat()
    expires_at_ms = int((now_dt + timedelta(minutes=int(settings.access_token_minutes))).timestamp() * 1000)

    return {
        "authenticated": True,
        "user": {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "mobileNumber": phone_val,
            "isDemoAccount": False,
        },
        "role": u.role,
        "loginTime": login_time,
        "expiresAt": expires_at_ms,
    }


@router.post("/consumer/otp/send", dependencies=[Depends(enforce_login_limit)])
def send_consumer_login_otp(
    body: ConsumerOtpSendRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Generates single-use 6-digit OTP for a verified consumer after validating security captcha and registered mobile."""
    # 1. Enforce bot-resistant CAPTCHA verification
    if body.captcha_token is not None:
        if not body.captcha_answer or not verify_secure_captcha(body.captcha_token, body.captcha_answer):
            raise HTTPException(400, "Invalid or expired security CAPTCHA. Please refresh and try again.")
    elif settings.app_env == "production":
        raise HTTPException(400, "Security CAPTCHA verification is required before sending OTP.")

    # 2. Validate mobile number
    digits_only = "".join([c for c in body.mobile_number if c.isdigit()])
    if len(digits_only) < 10:
        raise HTTPException(400, "Valid 10-digit mobile number is required")
    norm_mobile_10 = digits_only[-10:]

    client_ip = request.client.host if request.client else ""
    clean_cno = body.consumer_no.strip() if body.consumer_no else None

    # Look up connection and consumer by registered mobile number or connection number
    consumer_user: User | None = None
    found_connection: ConsumerConnectionLink | None = None

    if clean_cno:
        found_connection = db.query(ConsumerConnectionLink).filter(
            func.replace(ConsumerConnectionLink.consumer_no, "-", "") == clean_cno.replace("-", "")
        ).first()
        if found_connection:
            consumer_user = db.query(User).filter(User.id == found_connection.user_id).first()

    # Search for user by registered mobile in UserContact
    if not consumer_user:
        contacts = db.query(UserContact).all()
        for contact in contacts:
            if contact.mobile_number:
                c_digits = "".join([c for c in contact.mobile_number if c.isdigit()])[-10:]
                if c_digits == norm_mobile_10:
                    matched_user = db.query(User).filter(User.id == contact.user_id).first()
                    if matched_user:
                        consumer_user = matched_user
                        found_connection = db.query(ConsumerConnectionLink).filter(ConsumerConnectionLink.user_id == matched_user.id).first()
                        break

    # Demo consumer fallback for 98250 14820 (Meenaben Patel)
    if norm_mobile_10 == "9825014820":
        if not consumer_user:
            consumer_user = db.query(User).filter(User.email == "consumer@vidyutflow.demo").first()
        if not consumer_user:
            consumer_user = db.query(User).filter(User.role == "consumer").first()
        if not found_connection:
            found_connection = db.query(ConsumerConnectionLink).filter(
                func.replace(ConsumerConnectionLink.consumer_no, "-", "") == "0428199231"
            ).first()

    # If consumer_no was passed explicitly, enforce ownership validation
    if clean_cno:
        is_known_test_cno = clean_cno.replace("-", "") in ("0428199231", "0428177190")
        if not found_connection and not is_known_test_cno:
            audit(db, None, "CONSUMER_LOGIN_NOT_FOUND", "consumer", clean_cno, f"ip={client_ip}")
            db.commit()
            raise HTTPException(400, f"Consumer number '{clean_cno}' was not found in the {body.discom} registry.")

        if norm_mobile_10 != "9825014820":
            contact = db.query(UserContact).filter(UserContact.user_id == (consumer_user.id if consumer_user else "")).first()
            user_mobile = "".join([c for c in (contact.mobile_number if contact and contact.mobile_number else "") if c.isdigit()])[-10:]
            if user_mobile != norm_mobile_10:
                audit(db, consumer_user, "CONSUMER_MOBILE_MISMATCH", "consumer", clean_cno, f"ip={client_ip}")
                db.commit()
                raise HTTPException(
                    400,
                    f"The mobile number provided does not match the registered mobile number on record for consumer {clean_cno}. "
                    "Please contact your UGVCL subdivision office for mobile number registration."
                )

    if not consumer_user and norm_mobile_10 != "9825014820":
        audit(db, None, "CONSUMER_MOBILE_NOT_REGISTERED", "mobile", norm_mobile_10, f"ip={client_ip}")
        db.commit()
        raise HTTPException(
            400,
            f"Mobile number +91 {norm_mobile_10} is not registered with any UGVCL electricity consumer account. "
            "Please apply for a new connection or contact your subdivision office."
        )

    assigned_cno = clean_cno or (found_connection.consumer_no if found_connection else "04281-99231")

    # Enforce sliding-window rate limit (max 3 requests per 10 mins)
    now_utc = datetime.now(timezone.utc)
    ten_mins_ago = now_utc - timedelta(minutes=10)
    masked = f"+91 XXXXX XX{norm_mobile_10[-2:]}"

    recent_otps = db.query(ConsumerConnectionOtp).filter(
        or_(
            ConsumerConnectionOtp.masked_mobile == masked,
            ConsumerConnectionOtp.consumer_no == assigned_cno,
            func.replace(ConsumerConnectionOtp.consumer_no, "-", "") == assigned_cno.replace("-", "")
        ),
        ConsumerConnectionOtp.created_at >= ten_mins_ago
    ).all()

    if len(recent_otps) >= 3:
        raise HTTPException(429, "Too many OTP requests for this account. Please wait 10 minutes.")

    # Check cooldown (45s)
    if recent_otps:
        latest = max(recent_otps, key=lambda o: to_utc(o.created_at) or now_utc)
        latest_created = to_utc(latest.created_at) or now_utc
        diff = (now_utc - latest_created).total_seconds()
        if diff < 45:
            remaining = int(45 - diff)
            raise HTTPException(429, f"Please wait {remaining} seconds before requesting a new OTP.")

    # Generate single-use 6-digit OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    otp_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
    exp_time = now_utc + timedelta(minutes=5)

    u_id = consumer_user.id if consumer_user else "demo-consumer-meenaben-patel"
    db_otp = ConsumerConnectionOtp(
        user_id=u_id,
        consumer_no=assigned_cno,
        masked_mobile=masked,
        otp_hash=otp_hash,
        expires_at=exp_time,
        attempts=0,
        is_verified=False
    )
    db.add(db_otp)
    audit(db, consumer_user, "CONSUMER_OTP_GENERATED", "consumer", assigned_cno, f"ip={client_ip} mobile={masked}")
    db.commit()

    return {
        "success": True,
        "status": "OTP_SENT",
        "consumer_no": assigned_cno,
        "masked_mobile": masked,
        "expires_in_seconds": 300,
        "cooldown_seconds": 45,
        "dev_simulation_otp": otp_code if settings.app_env != "production" else None,
        "message": f"Verification OTP sent to registered mobile number {masked}."
    }


@router.post("/consumer/otp/verify", dependencies=[Depends(enforce_login_limit)])
def verify_consumer_login_otp(
    body: ConsumerOtpVerifyRequest,
    request: Request,
    response: Response,
    use_cookie: bool = False,
    x_use_cookie_session: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Verifies single-use OTP and creates secure authenticated session for Consumer."""
    clean_cno = body.consumer_no.strip() if body.consumer_no else ""
    digits_only = "".join([c for c in (body.mobile_number or "") if c.isdigit()])
    norm_mobile_10 = digits_only[-10:] if len(digits_only) >= 10 else ""
    clean_otp = body.otp.strip()
    client_ip = request.client.host if request.client else ""
    now_utc = datetime.now(timezone.utc)

    if not clean_cno and not norm_mobile_10:
        raise HTTPException(400, "Registered mobile number or consumer number is required for OTP verification.")

    query = db.query(ConsumerConnectionOtp).filter(ConsumerConnectionOtp.is_verified == False)
    if clean_cno:
        query = query.filter(
            or_(
                func.replace(ConsumerConnectionOtp.consumer_no, "-", "") == clean_cno.replace("-", ""),
                ConsumerConnectionOtp.masked_mobile.like(f"%{clean_cno[-2:]}")
            )
        )
    elif norm_mobile_10:
        query = query.filter(
            ConsumerConnectionOtp.masked_mobile.like(f"%{norm_mobile_10[-2:]}")
        )

    otp_rec = query.order_by(ConsumerConnectionOtp.created_at.desc()).first()

    if not otp_rec:
        raise HTTPException(400, "Verification code not found or already used. Please request a new OTP.")

    if to_utc(otp_rec.expires_at) < now_utc:
        raise HTTPException(400, "Verification code has expired. Please request a new OTP.")

    if otp_rec.attempts >= 5:
        raise HTTPException(429, "Maximum verification attempts exceeded. For security, this OTP is now invalid.")

    sub_hash = hashlib.sha256(clean_otp.encode("utf-8")).hexdigest()
    if sub_hash != otp_rec.otp_hash:
        otp_rec.attempts += 1
        db.commit()
        rem = 5 - otp_rec.attempts
        raise HTTPException(400, f"Incorrect verification code. {rem} attempt(s) remaining.")

    # Mark single-use
    otp_rec.is_verified = True

    # Retrieve or initialize user
    u = db.query(User).filter(User.id == otp_rec.user_id).first()
    if not u:
        u = db.query(User).filter(User.role == "consumer").first()
    if not u:
        cno_slug = (otp_rec.consumer_no or norm_mobile_10 or "registered").replace("-", "")
        u = User(
            email=f"consumer_{cno_slug}@vidyutflow.gov.in",
            name="Smt. Meenaben Patel",
            role="consumer",
            zone="North",
            hashed_password=hash_password("Consumer@123")
        )
        db.add(u)
        db.commit()
        db.refresh(u)

    jti = str(uuid.uuid4())
    raw_refresh, refresh_hash = generate_refresh_token()
    token_family = str(uuid.uuid4())
    token = create_token(u.id, u.role, jti=jti)
    exp_refresh = now_utc + timedelta(days=settings.refresh_token_days)

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
    audit(db, u, "CONSUMER_LOGIN_OTP_SUCCESS", "user", u.id, f"ip={client_ip} consumer_no={otp_rec.consumer_no}")
    db.commit()

    issue_cookie = bool(use_cookie or x_use_cookie_session in ("1", "true"))
    if issue_cookie:
        _set_auth_cookie(response, token)
        _set_refresh_cookie(response, raw_refresh)

    return {
        "authenticated": True,
        "access_token": token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "expires_in": settings.access_token_minutes * 60,
        "cookie_auth": issue_cookie,
        "role": "consumer",
        "name": u.name,
        "user_id": u.id,
        "zone": u.zone,
        "discom": "UGVCL",
        "user": {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": "consumer",
            "consumer_no": otp_rec.consumer_no,
            "discom": "UGVCL",
            "zone": u.zone
        }
    }

    jti = str(uuid.uuid4())
    raw_refresh, refresh_hash = generate_refresh_token()
    token_family = str(uuid.uuid4())
    token = create_token(u.id, u.role, jti=jti)
    exp_refresh = now_utc + timedelta(days=settings.refresh_token_days)

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
    audit(db, u, "CONSUMER_LOGIN_OTP_SUCCESS", "user", u.id, f"ip={client_ip} consumer_no={clean_cno}")
    db.commit()

    issue_cookie = bool(use_cookie or x_use_cookie_session in ("1", "true"))
    if issue_cookie:
        _set_auth_cookie(response, token)
        _set_refresh_cookie(response, raw_refresh)

    return {
        "authenticated": True,
        "access_token": token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "expires_in": settings.access_token_minutes * 60,
        "cookie_auth": issue_cookie,
        "role": "consumer",
        "name": u.name,
        "user_id": u.id,
        "zone": u.zone,
        "discom": "UGVCL",
        "user": {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": "consumer",
            "consumer_no": clean_cno,
            "discom": "UGVCL",
            "zone": u.zone
        }
    }


@router.post("/login", dependencies=[Depends(enforce_login_limit)])
async def login(
    request: Request,
    response: Response,
    use_cookie: bool = False,
    x_use_cookie_session: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Unified login endpoint supporting Field Engineer, Officer, Admin & Consumer via JSON or OAuth2 form."""
    content_type = request.headers.get("content-type", "")
    username = ""
    password = ""
    mfa_code = None
    target_role = None

    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception:
            body = {}
        username = str(body.get("username") or body.get("email") or body.get("employee_id") or body.get("employeeId") or "")
        password = str(body.get("password") or "")
        mfa_code = body.get("mfa_code") or body.get("mfaCode")
        target_role = body.get("target_role") or body.get("targetRole")
    else:
        form_data = await request.form()
        username = str(form_data.get("username") or form_data.get("email") or form_data.get("employee_id") or "")
        password = str(form_data.get("password") or "")
        mfa_code = form_data.get("mfa_code") or form_data.get("mfaCode")
        target_role = form_data.get("target_role") or form_data.get("targetRole")

    clean_ident = username.strip().lower()
    enforce_account_limit(clean_ident)
    client_ip = request.client.host if request.client else ""

    # Look up user by email or ID or canonical identifier
    u = db.query(User).filter(
        or_(func.lower(User.email) == clean_ident, User.id == username.strip())
    ).first()

    # Employee ID alias mapping (e.g. EMP-UGVCL-001 -> Priya Rathod, UGVCL-ENG-01 -> Vikram Zala)
    if not u:
        if clean_ident in ("emp-ugvcl-001", "emp-88219", "ugvcl-off-01"):
            u = db.query(User).filter(func.lower(User.email) == "employee@vidyutflow.demo").first()
        elif clean_ident in ("ugvcl-eng-01", "emp-eng-01", "field-01"):
            u = db.query(User).filter(func.lower(User.email) == "field@vidyutflow.demo").first()
        elif clean_ident in ("admin-01", "adm-ugvcl-01", "superadmin"):
            u = db.query(User).filter(func.lower(User.email) == "admin@vidyutflow.demo").first()

    if not u or not u.is_active or not verify_password(password, u.hashed_password):
        audit(db, None, "LOGIN_FAILED", "user", clean_ident, f"ip={client_ip}")
        db.commit()
        raise HTTPException(401, "Invalid email or password")

    reset_account_limit(clean_ident)

    # Role enforcement & Role Mismatch protection
    role_map = {
        "field": "engineer",
        "engineer": "engineer",
        "employee": "officer",
        "officer": "officer",
        "admin": "admin",
        "management": "admin",
        "consumer": "consumer"
    }
    if target_role:
        norm_target = role_map.get(str(target_role).lower(), str(target_role).lower())
        if norm_target != u.role:
            audit(db, u, "LOGIN_ROLE_MISMATCH", "user", u.id, f"target={target_role} actual={u.role}")
            db.commit()
            raise HTTPException(
                403,
                f"Account {u.email} is authorized for the '{u.role}' role, not '{target_role}'. Please select the correct account type."
            )

    # Multi-factor authentication verification for enabled accounts
    if getattr(u, "mfa_enabled", False):
        if not mfa_code:
            challenge_token = create_token(u.id, u.role, token_type="mfa_challenge", expires_minutes=5)
            return {
                "mfa_required": True,
                "mfa_token": challenge_token,
                "user_id": u.id,
                "email": u.email,
                "role": u.role,
                "name": u.name,
            }
        else:
            mfa_valid = False
            if u.mfa_secret_encrypted:
                try:
                    totp_sec = decrypt_totp_secret(u.mfa_secret_encrypted)
                    mfa_valid = verify_totp_code(totp_sec, str(mfa_code).strip())
                except Exception:
                    mfa_valid = False
            if not mfa_valid and u.mfa_recovery_hashes_json:
                try:
                    rec_hashes = json.loads(u.mfa_recovery_hashes_json)
                    valid_rec, updated_hashes = verify_recovery_code(rec_hashes, str(mfa_code).strip())
                    if valid_rec:
                        mfa_valid = True
                        u.mfa_recovery_hashes_json = json.dumps(updated_hashes)
                        db.commit()
                except Exception:
                    pass
            if not mfa_valid:
                audit(db, u, "MFA_FAILED", "user", u.id, f"ip={client_ip}")
                db.commit()
                raise HTTPException(401, "Invalid MFA verification code")

    # Issue access token + refresh token bound to server-side UserSession
    jti = str(uuid.uuid4())
    raw_refresh, refresh_hash = generate_refresh_token()
    token_family = str(uuid.uuid4())
    token = create_token(u.id, u.role, jti=jti)
    now_utc = datetime.now(timezone.utc)
    exp_refresh = now_utc + timedelta(days=settings.refresh_token_days)

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
    audit(db, u, "LOGIN_SUCCESS", "user", u.id, f"ip={client_ip} jti={jti[:8]}")
    db.commit()

    issue_cookie = bool(use_cookie or x_use_cookie_session in ("1", "true"))
    if issue_cookie:
        _set_auth_cookie(response, token)
        _set_refresh_cookie(response, raw_refresh)

    designation = (
        "Executive Engineer" if u.role == "officer" else
        ("Field Technical Officer" if u.role == "engineer" else
        ("Super Administrator" if u.role == "admin" else "Citizen Consumer"))
    )

    return {
        "authenticated": True,
        "access_token": token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "expires_in": settings.access_token_minutes * 60,
        "cookie_auth": issue_cookie,
        "role": u.role,
        "name": u.name,
        "user_id": u.id,
        "zone": u.zone,
        "discom": "UGVCL",
        "user": {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "zone": u.zone,
            "discom": "UGVCL",
            "designation": designation,
            "subdivision": "Mehsana City North"
        }
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
            sub = p.get("sub", "")
            actor = db.get(User, sub) if sub else None
            audit(db, actor or sub, "LOGOUT", "session", jti, f"jti={jti[:8]} revoked=true")
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
    clean_label = sanitize_untrusted_text(body.label)
    clean_name = sanitize_untrusted_text(body.applicant_name)
    clean_address = sanitize_untrusted_text(body.address)
    pin = sanitize_untrusted_text(body.pin_code).strip()
    if pin and (len(pin) != 6 or not pin.isascii() or not pin.isdigit() or pin.startswith("0")):
        raise HTTPException(422, "Valid 6-digit Indian PIN code is required")
    row = SavedPremise(
        user_id=u.id,
        label=clean_label,
        applicant_name=clean_name,
        phone=digits,
        address=clean_address,
        zone=canonical_zone,
        pin_code=pin,
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
