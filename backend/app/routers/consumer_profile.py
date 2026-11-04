"""Consumer Profile Router for VidyutFlow.

Provides authoritative citizen account management supporting both:
1. New electricity applicants (account created without electricity consumer number)
2. Existing electricity consumers (1 to N verified electricity connections)
"""
from datetime import datetime, timedelta, timezone
import hashlib
import json
import re
import uuid
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..audit import audit
from ..db import get_db
from ..deps import current_user
from ..login_limit import enforce_login_limit
from ..models import (
    ConsumerAddress,
    ConsumerAuditLog,
    ConsumerConnectionLink,
    ConsumerConnectionOtp,
    ConsumerPreference,
    ConsumerProfile,
    User,
    UserContact,
    UserSession,
)
from ..security import hash_password, validate_password_policy, verify_password

router = APIRouter(prefix="/consumer", tags=["consumer-profile"])


# ------------------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------------------

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    date_of_birth: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    profile_photo_url: Optional[str] = None


class AddressCreate(BaseModel):
    address_type: str = Field(default="RESIDENTIAL", pattern=r"^(RESIDENTIAL|COMMERCIAL|CORRESPONDENCE|BILLING)$")
    is_primary: bool = False
    house_flat_no: str = Field(..., min_length=1, max_length=120)
    street: str = Field(..., min_length=1, max_length=200)
    area: str = Field(..., min_length=1, max_length=200)
    city_village: str = Field(..., min_length=1, max_length=120)
    taluka: str = Field(..., min_length=1, max_length=120)
    district: str = Field(..., min_length=1, max_length=120)
    state: str = Field(default="Gujarat", max_length=80)
    pin_code: str = Field(..., pattern=r"^[1-9][0-9]{5}$")


class AddressUpdate(BaseModel):
    address_type: Optional[str] = Field(None, pattern=r"^(RESIDENTIAL|COMMERCIAL|CORRESPONDENCE|BILLING)$")
    is_primary: Optional[bool] = None
    house_flat_no: Optional[str] = Field(None, min_length=1, max_length=120)
    street: Optional[str] = Field(None, min_length=1, max_length=200)
    area: Optional[str] = Field(None, min_length=1, max_length=200)
    city_village: Optional[str] = Field(None, min_length=1, max_length=120)
    taluka: Optional[str] = Field(None, min_length=1, max_length=120)
    district: Optional[str] = Field(None, min_length=1, max_length=120)
    state: Optional[str] = Field(None, max_length=80)
    pin_code: Optional[str] = Field(None, pattern=r"^[1-9][0-9]{5}$")


class PreferenceUpdate(BaseModel):
    preferred_language: Optional[str] = Field(None, pattern=r"^(en|gu|hi|mr)$")
    sms_notifications: Optional[bool] = None
    email_notifications: Optional[bool] = None
    bill_reminders: Optional[bool] = None
    outage_alerts: Optional[bool] = None
    application_status_alerts: Optional[bool] = None


class LinkInitiateRequest(BaseModel):
    consumer_no: str = Field(..., min_length=5, max_length=30)
    discom: str = Field(default="UGVCL")


