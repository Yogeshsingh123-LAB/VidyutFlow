import math
from fastapi import APIRouter, Depends, Header, HTTPException, Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session

from ..audit import audit
from ..config import settings
from ..db import get_db
from ..deps import AUTH_COOKIE_NAME, current_user, require
from ..login_limit import enforce_login_limit
from ..models import SavedPremise, User
from ..security import create_token, hash_password, verify_password
from .staff import resolve_active_zone

router = APIRouter(prefix="/auth", tags=["auth"])

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
        if len(password.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes when encoded as UTF-8")
        return password


class SimulatedSsoLoginBody(BaseModel):
    provider_id: str = Field(..., min_length=3, max_length=80)
    email: str = Field(..., min_length=3, max_length=160)
    state: str = Field(..., min_length=8, max_length=128)


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
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered")
    u = User(
        email=body.email,
        name=body.name,
        role=body.role,
        zone=canonical_zone,
        hashed_password=hash_password(body.password),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role, "zone": u.zone}


@router.post("/login", dependencies=[Depends(enforce_login_limit)])
def login(
    response: Response,
    use_cookie: bool = False,
    x_use_cookie_session: str | None = Header(default=None),
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    u = db.query(User).filter(User.email == form.username).first()
    if not u or not u.is_active or not verify_password(form.password, u.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(u.id, u.role)
    issue_cookie = bool(use_cookie or x_use_cookie_session in ("1", "true"))
    if issue_cookie:
        _set_auth_cookie(response, token)
    return {
        "access_token": token,
        "token_type": "bearer",
        "cookie_auth": issue_cookie,
        "role": u.role,
        "name": u.name,
        "user_id": u.id,
        "zone": u.zone,
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")
    return {"logged_out": True}


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
    token = create_token(u.id, u.role)
    _set_auth_cookie(response, token)
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
        "token_type": "bearer",
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