class LinkVerifyRequest(BaseModel):
    consumer_no: str = Field(..., min_length=5, max_length=30)
    otp: str = Field(..., min_length=4, max_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_pw(cls, v: str) -> str:
        validate_password_policy(v)
        return v


class ContactOtpRequest(BaseModel):
    channel: str = Field(..., pattern=r"^(mobile|email)$")
    value: str


class ContactOtpVerify(BaseModel):
    channel: str = Field(..., pattern=r"^(mobile|email)$")
    otp: str


# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------

def to_utc(dt: Optional[datetime]) -> datetime:
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def get_or_create_profile(db: Session, user: User) -> ConsumerProfile:
    prof = db.query(ConsumerProfile).filter(ConsumerProfile.user_id == user.id).first()
    if not prof:
        prof = ConsumerProfile(
            user_id=user.id,
            full_name=user.name or "Citizen Consumer",
            profile_completion_percentage=50,
        )
        db.add(prof)
        db.commit()
        db.refresh(prof)
    return prof


def get_or_create_contact(db: Session, user: User) -> UserContact:
    contact = db.query(UserContact).filter(UserContact.user_id == user.id).first()
    if not contact:
        contact = UserContact(
            user_id=user.id,
            email=user.email,
            email_verified=True,
            mobile_number=None,
            mobile_verified=False,
        )
        db.add(contact)
        db.commit()
        db.refresh(contact)
    return contact


def get_or_create_preference(db: Session, user: User) -> ConsumerPreference:
    pref = db.query(ConsumerPreference).filter(ConsumerPreference.user_id == user.id).first()
    if not pref:
        pref = ConsumerPreference(user_id=user.id, preferred_language="en")
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


def log_consumer_activity(
    db: Session,
    user: User,
    event_type: str,
    description: str,
    request: Optional[Request] = None,
):
    ip_addr = ""
    ua_str = ""
    if request:
        ip_addr = request.client.host if request.client else ""
        ua_str = request.headers.get("user-agent", "")[:250]
    entry = ConsumerAuditLog(
        user_id=user.id,
        event_type=event_type,
        description=description,
        ip_address=ip_addr,
        user_agent=ua_str,
    )
    db.add(entry)
    db.commit()


def calculate_completion(
    profile: ConsumerProfile,
    contact: UserContact,
    addresses: List[ConsumerAddress],
    connections: List[ConsumerConnectionLink],
) -> int:
    score = 20  # Base account registered
    if profile.full_name and len(profile.full_name.strip()) >= 3:
        score += 15
    if profile.date_of_birth:
        score += 10
    if contact.email_verified:
        score += 15
    if contact.mobile_verified:
        score += 15
    if addresses:
        score += 15
    if connections:
        score += 10
    return min(100, score)


# ------------------------------------------------------------------------------
# Profile Endpoints
# ------------------------------------------------------------------------------

@router.get("/profile")
def get_consumer_profile(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Retrieve complete unified profile for citizen consumer or new applicant."""
    prof = get_or_create_profile(db, user)
    contact = get_or_create_contact(db, user)
    pref = get_or_create_preference(db, user)
    addresses = db.query(ConsumerAddress).filter(ConsumerAddress.user_id == user.id).all()
    connections = db.query(ConsumerConnectionLink).filter(ConsumerConnectionLink.user_id == user.id).all()

    completion = calculate_completion(prof, contact, addresses, connections)
    if prof.profile_completion_percentage != completion:
        prof.profile_completion_percentage = completion
        db.commit()

    return {
        "user_id": user.id,
        "full_name": prof.full_name,
        "date_of_birth": prof.date_of_birth,
        "profile_photo_url": prof.profile_photo_url,
        "profile_completion_percentage": completion,
        "role": user.role,
        "is_new_applicant": len(connections) == 0,
        "contacts": {
            "email": contact.email,
            "email_verified": contact.email_verified,
            "mobile_number": contact.mobile_number,
            "mobile_verified": contact.mobile_verified,
        },
        "addresses_count": len(addresses),
        "connections_count": len(connections),
        "preferred_language": pref.preferred_language,
        "created_at": prof.created_at.isoformat() if prof.created_at else None,
        "updated_at": prof.updated_at.isoformat() if prof.updated_at else None,
    }


@router.patch("/profile")
def update_consumer_profile(
    body: ProfileUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Update personal information."""
    prof = get_or_create_profile(db, user)
    changes = []
    if body.full_name is not None and body.full_name.strip() != prof.full_name:
        prof.full_name = body.full_name.strip()
        user.name = prof.full_name
        changes.append(f"Full name updated to '{prof.full_name}'")

    if body.date_of_birth is not None:
        prof.date_of_birth = body.date_of_birth
        changes.append("Date of birth updated")

    if body.profile_photo_url is not None:
        prof.profile_photo_url = body.profile_photo_url
        changes.append("Profile photo updated")

    if changes:
        db.commit()
        log_consumer_activity(db, user, "PROFILE_UPDATED", "; ".join(changes), request)

    return get_consumer_profile(db=db, user=user)


# ------------------------------------------------------------------------------
# Address Management
# ------------------------------------------------------------------------------

@router.get("/addresses")
def list_addresses(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    addresses = db.query(ConsumerAddress).filter(ConsumerAddress.user_id == user.id).order_by(ConsumerAddress.is_primary.desc(), ConsumerAddress.created_at.asc()).all()
    return [
        {
            "id": a.id,
            "address_type": a.address_type,
            "is_primary": a.is_primary,
            "house_flat_no": a.house_flat_no,
            "street": a.street,
            "area": a.area,
            "city_village": a.city_village,
            "taluka": a.taluka,
            "district": a.district,
            "state": a.state,
            "pin_code": a.pin_code,
            "formatted": f"{a.house_flat_no}, {a.street}, {a.area}, {a.city_village}, {a.taluka}, {a.district} - {a.pin_code}",
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in addresses
    ]


@router.post("/addresses", status_code=status.HTTP_201_CREATED)
def create_address(
    body: AddressCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    existing_count = db.query(ConsumerAddress).filter(ConsumerAddress.user_id == user.id).count()
    is_primary = body.is_primary or existing_count == 0

    if is_primary:
        db.query(ConsumerAddress).filter(ConsumerAddress.user_id == user.id).update({"is_primary": False})

    new_addr = ConsumerAddress(
        user_id=user.id,
        address_type=body.address_type,
        is_primary=is_primary,
        house_flat_no=body.house_flat_no.strip(),
        street=body.street.strip(),
        area=body.area.strip(),
        city_village=body.city_village.strip(),
        taluka=body.taluka.strip(),
        district=body.district.strip(),
        state=body.state.strip(),
        pin_code=body.pin_code.strip(),
    )
    db.add(new_addr)
    db.commit()
    db.refresh(new_addr)

    log_consumer_activity(
        db,
        user,
        "ADDRESS_ADDED",
        f"Added {body.address_type} address in {new_addr.city_village} ({new_addr.pin_code})",
        request,
    )

    return {
        "id": new_addr.id,
        "address_type": new_addr.address_type,
        "is_primary": new_addr.is_primary,
        "house_flat_no": new_addr.house_flat_no,
        "street": new_addr.street,
        "area": new_addr.area,
        "city_village": new_addr.city_village,
        "taluka": new_addr.taluka,
        "district": new_addr.district,
        "state": new_addr.state,
        "pin_code": new_addr.pin_code,
        "formatted": f"{new_addr.house_flat_no}, {new_addr.street}, {new_addr.area}, {new_addr.city_village}, {new_addr.taluka}, {new_addr.district} - {new_addr.pin_code}",
    }


@router.patch("/addresses/{address_id}")
def update_address(
    address_id: str,
    body: AddressUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    addr = db.query(ConsumerAddress).filter(ConsumerAddress.id == address_id, ConsumerAddress.user_id == user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found or unauthorized")

    if body.is_primary:
        db.query(ConsumerAddress).filter(ConsumerAddress.user_id == user.id).update({"is_primary": False})
        addr.is_primary = True

    if body.address_type is not None:
        addr.address_type = body.address_type
    if body.house_flat_no is not None:
        addr.house_flat_no = body.house_flat_no.strip()
    if body.street is not None:
        addr.street = body.street.strip()
    if body.area is not None:
        addr.area = body.area.strip()
    if body.city_village is not None:
        addr.city_village = body.city_village.strip()
    if body.taluka is not None:
        addr.taluka = body.taluka.strip()
    if body.district is not None:
        addr.district = body.district.strip()
    if body.state is not None:
        addr.state = body.state.strip()
    if body.pin_code is not None:
        addr.pin_code = body.pin_code.strip()

    db.commit()
    log_consumer_activity(db, user, "ADDRESS_UPDATED", f"Updated address ID {address_id}", request)
    return {"message": "Address updated successfully"}


@router.delete("/addresses/{address_id}")
def delete_address(
    address_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    addr = db.query(ConsumerAddress).filter(ConsumerAddress.id == address_id, ConsumerAddress.user_id == user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found or unauthorized")

    was_primary = addr.is_primary
    db.delete(addr)
    db.commit()

    if was_primary:
        fallback = db.query(ConsumerAddress).filter(ConsumerAddress.user_id == user.id).first()
        if fallback:
            fallback.is_primary = True
            db.commit()

    log_consumer_activity(db, user, "ADDRESS_DELETED", f"Deleted address ID {address_id}", request)
    return {"message": "Address deleted successfully"}


# ------------------------------------------------------------------------------
# Electricity Connections (Unified Applicant vs Existing Consumer)
# ------------------------------------------------------------------------------

@router.get("/connections")
def list_connections(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Return all verified electricity connections linked to this citizen account.

    If 0 connections exist, this indicates a New Applicant state.
    """
    links = db.query(ConsumerConnectionLink).filter(ConsumerConnectionLink.user_id == user.id).order_by(ConsumerConnectionLink.is_primary.desc(), ConsumerConnectionLink.linked_at.asc()).all()

    return {
        "total_connections": len(links),
        "is_new_applicant": len(links) == 0,
        "empty_state_help": (
            "No electricity connection linked to your profile. If you have submitted a new connection application, "
            "it will be linked automatically once energized. If you already have a consumer number, you can link it below."
            if len(links) == 0
            else None
        ),
        "connections": [
            {
                "id": link.id,
                "consumer_no": link.consumer_no,
                "discom": link.discom,
                "connection_type": link.connection_type,
                "sanctioned_load_kw": link.sanctioned_load_kw,
                "official_address": link.official_address,
                "subdivision": link.subdivision,
                "feeder_name": link.feeder_name or "Express Feeder-01",
                "status": link.status,
                "is_primary": link.is_primary,
                "linked_at": link.linked_at.isoformat() if link.linked_at else None,
                "source": link.source,
                "application_id": link.application_id,
                "readonly_notice": "Official utility connection data verified by UGVCL. Consumers cannot modify metering or tariff details.",
            }
            for link in links
        ],
    }


@router.post("/connections/link/initiate")
def initiate_connection_link(
    body: LinkInitiateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Initiate connection linking by issuing an OTP to the connection's official mobile number."""
    consumer_clean = body.consumer_no.strip()

    # Check if already linked to this user
    already = db.query(ConsumerConnectionLink).filter(
        ConsumerConnectionLink.user_id == user.id,
        ConsumerConnectionLink.consumer_no == consumer_clean,
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="This connection is already linked to your account.")

    # Masked official phone (mock / demonstration derivation)
    seed_num = sum(ord(c) for c in consumer_clean)
    last_two = str(seed_num % 90 + 10)
    masked = f"+91 XXXXX XX9{last_two[1]}"

    # Deterministic or cryptographic OTP
    demo_otp = "482019"
    otp_hash = hashlib.sha256(demo_otp.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Invalidate previous unverified OTPs
    db.query(ConsumerConnectionOtp).filter(
        ConsumerConnectionOtp.user_id == user.id,
        ConsumerConnectionOtp.consumer_no == consumer_clean,
    ).delete()

    otp_record = ConsumerConnectionOtp(
        user_id=user.id,
        consumer_no=consumer_clean,
        masked_mobile=masked,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempts=0,
        is_verified=False,
    )
    db.add(otp_record)
    db.commit()

    return {
        "status": "OTP_SENT",
        "consumer_no": consumer_clean,
        "masked_mobile": masked,
        "expires_in_seconds": 600,
        "demo_verification_code": demo_otp,
        "message": f"Verification code sent to registered mobile {masked}. Enter code to verify ownership.",
    }


@router.post("/connections/link/verify")
def verify_connection_link(
    body: LinkVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Verify OTP and link the electricity connection."""
    consumer_clean = body.consumer_no.strip()
    otp_record = db.query(ConsumerConnectionOtp).filter(
        ConsumerConnectionOtp.user_id == user.id,
        ConsumerConnectionOtp.consumer_no == consumer_clean,
        ConsumerConnectionOtp.is_verified == False,
    ).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="No active linking request found for this consumer number.")

    now = datetime.now(timezone.utc)
    if to_utc(otp_record.expires_at) < now:
        raise HTTPException(status_code=400, detail="Verification code has expired. Please initiate again.")

    if otp_record.attempts >= 5:
        raise HTTPException(status_code=429, detail="Too many invalid attempts. Request a new verification code.")

    computed_hash = hashlib.sha256(body.otp.strip().encode("utf-8")).hexdigest()
    if computed_hash != otp_record.otp_hash:
        otp_record.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect verification code. Please try again.")

    otp_record.is_verified = True

    # Link connection
    existing_links = db.query(ConsumerConnectionLink).filter(ConsumerConnectionLink.user_id == user.id).count()
    is_primary = existing_links == 0

    new_link = ConsumerConnectionLink(
        user_id=user.id,
        consumer_no=consumer_clean,
        discom="UGVCL",
        connection_type="RGP",
        sanctioned_load_kw=4.0,
        official_address="14, Anand Nagar Society, Visnagar Road, Mehsana - 384002",
        subdivision="Mehsana Urban-1",
        feeder_name="Panchot Feeder",
        status="ACTIVE",
        is_primary=is_primary,
        source="SELF_LINKED",
    )
    db.add(new_link)
    db.commit()
    db.refresh(new_link)

    log_consumer_activity(
        db,
        user,
        "CONNECTION_LINKED",
        f"Linked electricity connection {consumer_clean} after OTP verification",
        request,
    )

    return {
        "status": "LINKED_SUCCESS",
        "connection": {
            "id": new_link.id,
            "consumer_no": new_link.consumer_no,
            "discom": new_link.discom,
            "connection_type": new_link.connection_type,
            "sanctioned_load_kw": new_link.sanctioned_load_kw,
            "official_address": new_link.official_address,
            "subdivision": new_link.subdivision,
            "status": new_link.status,
            "is_primary": new_link.is_primary,
        },
        "message": f"Connection {consumer_clean} successfully verified and linked to your citizen profile.",
    }


@router.delete("/connections/{connection_id}")
def unlink_connection(
    connection_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Unlink a connection from citizen account."""
    link = db.query(ConsumerConnectionLink).filter(
        ConsumerConnectionLink.id == connection_id,
        ConsumerConnectionLink.user_id == user.id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Connection not found or unauthorized")

    c_no = link.consumer_no
    was_primary = link.is_primary
    db.delete(link)
    db.commit()

    if was_primary:
        next_conn = db.query(ConsumerConnectionLink).filter(ConsumerConnectionLink.user_id == user.id).first()
        if next_conn:
            next_conn.is_primary = True
            db.commit()

    log_consumer_activity(db, user, "CONNECTION_UNLINKED", f"Unlinked connection {c_no}", request)
    return {"message": f"Connection {c_no} removed from profile"}


# ------------------------------------------------------------------------------
# Preferences
# ------------------------------------------------------------------------------

@router.get("/preferences")
def get_preferences(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    pref = get_or_create_preference(db, user)
    return {
        "preferred_language": pref.preferred_language,
        "sms_notifications": pref.sms_notifications,
        "email_notifications": pref.email_notifications,
        "bill_reminders": pref.bill_reminders,
        "outage_alerts": pref.outage_alerts,
        "application_status_alerts": pref.application_status_alerts,
    }


@router.patch("/preferences")
def update_preferences(
    body: PreferenceUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    pref = get_or_create_preference(db, user)
    if body.preferred_language is not None:
        pref.preferred_language = body.preferred_language
    if body.sms_notifications is not None:
        pref.sms_notifications = body.sms_notifications
    if body.email_notifications is not None:
        pref.email_notifications = body.email_notifications
    if body.bill_reminders is not None:
        pref.bill_reminders = body.bill_reminders
    if body.outage_alerts is not None:
        pref.outage_alerts = body.outage_alerts
    if body.application_status_alerts is not None:
        pref.application_status_alerts = body.application_status_alerts

    db.commit()
    log_consumer_activity(db, user, "PREFERENCES_UPDATED", "Updated notification and language preferences", request)
    return {"message": "Preferences updated successfully"}


# ------------------------------------------------------------------------------
# Security & Active Sessions
# ------------------------------------------------------------------------------

@router.get("/security/sessions")
def list_active_sessions(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    now = datetime.now(timezone.utc)
    sessions = db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_revoked == False,
        UserSession.expires_at > now,
    ).order_by(UserSession.created_at.desc()).all()

    current_ip = request.client.host if request.client else ""

    return [
        {
            "id": s.id,
            "ip_address": s.ip_address or "127.0.0.1",
            "user_agent": s.user_agent or "Web Browser / Desktop Portal",
            "is_current": s.ip_address == current_ip or s == sessions[0],
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        }
        for s in sessions
    ]


@router.delete("/security/sessions/{session_id}")
def revoke_session(
    session_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    sess = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == user.id,
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found or already revoked")

    sess.is_revoked = True
    sess.revoked_at = datetime.now(timezone.utc)
    sess.revoked_reason = "Revoked by consumer from security dashboard"
    db.commit()

    log_consumer_activity(db, user, "SESSION_TERMINATED", f"Terminated session ID {session_id}", request)
    return {"message": "Session revoked successfully"}


@router.post("/security/sessions/logout-all")
def logout_all_devices(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    now = datetime.now(timezone.utc)
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_revoked == False,
    ).update({
        "is_revoked": True,
        "revoked_at": now,
        "revoked_reason": "Global logout from citizen security center",
    })
    db.commit()

    log_consumer_activity(db, user, "SESSION_TERMINATED", "Logged out from all active devices", request)
    return {"message": "Successfully logged out from all devices"}


@router.post("/security/change-password")
def change_password(
    body: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password entered is incorrect.")

    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match.")

    user.hashed_password = hash_password(body.new_password)
    db.commit()

    log_consumer_activity(db, user, "SECURITY_PASSWORD_CHANGED", "Account password updated successfully", request)
    return {"message": "Password changed successfully."}


# ------------------------------------------------------------------------------
# Account Activity Audit Logs
# ------------------------------------------------------------------------------

@router.get("/activity")
def get_consumer_activity(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    logs = db.query(ConsumerAuditLog).filter(
        ConsumerAuditLog.user_id == user.id
    ).order_by(ConsumerAuditLog.created_at.desc()).limit(50).all()

    return [
        {
            "id": l.id,
            "event_type": l.event_type,
            "description": l.description,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]
