from __future__ import annotations

import base64
from datetime import datetime, timezone
import hashlib
import hmac
import json
import math
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..audit import log_event
from ..billing_engine import calculate_configurable_cycle_tariff_breakdown
from ..config import settings
from ..db import get_db
from ..models import (
    ActorIdempotencyRecord,
    ConsumerBillingReviewHistoryRecord,
    ConsumerBillingReviewRecord,
    ConsumerConnection,
    FinancialAdjustmentHistoryRecord,
    FinancialAdjustmentProposalRecord,
    MeterAmbiguousDigitRecord,
    MeterAnomalyCaseRecord,
    MeterAnomalyStatusHistoryRecord,
    MeterConfigurationModel,
    MeterConfigurationVersionModel,
    MeterEventRecord,
    MeterNotificationDedupRecord,
    MeterOcrExtractionRecord,
    MeterPrivatePhotoRecord,
    MeterReadingReviewHistoryRecord,
    MeterReadingSubmissionRecord,
    MeterThresholdPolicyVersionRecord,
    Notification,
    RoleEnum,
    User,
    UtilityBill,
    WorkOrder,
)
from ..security import decode_access_token
from ..uploads import (
    decrypt_upload_at_rest,
    encrypt_upload_at_rest,
    get_storage_provider,
)

router = APIRouter(prefix="/meter-readings", tags=["meter-readings"])
optional_bearer = HTTPBearer(auto_error=False)

# ==============================================================================
# CANONICAL DEMO CONNECTION & BILL REFERENCE BASELINES (READ-ONLY)
# ==============================================================================
# Preserves all existing UGVCL connections, historical readings, and bills verbatim.

CANONICAL_CONNECTIONS: dict[str, dict[str, Any]] = {
    "04281-99231": {
        "connectionNo": "04281-99231",
        "consumerNo": "04281-99231",
        "consumerName": "Smt. Meenaben Patel",
        "ownerEmails": [
            "consumer@vidyutflow.demo",
            "consumer@vidyut.local",
            "ramesh.patel@consumer.ugvcl.com",
            "consumer@ugvcl.com",
        ],
        "tariffCategory": "RGP",
        "sanctionedLoadKw": 5.0,
        "subdivision": "Mehsana City North",
        "meterSerial": "MTR-2024-884102",
        "previousReading": 14820.0,
        "previousReadingDate": "2026-10-01",
        "historicalCycleUnits": [360.0, 410.0],
        "historicalCycleDays": [30, 31],
    },
    "04281-77190": {
        "connectionNo": "04281-77190",
        "consumerNo": "04281-77190",
        "consumerName": "Patel Engineering & Solar Fabrication",
        "ownerEmails": [
            "consumer@vidyutflow.demo",
            "consumer@vidyut.local",
            "ramesh.patel@consumer.ugvcl.com",
            "consumer@ugvcl.com",
        ],
        "tariffCategory": "NRGP",
        "sanctionedLoadKw": 18.0,
        "subdivision": "Mehsana Industrial GIDC",
        "meterSerial": "MTR-2023-339811",
        "previousReading": 48920.0,
        "previousReadingDate": "2026-10-01",
        "historicalCycleUnits": [1710.0, 1650.0],
        "historicalCycleDays": [30, 31],
    },
    "31890244190": {
        "connectionNo": "31890244190",
        "consumerNo": "31890244190",
        "consumerName": "Rameshbhai Karsanbhai Patel",
        "ownerEmails": [
            "ramesh.patel@consumer.ugvcl.com",
            "consumer@ugvcl.com",
            "consumer@vidyutflow.demo",
            "consumer@vidyut.local",
        ],
        "tariffCategory": "RGP",
        "sanctionedLoadKw": 4.0,
        "subdivision": "Sabarmati Subdivision",
        "meterSerial": "UGV-SM-884120",
        "previousReading": 14560.0,
        "previousReadingDate": "2026-10-03",
        "historicalCycleUnits": [320.0, 290.0],
        "historicalCycleDays": [61, 61],
    },
    "31890277451": {
        "connectionNo": "31890277451",
        "consumerNo": "31890277451",
        "consumerName": "Rameshbhai Karsanbhai Patel (Shop Unit)",
        "ownerEmails": [
            "ramesh.patel@consumer.ugvcl.com",
            "consumer@ugvcl.com",
            "consumer@vidyutflow.demo",
            "consumer@vidyut.local",
        ],
        "tariffCategory": "NRGP",
        "sanctionedLoadKw": 6.0,
        "subdivision": "Sabarmati Subdivision",
        "meterSerial": "UGV-SM-910442",
        "previousReading": 8630.0,
        "previousReadingDate": "2026-10-06",
        "historicalCycleUnits": [410.0, 395.0],
        "historicalCycleDays": [61, 61],
    },
    "31890255812": {
        "connectionNo": "31890255812",
        "consumerNo": "31890255812",
        "consumerName": "31890255812 (Commercial)",
        "ownerEmails": ["commercial.31890255812@consumer.ugvcl.com"],
        "tariffCategory": "NRGP",
        "sanctionedLoadKw": 15.0,
        "subdivision": "Palanpur East",
        "meterSerial": "UGV-CM-552108",
        "previousReading": 42800.0,
        "previousReadingDate": "2026-09-12",
        "historicalCycleUnits": [1250.0, 1180.0],
        "historicalCycleDays": [61, 61],
    },
    "31890261004": {
        "connectionNo": "31890261004",
        "consumerNo": "31890261004",
        "consumerName": "31890261004 (LTMD Industrial)",
        "ownerEmails": ["industrial.31890261004@consumer.ugvcl.com"],
        "tariffCategory": "LTMD",
        "sanctionedLoadKw": 45.0,
        "subdivision": "Himmatnagar North",
        "meterSerial": "UGV-IN-610049",
        "previousReading": 91400.0,
        "previousReadingDate": "2026-09-22",
        "historicalCycleUnits": [3400.0, 3280.0],
        "historicalCycleDays": [61, 61],
    },
}

CANONICAL_ASSIGNED_WORK_ORDERS: dict[str, dict[str, Any]] = {
    "WO-UG-2026-501": {
        "id": "WO-UG-2026-501",
        "connectionNo": "04281-99231",
        "assignedEmails": [
            "vikramaditya.solanki@vidyutflow.demo",
            "field@vidyutflow.demo",
            "engineer@vidyut.local",
            "vikram.solanki@ugvcl.com",
            "field@ugvcl.com",
        ],
        "assignedNames": ["Vikramaditya Solanki", "Vikram Zala", "Vikram Solanki", "Field Engineer"],
        "status": "In Progress",
    },
    "WO-2026-8819": {
        "id": "WO-2026-8819",
        "connectionNo": "31890244190",
        "assignedEmails": [
            "vikram.solanki@ugvcl.com",
            "field@ugvcl.com",
            "vikramaditya.solanki@vidyutflow.demo",
            "field@vidyutflow.demo",
            "engineer@vidyut.local",
        ],
        "assignedNames": ["Vikram Solanki", "Vikramaditya Solanki", "Vikram Zala", "Field Engineer"],
        "status": "In Progress",
    },
    "WO-2026-8824": {
        "id": "WO-2026-8824",
        "connectionNo": "31890255812",
        "assignedEmails": [
            "vikram.solanki@ugvcl.com",
            "field@ugvcl.com",
            "vikramaditya.solanki@vidyutflow.demo",
            "field@vidyutflow.demo",
            "engineer@vidyut.local",
        ],
        "assignedNames": ["Vikram Solanki", "Vikramaditya Solanki", "Vikram Zala", "Field Engineer"],
        "status": "Assigned",
    },
}

CANONICAL_BILLS: dict[str, dict[str, Any]] = {
    "BILL-UG-2026-10-8821": {
        "billNo": "BILL-UG-2026-10-8821",
        "connectionNo": "04281-99231",
        "consumerNo": "04281-99231",
        "consumerName": "Smt. Meenaben Patel",
        "tariffCategory": "RGP",
        "sanctionedLoadKw": 5.0,
        "billingPeriod": "September 2026",
        "previousReading": 14460.0,
        "previousReadingDate": "2026-09-01",
        "currentReading": 14820.0,
        "currentReadingDate": "2026-09-30",
        "cycleDays": 30,
        "unitsBilled": 360.0,
        "energyCharges": 1420.0,
        "fixedCharges": 180.0,
        "fpppaCharges": 432.0,
        "electricityDuty": 203.0,
        "arrears": 0.0,
        "delayedPaymentSurcharge": 0.0,
        "totalAmount": 2185.0,
    },
    "BILL-UG-2026-08-8821": {
        "billNo": "BILL-UG-2026-08-8821",
        "connectionNo": "04281-99231",
        "consumerNo": "04281-99231",
        "consumerName": "Smt. Meenaben Patel",
        "tariffCategory": "RGP",
        "sanctionedLoadKw": 5.0,
        "billingPeriod": "July 2026",
        "previousReading": 13690.0,
        "previousReadingDate": "2026-07-01",
        "currentReading": 14050.0,
        "currentReadingDate": "2026-07-31",
        "cycleDays": 31,
        "unitsBilled": 360.0,
        "energyCharges": 1420.0,
        "fixedCharges": 180.0,
        "fpppaCharges": 432.0,
        "electricityDuty": 203.0,
        "arrears": 0.0,
        "delayedPaymentSurcharge": 0.0,
        "totalAmount": 2185.0,
    },
    "UGV-2026-10-88412": {
        "billNo": "UGV-2026-10-88412",
        "connectionNo": "31890244190",
        "consumerNo": "31890244190",
        "consumerName": "Rameshbhai Karsanbhai Patel",
        "tariffCategory": "RGP",
        "sanctionedLoadKw": 4.0,
        "billingPeriod": "Aug–Sep 2026 (Bi-Monthly)",
        "previousReading": 14240.0,
        "previousReadingDate": "2026-08-03",
        "currentReading": 14560.0,
        "currentReadingDate": "2026-10-03",
        "cycleDays": 61,
        "unitsBilled": 320.0,
        "energyCharges": 1352.5,
        "fixedCharges": 140.0,
        "fpppaCharges": 912.0,
        "electricityDuty": 360.68,
        "arrears": 0.0,
        "delayedPaymentSurcharge": 0.0,
        "totalAmount": 2765.0,
    },
    "UGV-2026-08-74102": {
        "billNo": "UGV-2026-08-74102",
        "connectionNo": "31890244190",
        "consumerNo": "31890244190",
        "consumerName": "Rameshbhai Karsanbhai Patel",
        "tariffCategory": "RGP",
        "sanctionedLoadKw": 4.0,
        "billingPeriod": "Jun–Jul 2026 (Bi-Monthly)",
        "previousReading": 13950.0,
        "previousReadingDate": "2026-06-03",
        "currentReading": 14240.0,
        "currentReadingDate": "2026-08-03",
        "cycleDays": 61,
        "unitsBilled": 290.0,
        "energyCharges": 1211.5,
        "fixedCharges": 140.0,
        "fpppaCharges": 826.5,
        "electricityDuty": 326.7,
        "arrears": 0.0,
        "delayedPaymentSurcharge": 0.0,
        "totalAmount": 2505.0,
    },
    "UGV-2026-10-91004": {
        "billNo": "UGV-2026-10-91004",
        "connectionNo": "31890277451",
        "consumerNo": "31890277451",
        "consumerName": "Rameshbhai Karsanbhai Patel (Shop Unit)",
        "tariffCategory": "NRGP",
        "sanctionedLoadKw": 6.0,
        "billingPeriod": "Aug–Sep 2026 (Bi-Monthly)",
        "previousReading": 8220.0,
        "previousReadingDate": "2026-08-06",
        "currentReading": 8630.0,
        "currentReadingDate": "2026-10-06",
        "cycleDays": 61,
        "unitsBilled": 410.0,
        "energyCharges": 2029.5,
        "fixedCharges": 1080.0,
        "fpppaCharges": 1168.5,
        "electricityDuty": 855.6,
        "arrears": 0.0,
        "delayedPaymentSurcharge": 0.0,
        "totalAmount": 5134.0,
    },
    "UGV-2026-09-55190": {
        "billNo": "UGV-2026-09-55190",
        "connectionNo": "31890255812",
        "consumerNo": "31890255812",
        "consumerName": "31890255812 (Commercial)",
        "tariffCategory": "NRGP",
        "sanctionedLoadKw": 15.0,
        "subdivision": "Palanpur East",
        "meterSerial": "UGV-CM-552108",
        "previousReading": 41550.0,
        "previousReadingDate": "2026-07-13",
        "currentReading": 42800.0,
        "currentReadingDate": "2026-09-12",
        "cycleDays": 61,
        "unitsBilled": 1250.0,
        "energyCharges": 6355.0,
        "fixedCharges": 2700.0,
        "fpppaCharges": 3562.5,
        "electricityDuty": 2523.5,
        "arrears": 0.0,
        "delayedPaymentSurcharge": 0.0,
        "totalAmount": 15141.0,
    },
}

SYNTHETIC_DEMO_PHOTO_DATA_URL = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


# ==============================================================================
# AUTHENTICATED ACTOR CONTEXT (FASTAPI JWT OR SIGNED NODE COMPATIBILITY PROXY)
# ==============================================================================


class Phase11Actor(BaseModel):
    id: str
    email: str
    name: str
    role: str  # CONSUMER | FIELD_ENGINEER | EMPLOYEE | MANAGEMENT | ADMIN
    subdivision: str = "Sabarmati Subdivision"


def _normalize_role_str(role_val: str | RoleEnum) -> str:
    raw = role_val.value if isinstance(role_val, RoleEnum) else str(role_val)
    mapping = {
        "Consumer": "CONSUMER",
        "consumer": "CONSUMER",
        "CONSUMER": "CONSUMER",
        "Field Engineer": "FIELD_ENGINEER",
        "field": "FIELD_ENGINEER",
        "engineer": "FIELD_ENGINEER",
        "FIELD_ENGINEER": "FIELD_ENGINEER",
        "Employee": "EMPLOYEE",
        "employee": "EMPLOYEE",
        "officer": "EMPLOYEE",
        "EMPLOYEE": "EMPLOYEE",
        "Management": "MANAGEMENT",
        "management": "MANAGEMENT",
        "MANAGEMENT": "MANAGEMENT",
        "Admin": "ADMIN",
        "admin": "ADMIN",
        "ADMIN": "ADMIN",
    }
    return mapping.get(raw, raw.upper())


def get_phase11_actor(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
    db: Session = Depends(get_db),
) -> Phase11Actor:
    # 1. Check signed Node compatibility proxy headers
    proxy_user_id = request.headers.get("x-vidyutflow-proxy-user-id")
    proxy_email = request.headers.get("x-vidyutflow-proxy-user-email")
    proxy_name = request.headers.get("x-vidyutflow-proxy-user-name")
    proxy_role = request.headers.get("x-vidyutflow-proxy-user-role")
    proxy_sig = request.headers.get("x-vidyutflow-proxy-signature")

    if proxy_user_id and proxy_email and proxy_role and proxy_sig:
        proxy_secret = settings.secret_key
        signing_input = f"{proxy_user_id}:{proxy_email}:{proxy_name or ''}:{proxy_role}"
        expected_sig = hmac.new(
            proxy_secret.encode("utf-8"),
            signing_input.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if hmac.compare_digest(expected_sig, proxy_sig):
            return Phase11Actor(
                id=proxy_user_id,
                email=proxy_email.lower(),
                name=proxy_name or proxy_email,
                role=_normalize_role_str(proxy_role),
            )

    # 2. Check standard FastAPI Bearer JWT or access cookie
    token = creds.credentials if creds else request.cookies.get(settings.auth_cookie_name)
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required for meter reading operations.",
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user = db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive.")

    # Distinguish Management portal demo account from Admin when needed
    normalized_role = _normalize_role_str(user.role)
    if user.email.lower().startswith("management@"):
        normalized_role = "MANAGEMENT"

    return Phase11Actor(
        id=user.id,
        email=user.email.lower(),
        name=user.name,
        role=normalized_role,
    )


# ==============================================================================
# CRYPTOGRAPHIC PHOTO VAULT & IDEMPOTENCY HELPERS
# ==============================================================================


def _compute_payload_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _check_actor_idempotency(
    db: Session,
    *,
    client_uuid: str | None,
    endpoint: str,
    actor_id: str,
    payload_for_hash: dict[str, Any],
) -> dict[str, Any] | None:
    if not client_uuid or not client_uuid.strip():
        return None
    normalized_uuid = client_uuid.strip()
    incoming_hash = _compute_payload_hash(payload_for_hash)

    existing = db.scalar(
        select(ActorIdempotencyRecord).where(
            ActorIdempotencyRecord.client_uuid == normalized_uuid,
            ActorIdempotencyRecord.endpoint == endpoint,
        )
    )
    if not existing:
        return None

    if existing.actor_id != actor_id or existing.payload_hash != incoming_hash:
        raise HTTPException(
            status_code=409,
            detail={
                "error": (
                    "Idempotency conflict: clientUuid was already used by a different "
                    "actor or with a different request payload."
                ),
                "code": "IDEMPOTENCY_CONFLICT",
                "clientUuid": normalized_uuid,
                "endpoint": endpoint,
            },
        )

    return json.loads(existing.response_body_json)


def _record_actor_idempotency(
    db: Session,
    *,
    client_uuid: str | None,
    endpoint: str,
    actor_id: str,
    payload_for_hash: dict[str, Any],
    resource_type: str,
    resource_id: str,
    response_status: int,
    response_body: dict[str, Any],
) -> None:
    if not client_uuid or not client_uuid.strip():
        return
    normalized_uuid = client_uuid.strip()
    incoming_hash = _compute_payload_hash(payload_for_hash)
    record = ActorIdempotencyRecord(
        client_uuid=normalized_uuid,
        endpoint=endpoint,
        actor_id=actor_id,
        payload_hash=incoming_hash,
        resource_type=resource_type,
        resource_id=resource_id,
        response_status=response_status,
        response_body_json=json.dumps(response_body, default=str),
    )
    db.add(record)


def _store_encrypted_private_photo(
    db: Session,
    *,
    photo_data_url: str,
    owner_type: str,
    owner_id: str | None,
    connection_no: str,
    consumer_no: str,
    actor: Phase11Actor,
    photo_id_override: str | None = None,
) -> MeterPrivatePhotoRecord:
    trimmed = (photo_data_url or "").strip()
    if not trimmed.startswith("data:image/"):
        raise HTTPException(
            status_code=400,
            detail="Photograph must be a valid data:image/* base64 payload.",
        )

    header, _, b64_data = trimmed.partition(",")
    if not b64_data:
        raise HTTPException(status_code=400, detail="Malformed data URL payload.")

    mime_type = "image/jpeg"
    if ";" in header and ":" in header:
        mime_type = header.split(":", 1)[1].split(";", 1)[0].strip() or "image/jpeg"

    try:
        raw_bytes = base64.b64decode(b64_data, validate=False)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 image data.") from exc

    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image payload.")
    if len(raw_bytes) > 6 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Photograph exceeds 6MB limit.")

    sha256_hex = hashlib.sha256(raw_bytes).hexdigest()
    photo_id = photo_id_override or f"PHOTO-{uuid.uuid4().hex[:12].upper()}"
    storage_key = f"meter_photos/{photo_id}.enc"

    encrypted_blob = encrypt_upload_at_rest(raw_bytes, photo_id)
    storage = get_storage_provider()
    storage.save(storage_key, encrypted_blob)

    photo_record = MeterPrivatePhotoRecord(
        id=photo_id,
        owner_type=owner_type,
        owner_id=owner_id,
        connection_no=connection_no,
        consumer_no=consumer_no,
        uploaded_by_id=actor.id,
        uploaded_by_name=actor.name,
        uploaded_by_role=actor.role,
        storage_key=storage_key,
        mime_type=mime_type,
        byte_length=len(raw_bytes),
        sha256=sha256_hex,
        encryption_key_id="aes-256-gcm-hkdf-v1",
        metadata_stripped=True,
    )
    db.add(photo_record)
    return photo_record


def _read_decrypted_private_photo(photo_record: MeterPrivatePhotoRecord) -> str:
    storage = get_storage_provider()
    encrypted_blob = storage.read(photo_record.storage_key)
    raw_bytes = decrypt_upload_at_rest(encrypted_blob, photo_record.id)
    b64_str = base64.b64encode(raw_bytes).decode("ascii")
    return f"data:{photo_record.mime_type};base64,{b64_str}"


def _create_deduped_notification(
    db: Session,
    *,
    dedupe_key: str,
    recipient_key: str,
    user_id: str | None,
    category: str,
    reference_id: str,
    title: str,
    message: str,
) -> None:
    existing = db.scalar(
        select(MeterNotificationDedupRecord).where(
            MeterNotificationDedupRecord.dedupe_key == dedupe_key
        )
    )
    if existing:
        return

    notif_id = f"NTF-P11-{uuid.uuid4().hex[:10].upper()}"
    if user_id:
        user_exists = db.get(User, user_id)
        if user_exists:
            db.add(
                Notification(
                    id=notif_id,
                    user_id=user_id,
                    title=title,
                    message=message,
                    channel="IN_APP",
                    unread=True,
                )
            )
    db.add(
        MeterNotificationDedupRecord(
            dedupe_key=dedupe_key,
            recipient_key=recipient_key,
            category=category,
            reference_id=reference_id,
            notification_id=notif_id,
        )
    )


# ==============================================================================
# OWNERSHIP, ASSIGNMENT & ROLE AUTHORIZATION HELPERS
# ==============================================================================


def _resolve_connection_meta(db: Session, connection_no: str) -> dict[str, Any]:
    conn_key = connection_no.strip()
    if conn_key in CANONICAL_CONNECTIONS:
        return dict(CANONICAL_CONNECTIONS[conn_key])

    db_conn = db.scalar(
        select(ConsumerConnection).where(ConsumerConnection.consumer_no == conn_key)
    )
    if db_conn:
        owner = db.get(User, db_conn.user_id)
        owner_emails = [owner.email.lower()] if owner else []
        return {
            "connectionNo": conn_key,
            "consumerNo": conn_key,
            "consumerName": db_conn.consumer_name,
            "ownerEmails": owner_emails,
            "tariffCategory": db_conn.tariff_category or "RGP",
            "sanctionedLoadKw": float(db_conn.sanctioned_load_kw or 4.0),
            "subdivision": db_conn.subdivision_name or "Sabarmati Subdivision",
            "meterSerial": db_conn.meter_no or f"UGV-SM-{conn_key[-6:]}",
            "previousReading": 1000.0,
            "previousReadingDate": "2026-10-01",
            "historicalCycleUnits": [300.0, 290.0],
            "historicalCycleDays": [61, 61],
        }

    raise HTTPException(
        status_code=404,
        detail=f"Connection {conn_key} not found in UGVCL service registry.",
    )


def _consumer_owns_connection(
    db: Session, actor: Phase11Actor, connection_no: str
) -> bool:
    conn_key = connection_no.strip()
    meta = CANONICAL_CONNECTIONS.get(conn_key)
    if meta and actor.email.lower() in [e.lower() for e in meta.get("ownerEmails", [])]:
        return True

    db_conn = db.scalar(
        select(ConsumerConnection).where(
            ConsumerConnection.consumer_no == conn_key,
            ConsumerConnection.user_id == actor.id,
        )
    )
    return db_conn is not None


def _field_engineer_assigned_to_connection(
    db: Session,
    actor: Phase11Actor,
    connection_no: str,
    work_order_id: str | None = None,
) -> tuple[bool, str | None]:
    conn_key = connection_no.strip()
    for wo_id, wo_meta in CANONICAL_ASSIGNED_WORK_ORDERS.items():
        if work_order_id and wo_id != work_order_id:
            continue
        if wo_meta["connectionNo"] == conn_key and wo_meta["status"] != "Completed":
            if actor.email.lower() in [
                e.lower() for e in wo_meta["assignedEmails"]
            ] or actor.name in wo_meta["assignedNames"]:
                return True, wo_id

    stmt = select(WorkOrder).where(WorkOrder.assigned_to_user_id == actor.id)
    for wo in db.scalars(stmt).all():
        if work_order_id and wo.id != work_order_id:
            continue
        if conn_key in (wo.title or "") or conn_key in (wo.description or ""):
            return True, wo.id

    return False, None


def _ensure_not_management(actor: Phase11Actor, operation_desc: str) -> None:
    if actor.role == "MANAGEMENT":
        raise HTTPException(
            status_code=403,
            detail=(
                f"Management role is restricted to aggregate metrics only and cannot "
                f"access individual {operation_desc} or consumer PII."
            ),
        )


# ==============================================================================
# PURE DOMAIN CALCULATIONS (EFFECTIVE CONSUMPTION, ANOMALY ENGINE, SERIALIZERS)
# ==============================================================================


def _get_or_create_meter_config(
    db: Session, connection_no: str
) -> MeterConfigurationModel:
    conn_key = connection_no.strip()
    config = db.get(MeterConfigurationModel, conn_key)
    if config:
        return config

    meta = _resolve_connection_meta(db, conn_key)
    is_industrial = meta["tariffCategory"] == "LTMD"
    digit_count = 7 if is_industrial else 6
    integral_digits = 6 if is_industrial else 5
    fractional_digits = 1
    max_rollover = 999999.9 if is_industrial else 99999.9

    config = MeterConfigurationModel(
        connection_no=conn_key,
        serial_number=meta["meterSerial"],
        digit_count=digit_count,
        integral_digits=integral_digits,
        fractional_digits=fractional_digits,
        multiplier=1.0,
        allow_rollover=True,
        max_rollover_value=max_rollover,
        version=1,
        updated_by_id="SYSTEM",
        updated_by_name="System Seed",
    )
    db.add(config)
    db.flush()

    version_rec = MeterConfigurationVersionModel(
        connection_no=conn_key,
        version=1,
        serial_number=config.serial_number,
        digit_count=config.digit_count,
        integral_digits=config.integral_digits,
        fractional_digits=config.fractional_digits,
        multiplier=config.multiplier,
        allow_rollover=config.allow_rollover,
        max_rollover_value=config.max_rollover_value,
        reason="Initial UGVCL meter configuration baseline",
        changed_by_id="SYSTEM",
        changed_by_name="System Seed",
    )
    db.add(version_rec)
    db.flush()
    return config


def _get_current_thresholds(db: Session) -> MeterThresholdPolicyVersionRecord:
    latest = db.scalar(
        select(MeterThresholdPolicyVersionRecord).order_by(
            MeterThresholdPolicyVersionRecord.version.desc()
        )
    )
    if latest:
        return latest

    seed_policy = MeterThresholdPolicyVersionRecord(
        version=1,
        minimum_history=2,
        high_daily_ratio=2.5,
        low_daily_ratio=0.35,
        high_daily_units=80.0,
        reason="Initial GERC / UGVCL Phase 11 anomaly detection threshold baseline",
        changed_by_id="SYSTEM",
        changed_by_name="System Seed",
    )
    db.add(seed_policy)
    db.flush()
    return seed_policy


def _calculate_effective_consumption(
    *,
    previous_reading: float,
    submitted_reading: float,
    config: MeterConfigurationModel,
    event_type: str = "NONE",
    old_meter_final_reading: float | None = None,
    new_meter_start_reading: float | None = None,
    rollover_max_value: float | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    multiplier = config.multiplier if config.multiplier > 0 else 1.0

    if event_type == "METER_REPLACEMENT":
        if old_meter_final_reading is None or new_meter_start_reading is None:
            return {
                "valid": False,
                "error": "Meter replacement requires both oldMeterFinalReading and newMeterStartReading.",
                "rawDelta": 0.0,
                "effectiveConsumption": 0.0,
                "event": None,
            }
        if old_meter_final_reading < previous_reading:
            return {
                "valid": False,
                "error": f"Old meter final reading ({old_meter_final_reading}) cannot be less than previous billed reading ({previous_reading}).",
                "rawDelta": 0.0,
                "effectiveConsumption": 0.0,
                "event": None,
            }
        if submitted_reading < new_meter_start_reading:
            return {
                "valid": False,
                "error": f"Submitted reading ({submitted_reading}) cannot be less than new meter start reading ({new_meter_start_reading}).",
                "rawDelta": 0.0,
                "effectiveConsumption": 0.0,
                "event": None,
            }
        raw_delta = round(
            (old_meter_final_reading - previous_reading)
            + (submitted_reading - new_meter_start_reading),
            2,
        )
        effective = round(raw_delta * multiplier, 2)
        return {
            "valid": True,
            "rawDelta": raw_delta,
            "effectiveConsumption": effective,
            "event": {
                "type": "METER_REPLACEMENT",
                "oldMeterFinalReading": old_meter_final_reading,
                "newMeterStartReading": new_meter_start_reading,
                "effectiveConsumption": effective,
                "notes": notes,
            },
        }

    if event_type == "METER_ROLLOVER":
        if not config.allow_rollover:
            return {
                "valid": False,
                "error": "Meter rollover is not enabled for this meter configuration.",
                "rawDelta": 0.0,
                "effectiveConsumption": 0.0,
                "event": None,
            }
        max_val = rollover_max_value or config.max_rollover_value
        if previous_reading > max_val:
            return {
                "valid": False,
                "error": f"Previous reading ({previous_reading}) exceeds rollover maximum ({max_val}).",
                "rawDelta": 0.0,
                "effectiveConsumption": 0.0,
                "event": None,
            }
        step = 1 / (10 ** config.fractional_digits) if config.fractional_digits > 0 else 1.0
        raw_delta = round((max_val - previous_reading + step) + submitted_reading, 2)
        effective = round(raw_delta * multiplier, 2)
        return {
            "valid": True,
            "rawDelta": raw_delta,
            "effectiveConsumption": effective,
            "event": {
                "type": "METER_ROLLOVER",
                "rolloverMaxValue": max_val,
                "effectiveConsumption": effective,
                "notes": notes,
            },
        }

    raw_delta = round(submitted_reading - previous_reading, 2)
    effective = round(raw_delta * multiplier, 2)
    return {
        "valid": True,
        "rawDelta": raw_delta,
        "effectiveConsumption": effective,
        "event": None,
    }


def _evaluate_anomalies(
    *,
    previous_reading: float,
    submitted_reading: float,
    effective_consumption: float,
    cycle_days: int,
    ocr_confidence: float,
    manual_override: bool,
    override_reason: str | None,
    historical_cycle_units: list[float],
    historical_cycle_days: list[int],
    thresholds: MeterThresholdPolicyVersionRecord,
    meter_event_type: str = "NONE",
    ambiguous_digits: list[dict[str, Any]] | None = None,
    quality_passed: bool = True,
    quality_warnings: list[str] | None = None,
) -> list[dict[str, Any]]:
    anomalies: list[dict[str, Any]] = []
    min_history = max(2, thresholds.minimum_history)

    if meter_event_type == "NONE" and submitted_reading < previous_reading:
        anomalies.append(
            {
                "category": "NEGATIVE_DELTA",
                "severity": "HIGH",
                "reason": (
                    f"Submitted reading ({submitted_reading} kWh) is lower than previous "
                    f"billed reading ({previous_reading} kWh) by {round(previous_reading - submitted_reading, 2)} kWh."
                ),
            }
        )
        return anomalies

    if meter_event_type in ("METER_ROLLOVER", "METER_REPLACEMENT"):
        anomalies.append(
            {
                "category": "BACKWARD_OR_ROLLOVER_READING",
                "severity": "REVIEW",
                "reason": f"{meter_event_type.replace('_', ' ')} declared; effective consumption computed as {effective_consumption} kWh.",
            }
        )

    if not quality_passed and quality_warnings:
        anomalies.append(
            {
                "category": "OCR_LOW_CONFIDENCE",
                "severity": "REVIEW",
                "reason": f"Image quality warnings: {' '.join(quality_warnings)}",
            }
        )

    if ocr_confidence < 75.0:
        anomalies.append(
            {
                "category": "OCR_LOW_CONFIDENCE",
                "severity": "REVIEW",
                "reason": f"Local OCR confidence is {round(ocr_confidence, 1)}% (< 75% threshold); manual verification required.",
            }
        )

    if ambiguous_digits and len(ambiguous_digits) > 0:
        positions = ", ".join(f"#{d.get('position', 0) + 1}" for d in ambiguous_digits)
        anomalies.append(
            {
                "category": "OCR_AMBIGUOUS_DIGIT",
                "severity": "REVIEW",
                "reason": f"Ambiguous digit(s) detected at position(s) {positions}.",
            }
        )

    if manual_override:
        anomalies.append(
            {
                "category": "MANUAL_OVERRIDE_REQUIRED_REASON",
                "severity": "REVIEW",
                "reason": f"Reading manually overridden from OCR value. Reason: {override_reason or 'Provided by user'}",
            }
        )

    safe_days = max(1, cycle_days)
    current_daily = effective_consumption / safe_days

    positive_history = [u for u in historical_cycle_units if u > 0]
    if (
        effective_consumption == 0
        and len(historical_cycle_units) >= min_history
        and len(positive_history) >= min_history
    ):
        anomalies.append(
            {
                "category": "ZERO_CONSUMPTION_UNEXPECTED",
                "severity": "REVIEW",
                "reason": (
                    f"0 kWh consumption reported across {safe_days} days despite "
                    f"{len(positive_history)} prior active billing cycles (minimum {min_history} required)."
                ),
            }
        )

    if len(historical_cycle_units) >= min_history and effective_consumption > 0:
        total_hist_units = sum(historical_cycle_units)
        total_hist_days = sum(historical_cycle_days) or (len(historical_cycle_units) * 61)
        baseline_daily = total_hist_units / max(1, total_hist_days)
        if baseline_daily > 0:
            ratio = current_daily / baseline_daily
            if ratio >= thresholds.high_daily_ratio or current_daily >= thresholds.high_daily_units:
                anomalies.append(
                    {
                        "category": "ABNORMAL_HIGH_SPURT",
                        "severity": "HIGH" if ratio >= thresholds.high_daily_ratio * 1.4 else "REVIEW",
                        "reason": (
                            f"Daily consumption ({current_daily:.2f} kWh/day) is {ratio:.2f}x "
                            f"the historical baseline ({baseline_daily:.2f} kWh/day), exceeding "
                            f"{thresholds.high_daily_ratio}x threshold."
                        ),
                    }
                )
            elif ratio <= thresholds.low_daily_ratio:
                anomalies.append(
                    {
                        "category": "ABNORMAL_LOW_DROP",
                        "severity": "REVIEW",
                        "reason": (
                            f"Daily consumption ({current_daily:.2f} kWh/day) dropped to {ratio:.2f}x "
                            f"of historical baseline ({baseline_daily:.2f} kWh/day), below "
                            f"{thresholds.low_daily_ratio}x threshold."
                        ),
                    }
                )

    return anomalies


def _serialize_meter_config(
    db: Session, config: MeterConfigurationModel
) -> dict[str, Any]:
    versions = db.scalars(
        select(MeterConfigurationVersionModel)
        .where(MeterConfigurationVersionModel.connection_no == config.connection_no)
        .order_by(MeterConfigurationVersionModel.version.desc())
    ).all()
    return {
        "connectionNo": config.connection_no,
        "serialNumber": config.serial_number,
        "digitCount": config.digit_count,
        "integralDigits": config.integral_digits,
        "fractionalDigits": config.fractional_digits,
        "multiplier": config.multiplier,
        "allowRollover": config.allow_rollover,
        "maxRolloverValue": config.max_rollover_value,
        "version": config.version,
        "history": [
            {
                "version": v.version,
                "connectionNo": v.connection_no,
                "serialNumber": v.serial_number,
                "digitCount": v.digit_count,
                "integralDigits": v.integral_digits,
                "fractionalDigits": v.fractional_digits,
                "multiplier": v.multiplier,
                "allowRollover": v.allow_rollover,
                "maxRolloverValue": v.max_rollover_value,
                "reason": v.reason,
                "changedBy": v.changed_by_name,
                "createdAt": v.created_at.isoformat(),
            }
            for v in versions
        ],
    }


def _serialize_reading_record(
    db: Session, rec: MeterReadingSubmissionRecord
) -> dict[str, Any]:
    ocr_rec = db.scalar(
        select(MeterOcrExtractionRecord).where(
            MeterOcrExtractionRecord.reading_id == rec.id
        )
    )
    ambiguous_rows = db.scalars(
        select(MeterAmbiguousDigitRecord)
        .where(MeterAmbiguousDigitRecord.reading_id == rec.id)
        .order_by(MeterAmbiguousDigitRecord.position.asc())
    ).all()
    event_row = db.scalar(
        select(MeterEventRecord).where(MeterEventRecord.reading_id == rec.id)
    )
    review_rows = db.scalars(
        select(MeterReadingReviewHistoryRecord)
        .where(MeterReadingReviewHistoryRecord.reading_id == rec.id)
        .order_by(MeterReadingReviewHistoryRecord.created_at.asc())
    ).all()

    ambiguous_digits = [
        {
            "position": d.position,
            "char": d.char_value,
            "alternatives": json.loads(d.alternatives_json or "[]"),
            "confidence": d.confidence,
            "reason": d.reason,
        }
        for d in ambiguous_rows
    ]

    meter_event = None
    if event_row and event_row.event_type != "NONE":
        meter_event = {
            "type": event_row.event_type,
            "oldMeterFinalReading": event_row.old_meter_final_reading,
            "newMeterStartReading": event_row.new_meter_start_reading,
            "rolloverMaxValue": event_row.rollover_max_value,
            "effectiveConsumption": event_row.effective_consumption,
            "notes": event_row.notes,
        }

    return {
        "id": rec.id,
        "clientUuid": rec.client_uuid,
        "connectionNo": rec.connection_no,
        "consumerNo": rec.consumer_no,
        "consumerName": rec.consumer_name,
        "submittedBy": rec.submitted_by_name,
        "submittedByRole": rec.submitted_by_role,
        "submittedAt": rec.submitted_at.isoformat(),
        "captureMode": rec.capture_mode,
        "workOrderId": rec.work_order_id,
        "previousReading": rec.previous_reading,
        "previousReadingDate": rec.previous_reading_date,
        "submittedReading": rec.submitted_reading,
        "readingDate": rec.reading_date,
        "cycleDays": rec.cycle_days,
        "multiplier": rec.multiplier,
        "effectiveConsumption": rec.effective_consumption,
        "meterEvent": meter_event,
        "ocrRawText": rec.ocr_raw_text,
        "ocrNormalizedReading": rec.ocr_normalized_reading,
        "ocrConfidence": rec.ocr_confidence,
        "ocrEngineVersion": rec.ocr_engine_version,
        "ambiguousDigits": ambiguous_digits,
        "qualityPassed": rec.quality_passed,
        "qualityWarnings": json.loads(rec.quality_warnings_json or "[]"),
        "manualOverride": rec.manual_override,
        "overrideReason": rec.override_reason,
        "hasPhoto": bool(rec.photo_id),
        "photoId": rec.photo_id,
        "anomalies": json.loads(rec.anomalies_json or "[]"),
        "status": rec.status,
        "provisionalAmount": rec.provisional_amount,
        "provisionalBreakdown": json.loads(rec.provisional_breakdown_json or "{}"),
        "meterConfigVersion": rec.meter_config_version,
        "thresholdVersion": rec.threshold_version,
        "reviewedBy": rec.reviewed_by_name,
        "reviewedAt": rec.reviewed_at.isoformat() if rec.reviewed_at else None,
        "reviewNote": rec.review_note,
        "correctedReading": rec.corrected_reading,
        "ocrResult": {
            "meterId": ocr_rec.meter_id if ocr_rec else rec.connection_no,
            "rawText": rec.ocr_raw_text,
            "candidateReading": ocr_rec.candidate_reading if ocr_rec else rec.ocr_normalized_reading,
            "normalizedReading": rec.ocr_normalized_reading,
            "confidence": rec.ocr_confidence,
            "requiresReview": ocr_rec.requires_review if ocr_rec else (rec.status == "PENDING_REVIEW"),
            "engineVersion": rec.ocr_engine_version,
            "extractedAt": ocr_rec.extracted_at.isoformat() if ocr_rec else rec.submitted_at.isoformat(),
        },
        "reviewHistory": [
            {
                "id": h.id,
                "readingId": h.reading_id,
                "action": h.action,
                "previousStatus": h.previous_status,
                "newStatus": h.new_status,
                "actorName": h.actor_name,
                "actorRole": h.actor_role,
                "note": h.note,
                "correctedReading": h.corrected_reading,
                "createdAt": h.created_at.isoformat(),
            }
            for h in review_rows
        ],
        "demo": True,
    }


def _serialize_anomaly_case(
    db: Session, case_rec: MeterAnomalyCaseRecord
) -> dict[str, Any]:
    history_rows = db.scalars(
        select(MeterAnomalyStatusHistoryRecord)
        .where(MeterAnomalyStatusHistoryRecord.anomaly_id == case_rec.id)
        .order_by(MeterAnomalyStatusHistoryRecord.created_at.asc())
    ).all()
    reasons = json.loads(case_rec.reasons_json or "[]")
    evidence = json.loads(case_rec.evidence_json or "{}")
    return {
        "id": case_rec.id,
        "anomalyId": case_rec.id,
        "readingId": case_rec.reading_id,
        "relatedId": case_rec.reading_id,
        "connectionNo": case_rec.connection_no,
        "consumerNo": case_rec.consumer_no,
        "consumerName": case_rec.consumer_name,
        "category": case_rec.category,
        "severity": case_rec.severity,
        "status": case_rec.status,
        "summary": case_rec.summary,
        "reasons": reasons,
        "evidence": evidence if evidence else {"reasons": reasons, "thresholdVersion": case_rec.threshold_version},
        "expectedValue": case_rec.expected_value,
        "recordedValue": case_rec.recorded_value,
        "reviewAction": case_rec.review_action or case_rec.recommended_action,
        "thresholdVersion": case_rec.threshold_version,
        "recommendedAction": case_rec.recommended_action,
        "assignedRole": case_rec.assigned_role,
        "resolutionNote": case_rec.resolution_note,
        "adjustedUnits": case_rec.adjusted_units,
        "adjustedAmount": case_rec.adjusted_amount,
        "resolvedBy": case_rec.resolved_by_name,
        "createdAt": case_rec.created_at.isoformat(),
        "updatedAt": case_rec.updated_at.isoformat(),
        "history": [
            {
                "status": h.to_status,
                "changedBy": h.actor_name,
                "changedByRole": h.actor_role,
                "changedAt": h.created_at.isoformat(),
                "note": h.note,
            }
            for h in history_rows
        ],
        "demo": True,
    }


def _serialize_billing_review(
    db: Session, rev: ConsumerBillingReviewRecord
) -> dict[str, Any]:
    history_rows = db.scalars(
        select(ConsumerBillingReviewHistoryRecord)
        .where(ConsumerBillingReviewHistoryRecord.review_id == rev.id)
        .order_by(ConsumerBillingReviewHistoryRecord.created_at.asc())
    ).all()
    return {
        "id": rev.id,
        "clientUuid": rev.client_uuid,
        "billNo": rev.bill_no,
        "connectionNo": rev.connection_no,
        "consumerNo": rev.consumer_no,
        "consumerName": rev.consumer_name,
        "category": rev.category,
        "description": rev.description,
        "preferredReading": rev.preferred_reading,
        "hasEvidencePhoto": bool(rev.evidence_photo_id),
        "evidencePhotoId": rev.evidence_photo_id,
        "status": rev.status,
        "linkedReadingId": rev.linked_reading_id,
        "linkedAnomalyCaseId": rev.linked_anomaly_case_id,
        "validationSnapshot": json.loads(rev.validation_snapshot_json or "{}"),
        "resolutionNote": rev.resolution_note,
        "resolvedBy": rev.resolved_by_name,
        "createdAt": rev.created_at.isoformat(),
        "updatedAt": rev.updated_at.isoformat(),
        "history": [
            {
                "status": h.status,
                "changedBy": h.actor_name,
                "changedByRole": h.actor_role,
                "changedAt": h.created_at.isoformat(),
                "note": h.note,
            }
            for h in history_rows
        ],
        "demo": True,
    }


def _serialize_financial_adjustment(
    db: Session, adj: FinancialAdjustmentProposalRecord
) -> dict[str, Any]:
    history_rows = db.scalars(
        select(FinancialAdjustmentHistoryRecord)
        .where(FinancialAdjustmentHistoryRecord.adjustment_id == adj.id)
        .order_by(FinancialAdjustmentHistoryRecord.created_at.asc())
    ).all()
    return {
        "id": adj.id,
        "anomalyCaseId": adj.anomaly_case_id,
        "billingReviewId": adj.billing_review_id,
        "billNo": adj.bill_no,
        "connectionNo": adj.connection_no,
        "consumerNo": adj.consumer_no,
        "consumerName": adj.consumer_name,
        "originalUnits": adj.original_units,
        "originalBilledAmount": adj.original_billed_amount,
        "proposedAdjustedUnits": adj.proposed_adjusted_units,
        "proposedAdjustmentAmount": adj.proposed_adjustment_amount,
        "proposedRevisedAmount": adj.proposed_revised_amount,
        "adjustmentType": adj.adjustment_type,
        "reason": adj.reason,
        "calculationBasis": adj.calculation_basis,
        "status": adj.status,
        "ledgerApplicationStatus": adj.ledger_application_status,
        "ledgerReferenceId": adj.ledger_reference_id,
        "ledgerAppliedAt": adj.ledger_applied_at.isoformat() if adj.ledger_applied_at else None,
        "proposedBy": adj.proposed_by_name,
        "proposedByRole": adj.proposed_by_role,
        "proposedAt": adj.proposed_at.isoformat(),
        "approvedBy": adj.approved_by_name,
        "approvedByRole": adj.approved_by_role,
        "approvedAt": adj.approved_at.isoformat() if adj.approved_at else None,
        "approvalNote": adj.approval_note,
        "history": [
            {
                "fromStatus": h.from_status,
                "toStatus": h.to_status,
                "ledgerApplicationStatus": h.ledger_application_status,
                "actorName": h.actor_name,
                "actorRole": h.actor_role,
                "note": h.note,
                "createdAt": h.created_at.isoformat(),
            }
            for h in history_rows
        ],
        "demo": True,
    }


def _validate_bill_canonical(db: Session, bill_no: str) -> dict[str, Any]:
    bill_meta = CANONICAL_BILLS.get(bill_no)
    if not bill_meta:
        db_bill = db.scalar(select(UtilityBill).where(UtilityBill.bill_no == bill_no))
        if not db_bill:
            raise HTTPException(status_code=404, detail=f"Bill {bill_no} not found.")
        bill_meta = {
            "billNo": db_bill.bill_no,
            "connectionNo": db_bill.consumer_no,
            "consumerNo": db_bill.consumer_no,
            "consumerName": db_bill.consumer_name,
            "tariffCategory": db_bill.tariff_category,
            "sanctionedLoadKw": float(db_bill.sanctioned_load_kw),
            "billingPeriod": db_bill.billing_period,
            "previousReading": float(db_bill.previous_reading),
            "previousReadingDate": db_bill.previous_reading_date,
            "currentReading": float(db_bill.current_reading),
            "currentReadingDate": db_bill.current_reading_date,
            "cycleDays": int(db_bill.cycle_days or 61),
            "unitsBilled": float(db_bill.units_billed),
            "energyCharges": float(db_bill.energy_charges),
            "fixedCharges": float(db_bill.fixed_charges),
            "fpppaCharges": float(db_bill.fpppa_charges),
            "electricityDuty": float(db_bill.electricity_duty),
            "arrears": float(db_bill.arrears),
            "delayedPaymentSurcharge": float(db_bill.delayed_payment_surcharge),
            "totalAmount": float(db_bill.total_amount),
        }

    breakdown = calculate_configurable_cycle_tariff_breakdown(
        category_code=bill_meta["tariffCategory"],
        units_consumed=bill_meta["unitsBilled"],
        sanctioned_load_kw=bill_meta["sanctionedLoadKw"],
        cycle_days=bill_meta["cycleDays"],
        arrears=bill_meta["arrears"],
        delayed_payment_surcharge=bill_meta["delayedPaymentSurcharge"],
    )

    issues: list[dict[str, Any]] = []
    expected_units = round(bill_meta["currentReading"] - bill_meta["previousReading"], 2)
    if abs(expected_units - bill_meta["unitsBilled"]) > 0.01:
        issues.append(
            {
                "code": "READING_CONTINUITY_MISMATCH",
                "severity": "HIGH",
                "title": "Meter Reading Continuity Mismatch",
                "detail": f"Current ({bill_meta['currentReading']}) - Previous ({bill_meta['previousReading']}) = {expected_units} kWh, but billed {bill_meta['unitsBilled']} kWh.",
                "expectedValue": expected_units,
                "actualValue": bill_meta["unitsBilled"],
            }
        )

    expected_total = float(breakdown["totalBillAmount"])
    if abs(expected_total - bill_meta["totalAmount"]) > 2.0:
        issues.append(
            {
                "code": "TOTAL_AMOUNT_MISMATCH",
                "severity": "HIGH",
                "title": "Total Payable Amount Discrepancy",
                "detail": f"Canonical Phase 9 Tariff Engine computed ₹{expected_total}, whereas bill states ₹{bill_meta['totalAmount']}.",
                "expectedValue": expected_total,
                "actualValue": bill_meta["totalAmount"],
            }
        )

    return {
        "billNo": bill_meta["billNo"],
        "consumerNo": bill_meta["consumerNo"],
        "tariffCategory": bill_meta["tariffCategory"],
        "billingPeriod": bill_meta["billingPeriod"],
        "isValid": len(issues) == 0,
        "expectedBreakdown": breakdown,
        "actualTotal": bill_meta["totalAmount"],
        "expectedTotal": expected_total,
        "varianceAmount": round(bill_meta["totalAmount"] - expected_total, 2),
        "issues": issues,
        "checkedAt": datetime.now(timezone.utc).isoformat(),
    }


# ==============================================================================
# SEED SYNTHETIC PHASE 11 DEMO RECORDS IDEMPOTENTLY ON STARTUP
# ==============================================================================


def seed_phase11_demo_records(db: Session) -> None:
    """Seeds synthetic Phase 11 DEMO records without modifying existing historical bills or connections."""
    _get_current_thresholds(db)
    for conn_no in CANONICAL_CONNECTIONS:
        _get_or_create_meter_config(db, conn_no)

    if db.get(MeterReadingSubmissionRecord, "MR-20261028-99231") is not None:
        return

    system_actor = Phase11Actor(
        id="USR-CNS-001",
        email="ramesh.patel@consumer.ugvcl.com",
        name="Rameshbhai Karsanbhai Patel",
        role="CONSUMER",
    )
    field_actor = Phase11Actor(
        id="USR-FLD-001",
        email="vikram.solanki@ugvcl.com",
        name="Vikram Solanki",
        role="FIELD_ENGINEER",
    )

    photo_1 = _store_encrypted_private_photo(
        db,
        photo_data_url=SYNTHETIC_DEMO_PHOTO_DATA_URL,
        owner_type="METER_READING",
        owner_id="MR-20261028-99231",
        connection_no="31890244190",
        consumer_no="31890244190",
        actor=system_actor,
        photo_id_override="PHOTO-DEMO-99231",
    )
    photo_2 = _store_encrypted_private_photo(
        db,
        photo_data_url=SYNTHETIC_DEMO_PHOTO_DATA_URL,
        owner_type="METER_READING",
        owner_id="MR-20261101-77190",
        connection_no="31890255812",
        consumer_no="31890255812",
        actor=field_actor,
        photo_id_override="PHOTO-DEMO-77190",
    )
    db.flush()

    b1 = calculate_configurable_cycle_tariff_breakdown("RGP", 160.0, 4.0, 25)
    rec_1 = MeterReadingSubmissionRecord(
        id="MR-20261028-99231",
        client_uuid="seed-uuid-99231",
        connection_no="31890244190",
        consumer_no="31890244190",
        consumer_name="Rameshbhai Karsanbhai Patel",
        subdivision="Sabarmati Subdivision",
        submitted_by_id="USR-CNS-001",
        submitted_by_name="Rameshbhai Karsanbhai Patel",
        submitted_by_role="CONSUMER",
        submitted_at=datetime(2026, 10, 28, 9, 15, 0, tzinfo=timezone.utc),
        capture_mode="CONSUMER_PHOTO",
        previous_reading=14560.0,
        previous_reading_date="2026-10-03",
        submitted_reading=14720.0,
        reading_date="2026-10-28",
        cycle_days=25,
        multiplier=1.0,
        effective_consumption=160.0,
        ocr_raw_text="UGVCL KWH 014720.0",
        ocr_normalized_reading=14720.0,
        ocr_confidence=94.2,
        ocr_engine_version="tesseract.js-7.0.0-local-v1",
        manual_override=False,
        quality_passed=True,
        quality_warnings_json="[]",
        photo_id=photo_1.id,
        anomalies_json="[]",
        status="APPROVED",
        provisional_amount=float(b1["totalBillAmount"]),
        provisional_breakdown_json=json.dumps(b1),
        meter_config_version=1,
        threshold_version=1,
        reviewed_by_id="USR-EMP-001",
        reviewed_by_name="Anita Desai",
        reviewed_at=datetime(2026, 10, 28, 11, 40, 0, tzinfo=timezone.utc),
        review_note="Verified clear LCD reading against previous October bill.",
        demo=True,
    )
    db.add(rec_1)
    db.add(
        MeterOcrExtractionRecord(
            reading_id=rec_1.id,
            meter_id="UGV-SM-884120",
            engine_version="tesseract.js-7.0.0-local-v1",
            raw_text="UGVCL KWH 014720.0",
            candidate_reading=14720.0,
            normalized_reading=14720.0,
            confidence=94.2,
            requires_review=False,
            manual_override=False,
            quality_passed=True,
            quality_warnings_json="[]",
            extracted_at=datetime(2026, 10, 28, 9, 15, 0, tzinfo=timezone.utc),
        )
    )
    db.add(
        MeterReadingReviewHistoryRecord(
            reading_id=rec_1.id,
            action="APPROVE",
            previous_status="PENDING_REVIEW",
            new_status="APPROVED",
            actor_id="USR-EMP-001",
            actor_name="Anita Desai",
            actor_role="EMPLOYEE",
            note="Verified clear LCD reading against previous October bill.",
            created_at=datetime(2026, 10, 28, 11, 40, 0, tzinfo=timezone.utc),
        )
    )

    b2 = calculate_configurable_cycle_tariff_breakdown("NRGP", 3200.0, 15.0, 50)
    anomalies_2 = [
        {
            "category": "ABNORMAL_HIGH_SPURT",
            "severity": "HIGH",
            "reason": "Daily consumption (64.00 kWh/day) exceeds 2.5x historical baseline (20.49 kWh/day).",
        },
        {
            "category": "OCR_LOW_CONFIDENCE",
            "severity": "REVIEW",
            "reason": "Local OCR confidence is 68.5% (< 75% threshold); manual verification required.",
        },
        {
            "category": "OCR_AMBIGUOUS_DIGIT",
            "severity": "REVIEW",
            "reason": "Ambiguous digit at position 3 ('6' vs '8' due to LCD glare).",
        },
    ]
    rec_2 = MeterReadingSubmissionRecord(
        id="MR-20261101-77190",
        client_uuid="seed-uuid-77190",
        connection_no="31890255812",
        consumer_no="31890255812",
        consumer_name="31890255812 (Commercial)",
        subdivision="Palanpur East",
        submitted_by_id="USR-FLD-001",
        submitted_by_name="Vikram Solanki",
        submitted_by_role="FIELD_ENGINEER",
        submitted_at=datetime(2026, 11, 1, 14, 20, 0, tzinfo=timezone.utc),
        capture_mode="FIELD_OVERDUE_CAPTURE",
        work_order_id="WO-2026-8824",
        previous_reading=42800.0,
        previous_reading_date="2026-09-12",
        submitted_reading=46000.0,
        reading_date="2026-11-01",
        cycle_days=50,
        multiplier=1.0,
        effective_consumption=3200.0,
        ocr_raw_text="KWH 46000.0",
        ocr_normalized_reading=46000.0,
        ocr_confidence=68.5,
        ocr_engine_version="tesseract.js-7.0.0-local-v1",
        manual_override=False,
        quality_passed=True,
        quality_warnings_json="[]",
        photo_id=photo_2.id,
        anomalies_json=json.dumps(anomalies_2),
        status="PENDING_REVIEW",
        provisional_amount=float(b2["totalBillAmount"]),
        provisional_breakdown_json=json.dumps(b2),
        meter_config_version=1,
        threshold_version=1,
        demo=True,
    )
    db.add(rec_2)
    db.flush()

    ocr_2 = MeterOcrExtractionRecord(
        reading_id=rec_2.id,
        meter_id="UGV-CM-552108",
        engine_version="tesseract.js-7.0.0-local-v1",
        raw_text="KWH 46000.0",
        candidate_reading=46000.0,
        normalized_reading=46000.0,
        confidence=68.5,
        requires_review=True,
        manual_override=False,
        quality_passed=True,
        quality_warnings_json="[]",
        extracted_at=datetime(2026, 11, 1, 14, 20, 0, tzinfo=timezone.utc),
    )
    db.add(ocr_2)
    db.flush()

    db.add(
        MeterAmbiguousDigitRecord(
            ocr_result_id=ocr_2.id,
            reading_id=rec_2.id,
            position=2,
            char_value="6",
            alternatives_json=json.dumps(["8", "0"]),
            confidence=64.0,
            reason="Digit '6' at position 3 shows partial segment glare (possible 8 or 0).",
        )
    )

    case_1 = MeterAnomalyCaseRecord(
        id="ANO-20261101-77190",
        reading_id="MR-20261101-77190",
        connection_no="31890255812",
        consumer_no="31890255812",
        consumer_name="31890255812 (Commercial)",
        subdivision="Palanpur East",
        category="ABNORMAL_HIGH_SPURT",
        severity="HIGH",
        status="PENDING_REVIEW",
        summary="3.12x consumption spike with low OCR confidence (68.5%) on commercial feeder.",
        reasons_json=json.dumps([a["reason"] for a in anomalies_2]),
        evidence_json=json.dumps(
            {
                "reasons": [a["reason"] for a in anomalies_2],
                "thresholdVersion": 1,
                "dailyAverageCurrent": 64.0,
                "dailyAverageBaseline": 20.49,
                "cycleDays": 50,
            }
        ),
        expected_value=1025.0,
        recorded_value=3200.0,
        review_action="Inspect photo digit #3 and verify commercial load or request field re-read.",
        threshold_version=1,
        recommended_action="Inspect photo digit #3 and verify commercial load or request field re-read.",
        assigned_role="EMPLOYEE",
        created_at=datetime(2026, 11, 1, 14, 20, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 11, 1, 14, 20, 0, tzinfo=timezone.utc),
        demo=True,
    )
    db.add(case_1)
    db.add(
        MeterAnomalyStatusHistoryRecord(
            anomaly_id=case_1.id,
            from_status="DETECTED",
            to_status="PENDING_REVIEW",
            actor_id="USR-FLD-001",
            actor_name="Vikram Solanki",
            actor_role="FIELD_ENGINEER",
            note="Automatically opened anomaly case from field overdue capture.",
            created_at=datetime(2026, 11, 1, 14, 20, 0, tzinfo=timezone.utc),
        )
    )

    val_snap = _validate_bill_canonical(db, "UGV-2026-10-88412")
    cbr_1 = ConsumerBillingReviewRecord(
        id="CBR-20261102-8821",
        client_uuid="seed-cbr-uuid-8821",
        bill_no="UGV-2026-10-88412",
        connection_no="31890244190",
        consumer_no="31890244190",
        consumer_name="Rameshbhai Karsanbhai Patel",
        subdivision="Sabarmati Subdivision",
        category="CONSUMPTION_DISPUTE",
        description="Requesting check of Aug-Sep bi-monthly slab allocation against October self-reading.",
        preferred_reading=14550.0,
        status="UNDER_INVESTIGATION",
        linked_reading_id="MR-20261028-99231",
        validation_snapshot_json=json.dumps(val_snap),
        created_at=datetime(2026, 11, 2, 10, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 11, 2, 15, 30, 0, tzinfo=timezone.utc),
        demo=True,
    )
    db.add(cbr_1)
    db.add(
        ConsumerBillingReviewHistoryRecord(
            review_id=cbr_1.id,
            status="PENDING_REVIEW",
            actor_id="USR-CNS-001",
            actor_name="Rameshbhai Karsanbhai Patel",
            actor_role="CONSUMER",
            note="Consumer submitted billing review request.",
            created_at=datetime(2026, 11, 2, 10, 0, 0, tzinfo=timezone.utc),
        )
    )
    db.add(
        ConsumerBillingReviewHistoryRecord(
            review_id=cbr_1.id,
            status="UNDER_INVESTIGATION",
            actor_id="USR-EMP-001",
            actor_name="Anita Desai",
            actor_role="EMPLOYEE",
            note="Assigned to Sabarmati Subdivision billing desk for ledger verification.",
            created_at=datetime(2026, 11, 2, 15, 30, 0, tzinfo=timezone.utc),
        )
    )

    revised_breakdown = calculate_configurable_cycle_tariff_breakdown("RGP", 300.0, 4.0, 61)
    revised_amt = float(revised_breakdown["totalBillAmount"])
    adj_1 = FinancialAdjustmentProposalRecord(
        id="ADJ-20261102-001",
        billing_review_id="CBR-20261102-8821",
        bill_no="UGV-2026-10-88412",
        connection_no="31890244190",
        consumer_no="31890244190",
        consumer_name="Rameshbhai Karsanbhai Patel",
        subdivision="Sabarmati Subdivision",
        original_units=320.0,
        original_billed_amount=2765.0,
        proposed_adjusted_units=300.0,
        proposed_adjustment_amount=round(abs(2765.0 - revised_amt), 2),
        proposed_revised_amount=revised_amt,
        adjustment_type="CREDIT_MEMO",
        reason="Provisional credit memo evaluation for 20 kWh slab variance pending Admin review.",
        calculation_basis="Phase 9 UGVCL RGP Tariff Engine: 300 kWh over 61 days (Energy + Fixed + FPPPA + 15% Duty)",
        status="PENDING_APPROVAL",
        ledger_application_status="PENDING_AUTHORIZATION",
        proposed_by_id="USR-EMP-001",
        proposed_by_name="Anita Desai",
        proposed_by_role="EMPLOYEE",
        proposed_at=datetime(2026, 11, 2, 16, 10, 0, tzinfo=timezone.utc),
        demo=True,
    )
    db.add(adj_1)
    db.add(
        FinancialAdjustmentHistoryRecord(
            adjustment_id=adj_1.id,
            from_status="DRAFT",
            to_status="PENDING_APPROVAL",
            ledger_application_status="PENDING_AUTHORIZATION",
            actor_id="USR-EMP-001",
            actor_name="Anita Desai",
            actor_role="EMPLOYEE",
            note="Proposed credit memo via Phase 9 tariff engine without mutating original bill UGV-2026-10-88412.",
            created_at=datetime(2026, 11, 2, 16, 10, 0, tzinfo=timezone.utc),
        )
    )
    db.commit()


# ==============================================================================
# PYDANTIC REQUEST SCHEMAS
# ==============================================================================


class UploadPhotoRequest(BaseModel):
    connectionNo: str
    photoDataUrl: str
    metadataStripped: bool = True


class SubmitMeterReadingPayload(BaseModel):
    clientUuid: str = Field(..., min_length=1)
    connectionNo: str = Field(..., min_length=1)
    submittedReading: float
    readingDate: str
    captureMode: str = "CONSUMER_PHOTO"
    workOrderId: str | None = None
    ocrRawText: str = ""
    ocrNormalizedReading: float | None = None
    ocrConfidence: float = 0.0
    ocrEngineVersion: str = "tesseract.js-7.0.0-local-v1"
    ambiguousDigits: list[dict[str, Any]] = Field(default_factory=list)
    qualityPassed: bool = True
    qualityWarnings: list[str] = Field(default_factory=list)
    manualOverride: bool = False
    overrideReason: str | None = None
    photoDataUrl: str | None = None
    meterEventType: str = "NONE"
    oldMeterFinalReading: float | None = None
    newMeterStartReading: float | None = None
    rolloverMaxValue: float | None = None
    meterEventNotes: str | None = None


class ReviewMeterReadingPayload(BaseModel):
    action: str  # APPROVE | REJECT | REQUEST_REREAD
    note: str
    correctedReading: float | None = None
    clientUuid: str | None = None


class TransitionAnomalyStatusPayload(BaseModel):
    status: str
    note: str
    adjustedUnits: float | None = None
    adjustedAmount: float | None = None
    clientUuid: str | None = None


class CreateBillingReviewPayload(BaseModel):
    billNo: str
    category: str
    description: str
    preferredReading: float | None = None
    evidencePhotoDataUrl: str | None = None
    clientUuid: str


class TransitionBillingReviewPayload(BaseModel):
    status: str
    note: str
    clientUuid: str | None = None


class ProposeFinancialAdjustmentPayload(BaseModel):
    anomalyCaseId: str | None = None
    billingReviewId: str | None = None
    billNo: str
    proposedAdjustedUnits: float
    adjustmentType: str  # CREDIT_MEMO | DEBIT_MEMO | REBILL_PROPOSAL
    reason: str
    clientUuid: str | None = None


class ReviewFinancialAdjustmentPayload(BaseModel):
    action: str  # APPROVE | REJECT
    note: str
    clientUuid: str | None = None


class UpdateThresholdPolicyPayload(BaseModel):
    minimumHistory: int | None = None
    highDailyRatio: float | None = None
    lowDailyRatio: float | None = None
    highDailyUnits: float | None = None
    reason: str


class UpdateMeterConfigPayload(BaseModel):
    serialNumber: str | None = None
    digitCount: int | None = None
    integralDigits: int | None = None
    fractionalDigits: int | None = None
    multiplier: float | None = None
    allowRollover: bool | None = None
    maxRolloverValue: float | None = None
    reason: str | None = None


# ==============================================================================
# FASTAPI ENDPOINTS
# ==============================================================================


@router.get("/metrics")
def get_meter_integrity_metrics(
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    """Returns aggregate-only KPIs (strictly zero consumer PII, zero photos, zero staff notes)."""
    if actor.role not in ("MANAGEMENT", "ADMIN", "EMPLOYEE"):
        raise HTTPException(
            status_code=403,
            detail="Only Management, Employee, or Admin roles can view aggregate meter integrity metrics.",
        )

    seed_phase11_demo_records(db)
    readings = db.scalars(select(MeterReadingSubmissionRecord)).all()
    cases = db.scalars(select(MeterAnomalyCaseRecord)).all()
    reviews = db.scalars(select(ConsumerBillingReviewRecord)).all()
    adjustments = db.scalars(select(FinancialAdjustmentProposalRecord)).all()
    thresholds = _get_current_thresholds(db)

    by_category: dict[str, int] = {}
    for r in readings:
        for flag in json.loads(r.anomalies_json or "[]"):
            cat = flag.get("category", "UNKNOWN")
            by_category[cat] = by_category.get(cat, 0) + 1

    cases_by_category: dict[str, int] = {}
    cases_by_severity = {"HIGH": 0, "REVIEW": 0, "INFO": 0}
    for c in cases:
        cases_by_category[c.category] = cases_by_category.get(c.category, 0) + 1
        if c.severity in cases_by_severity:
            cases_by_severity[c.severity] += 1

    reviews_by_category: dict[str, int] = {}
    for rev in reviews:
        reviews_by_category[rev.category] = reviews_by_category.get(rev.category, 0) + 1

    approved_adjustments = [a for a in adjustments if a.status == "APPROVED"]
    total_adjusted_amount = round(
        sum(a.proposed_adjustment_amount for a in approved_adjustments), 2
    )

    return {
        "demo": True,
        "totalReadings": len(readings),
        "pendingReview": sum(1 for r in readings if r.status == "PENDING_REVIEW"),
        "approved": sum(1 for r in readings if r.status == "APPROVED"),
        "rejected": sum(1 for r in readings if r.status == "REJECTED"),
        "rereadRequested": sum(1 for r in readings if r.status == "REREAD_REQUESTED"),
        "openAnomalies": sum(
            1
            for r in readings
            if r.status == "PENDING_REVIEW" and len(json.loads(r.anomalies_json or "[]")) > 0
        ),
        "byCategory": by_category,
        "thresholdVersion": thresholds.version,
        "cases": {
            "total": len(cases),
            "pendingReview": sum(
                1 for c in cases if c.status in ("DETECTED", "PENDING_REVIEW")
            ),
            "underInvestigation": sum(
                1 for c in cases if c.status == "UNDER_INVESTIGATION"
            ),
            "approved": sum(1 for c in cases if c.status == "APPROVED"),
            "rejected": sum(1 for c in cases if c.status == "REJECTED"),
            "adjusted": sum(1 for c in cases if c.status == "ADJUSTED"),
            "closed": sum(1 for c in cases if c.status == "CLOSED"),
            "byCategory": cases_by_category,
            "bySeverity": cases_by_severity,
        },
        "billingReviews": {
            "total": len(reviews),
            "pending": sum(1 for r in reviews if r.status == "PENDING_REVIEW"),
            "underInvestigation": sum(
                1 for r in reviews if r.status == "UNDER_INVESTIGATION"
            ),
            "approved": sum(1 for r in reviews if r.status == "APPROVED"),
            "rejected": sum(1 for r in reviews if r.status == "REJECTED"),
            "adjusted": sum(1 for r in reviews if r.status == "ADJUSTED"),
            "closed": sum(1 for r in reviews if r.status == "CLOSED"),
            "byCategory": reviews_by_category,
        },
        "financialAdjustments": {
            "total": len(adjustments),
            "pendingApproval": sum(
                1 for a in adjustments if a.status == "PENDING_APPROVAL"
            ),
            "approved": len(approved_adjustments),
            "rejected": sum(1 for a in adjustments if a.status == "REJECTED"),
            "totalAdjustedAmount": total_adjusted_amount,
        },
        "averageTurnaroundHours": 1.8,
    }


@router.get("/thresholds")
def get_thresholds(
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    seed_phase11_demo_records(db)
    current = _get_current_thresholds(db)
    history_rows = db.scalars(
        select(MeterThresholdPolicyVersionRecord).order_by(
            MeterThresholdPolicyVersionRecord.version.desc()
        )
    ).all()
    return {
        "thresholds": {
            "version": current.version,
            "minimumHistory": current.minimum_history,
            "highDailyRatio": current.high_daily_ratio,
            "lowDailyRatio": current.low_daily_ratio,
            "highDailyUnits": current.high_daily_units,
            "updatedAt": current.created_at.isoformat(),
            "updatedBy": current.changed_by_name,
            "history": [
                {
                    "version": h.version,
                    "changedAt": h.created_at.isoformat(),
                    "changedBy": h.changed_by_name,
                    "reason": h.reason,
                    "thresholds": {
                        "version": h.version,
                        "minimumHistory": h.minimum_history,
                        "highDailyRatio": h.high_daily_ratio,
                        "lowDailyRatio": h.low_daily_ratio,
                        "highDailyUnits": h.high_daily_units,
                        "updatedAt": h.created_at.isoformat(),
                        "updatedBy": h.changed_by_name,
                    },
                }
                for h in history_rows
            ],
        }
    }


@router.patch("/thresholds")
def update_thresholds(
    payload: UpdateThresholdPolicyPayload,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    if actor.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Only Admin can update anomaly detection thresholds.",
        )
    if not payload.reason or not payload.reason.strip():
        raise HTTPException(
            status_code=400,
            detail="Audit reason is required when updating anomaly detection thresholds.",
        )

    seed_phase11_demo_records(db)
    current = _get_current_thresholds(db)
    next_version = current.version + 1
    min_hist = max(
        2,
        int(
            payload.minimumHistory
            if payload.minimumHistory is not None
            else current.minimum_history
        ),
    )
    high_ratio = (
        float(payload.highDailyRatio)
        if payload.highDailyRatio is not None and payload.highDailyRatio > 1.0
        else current.high_daily_ratio
    )
    low_ratio = (
        float(payload.lowDailyRatio)
        if payload.lowDailyRatio is not None and 0.0 < payload.lowDailyRatio < 1.0
        else current.low_daily_ratio
    )
    high_units = (
        float(payload.highDailyUnits)
        if payload.highDailyUnits is not None and payload.highDailyUnits >= 10.0
        else current.high_daily_units
    )

    new_policy = MeterThresholdPolicyVersionRecord(
        version=next_version,
        minimum_history=min_hist,
        high_daily_ratio=high_ratio,
        low_daily_ratio=low_ratio,
        high_daily_units=high_units,
        reason=payload.reason.strip(),
        changed_by_id=actor.id,
        changed_by_name=actor.name,
    )
    db.add(new_policy)
    log_event(
        db,
        actor_user_id=actor.id,
        action="PHASE11_THRESHOLD_POLICY_UPDATED",
        entity_type="meter_threshold_policy_versions",
        entity_id=f"v{next_version}",
        metadata={
            "version": next_version,
            "minimumHistory": min_hist,
            "highDailyRatio": high_ratio,
            "lowDailyRatio": low_ratio,
            "highDailyUnits": high_units,
            "reason": payload.reason.strip(),
        },
    )
    db.commit()
    return get_thresholds(actor=actor, db=db)


@router.get("/config/{connection_no}")
def get_meter_configuration(
    connection_no: str,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    _ensure_not_management(actor, "meter configurations")
    seed_phase11_demo_records(db)
    if actor.role == "CONSUMER" and not _consumer_owns_connection(
        db, actor, connection_no
    ):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You do not own this connection.",
        )
    if actor.role == "FIELD_ENGINEER":
        assigned, _ = _field_engineer_assigned_to_connection(db, actor, connection_no)
        if not assigned:
            raise HTTPException(
                status_code=403,
                detail="Access denied: Connection is not assigned to your field work orders.",
            )

    config = _get_or_create_meter_config(db, connection_no)
    db.commit()
    return {"configuration": _serialize_meter_config(db, config)}


@router.patch("/config/{connection_no}")
def update_meter_configuration(
    connection_no: str,
    payload: UpdateMeterConfigPayload,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    if actor.role not in ("EMPLOYEE", "ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Only Employee or Admin can update meter configuration.",
        )

    seed_phase11_demo_records(db)
    config = _get_or_create_meter_config(db, connection_no)

    if payload.serialNumber and payload.serialNumber.strip():
        config.serial_number = payload.serialNumber.strip()
    if payload.digitCount is not None and 4 <= payload.digitCount <= 10:
        config.digit_count = int(payload.digitCount)
    if payload.integralDigits is not None and 3 <= payload.integralDigits <= 9:
        config.integral_digits = int(payload.integralDigits)
    if payload.fractionalDigits is not None and 0 <= payload.fractionalDigits <= 3:
        config.fractional_digits = int(payload.fractionalDigits)
    if payload.multiplier is not None and payload.multiplier > 0:
        config.multiplier = float(payload.multiplier)
    if payload.allowRollover is not None:
        config.allow_rollover = bool(payload.allowRollover)
    if payload.maxRolloverValue is not None and payload.maxRolloverValue > 0:
        config.max_rollover_value = float(payload.maxRolloverValue)

    config.version += 1
    config.updated_by_id = actor.id
    config.updated_by_name = actor.name

    version_rec = MeterConfigurationVersionModel(
        connection_no=config.connection_no,
        version=config.version,
        serial_number=config.serial_number,
        digit_count=config.digit_count,
        integral_digits=config.integral_digits,
        fractional_digits=config.fractional_digits,
        multiplier=config.multiplier,
        allow_rollover=config.allow_rollover,
        max_rollover_value=config.max_rollover_value,
        reason=(payload.reason or "Updated meter configuration parameters").strip(),
        changed_by_id=actor.id,
        changed_by_name=actor.name,
    )
    db.add(version_rec)
    log_event(
        db,
        actor_user_id=actor.id,
        action="PHASE11_METER_CONFIG_UPDATED",
        entity_type="meter_configurations",
        entity_id=config.connection_no,
        metadata={"version": config.version, "multiplier": config.multiplier},
    )
    db.commit()
    return {"configuration": _serialize_meter_config(db, config)}


@router.get("/validate-bill/{bill_no}")
def validate_bill_endpoint(
    bill_no: str,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    _ensure_not_management(actor, "individual bill validation")
    seed_phase11_demo_records(db)
    bill_meta = CANONICAL_BILLS.get(bill_no)
    conn_no = bill_meta["connectionNo"] if bill_meta else None
    if not conn_no:
        db_bill = db.scalar(select(UtilityBill).where(UtilityBill.bill_no == bill_no))
        if not db_bill:
            raise HTTPException(status_code=404, detail=f"Bill {bill_no} not found.")
        conn_no = db_bill.consumer_no

    if actor.role == "CONSUMER" and not _consumer_owns_connection(db, actor, conn_no):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You do not own this bill.",
        )

    validation = _validate_bill_canonical(db, bill_no)
    return {"validation": validation}


@router.post("/photos", status_code=201)
def upload_private_photo(
    payload: UploadPhotoRequest,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    _ensure_not_management(actor, "meter photographs")
    seed_phase11_demo_records(db)
    meta = _resolve_connection_meta(db, payload.connectionNo)
    if actor.role == "CONSUMER" and not _consumer_owns_connection(
        db, actor, payload.connectionNo
    ):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You do not own this connection.",
        )
    if actor.role == "FIELD_ENGINEER":
        assigned, _ = _field_engineer_assigned_to_connection(
            db, actor, payload.connectionNo
        )
        if not assigned:
            raise HTTPException(
                status_code=403,
                detail="Access denied: Connection is not assigned to your field work orders.",
            )

    photo_rec = _store_encrypted_private_photo(
        db,
        photo_data_url=payload.photoDataUrl,
        owner_type="METER_READING",
        owner_id=None,
        connection_no=meta["connectionNo"],
        consumer_no=meta["consumerNo"],
        actor=actor,
    )
    db.commit()
    return {
        "photoId": photo_rec.id,
        "connectionNo": photo_rec.connection_no,
        "mimeType": photo_rec.mime_type,
        "byteLength": photo_rec.byte_length,
        "sha256": photo_rec.sha256,
        "encryptedAtRest": True,
        "metadataStripped": photo_rec.metadata_stripped,
        "createdAt": photo_rec.created_at.isoformat(),
    }


@router.get("")
def list_meter_readings(
    connectionNo: str | None = Query(default=None),
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    _ensure_not_management(actor, "meter readings")
    seed_phase11_demo_records(db)

    stmt = select(MeterReadingSubmissionRecord).order_by(
        MeterReadingSubmissionRecord.submitted_at.desc()
    )
    if connectionNo:
        stmt = stmt.where(
            MeterReadingSubmissionRecord.connection_no == connectionNo.strip()
        )
    rows = db.scalars(stmt).all()

    if actor.role == "CONSUMER":
        if connectionNo and not _consumer_owns_connection(db, actor, connectionNo):
            raise HTTPException(
                status_code=403,
                detail="Access denied: You do not own this connection.",
            )
        rows = [
            r for r in rows if _consumer_owns_connection(db, actor, r.connection_no)
        ]
    elif actor.role == "FIELD_ENGINEER":
        rows = [
            r
            for r in rows
            if _field_engineer_assigned_to_connection(db, actor, r.connection_no)[0]
            or r.submitted_by_id == actor.id
            or r.submitted_by_name == actor.name
        ]

    return {"readings": [_serialize_reading_record(db, r) for r in rows]}


@router.post("", status_code=201)
def submit_meter_reading_endpoint(
    payload: SubmitMeterReadingPayload,
    response: Response,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    _ensure_not_management(actor, "meter reading submissions")
    seed_phase11_demo_records(db)

    conn_no = payload.connectionNo.strip()
    idempotency_payload = {
        "connectionNo": conn_no,
        "submittedReading": round(float(payload.submittedReading), 2),
        "readingDate": payload.readingDate.strip(),
        "captureMode": payload.captureMode,
        "meterEventType": payload.meterEventType,
        "oldMeterFinalReading": payload.oldMeterFinalReading,
        "newMeterStartReading": payload.newMeterStartReading,
        "rolloverMaxValue": payload.rolloverMaxValue,
    }
    replay = _check_actor_idempotency(
        db,
        client_uuid=payload.clientUuid,
        endpoint="POST:/meter-readings",
        actor_id=actor.id,
        payload_for_hash=idempotency_payload,
    )
    if replay is not None:
        return replay

    existing_by_uuid = db.scalar(
        select(MeterReadingSubmissionRecord).where(
            MeterReadingSubmissionRecord.client_uuid == payload.clientUuid.strip()
        )
    )
    if existing_by_uuid:
        if (
            existing_by_uuid.submitted_by_id != actor.id
            and existing_by_uuid.submitted_by_name.lower() != actor.name.lower()
        ) or (
            existing_by_uuid.connection_no != conn_no
            or round(existing_by_uuid.submitted_reading, 2)
            != round(float(payload.submittedReading), 2)
        ):
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "Idempotency conflict: clientUuid already used by a different actor or with a different payload.",
                    "code": "IDEMPOTENCY_CONFLICT",
                },
            )
        return {"reading": _serialize_reading_record(db, existing_by_uuid)}

    meta = _resolve_connection_meta(db, conn_no)

    if actor.role == "CONSUMER":
        if not _consumer_owns_connection(db, actor, conn_no):
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only submit meter readings for your own connections.",
            )
    elif actor.role == "FIELD_ENGINEER":
        assigned, assigned_wo = _field_engineer_assigned_to_connection(
            db, actor, conn_no, payload.workOrderId
        )
        if not assigned:
            raise HTTPException(
                status_code=403,
                detail="Field Engineers may only submit readings for assigned overdue work orders.",
            )
        if not payload.workOrderId:
            payload.workOrderId = assigned_wo

    if not math.isfinite(payload.submittedReading) or payload.submittedReading < 0:
        raise HTTPException(
            status_code=400,
            detail="Submitted meter reading must be a non-negative finite number.",
        )

    if payload.manualOverride and (
        not payload.overrideReason or len(payload.overrideReason.strip()) < 5
    ):
        raise HTTPException(
            status_code=400,
            detail="A clear override reason (at least 5 characters) is required when manually editing the OCR reading.",
        )

    config = _get_or_create_meter_config(db, conn_no)
    thresholds = _get_current_thresholds(db)

    latest_approved = db.scalar(
        select(MeterReadingSubmissionRecord)
        .where(
            MeterReadingSubmissionRecord.connection_no == conn_no,
            MeterReadingSubmissionRecord.status == "APPROVED",
        )
        .order_by(MeterReadingSubmissionRecord.submitted_at.desc())
    )
    prev_reading = (
        float(latest_approved.submitted_reading)
        if latest_approved
        else float(meta["previousReading"])
    )
    prev_date = (
        latest_approved.reading_date
        if latest_approved
        else str(meta["previousReadingDate"])
    )

    try:
        d_prev = datetime.fromisoformat(prev_date[:10])
        d_curr = datetime.fromisoformat(payload.readingDate[:10])
        cycle_days = max(1, (d_curr - d_prev).days)
    except Exception:
        cycle_days = 30

    event_type = payload.meterEventType or "NONE"
    eff_calc = _calculate_effective_consumption(
        previous_reading=prev_reading,
        submitted_reading=float(payload.submittedReading),
        config=config,
        event_type=event_type,
        old_meter_final_reading=payload.oldMeterFinalReading,
        new_meter_start_reading=payload.newMeterStartReading,
        rollover_max_value=payload.rolloverMaxValue,
        notes=payload.meterEventNotes,
    )
    if not eff_calc["valid"]:
        raise HTTPException(status_code=400, detail=eff_calc["error"])

    effective_consumption = float(eff_calc["effectiveConsumption"])
    ocr_confidence = float(
        payload.ocrConfidence if payload.ocrConfidence is not None else 92.0
    )

    anomalies = _evaluate_anomalies(
        previous_reading=prev_reading,
        submitted_reading=float(payload.submittedReading),
        effective_consumption=effective_consumption,
        cycle_days=cycle_days,
        ocr_confidence=ocr_confidence,
        manual_override=bool(payload.manualOverride),
        override_reason=payload.overrideReason,
        historical_cycle_units=list(meta["historicalCycleUnits"]),
        historical_cycle_days=list(meta["historicalCycleDays"]),
        thresholds=thresholds,
        meter_event_type=event_type,
        ambiguous_digits=payload.ambiguousDigits,
        quality_passed=payload.qualityPassed,
        quality_warnings=payload.qualityWarnings,
    )

    reading_status = "PENDING_REVIEW" if len(anomalies) > 0 else "APPROVED"
    provisional_units = max(0.0, effective_consumption)
    provisional_breakdown = calculate_configurable_cycle_tariff_breakdown(
        category_code=meta["tariffCategory"],
        units_consumed=provisional_units,
        sanctioned_load_kw=meta["sanctionedLoadKw"],
        cycle_days=cycle_days,
    )

    reading_id = f"MR-{payload.readingDate[:10].replace('-', '')}-{uuid.uuid4().hex[:5].upper()}"
    photo_id = None
    if payload.photoDataUrl and payload.photoDataUrl.strip().startswith("data:image/"):
        photo_rec = _store_encrypted_private_photo(
            db,
            photo_data_url=payload.photoDataUrl,
            owner_type="METER_READING",
            owner_id=reading_id,
            connection_no=conn_no,
            consumer_no=meta["consumerNo"],
            actor=actor,
        )
        photo_id = photo_rec.id

    rec = MeterReadingSubmissionRecord(
        id=reading_id,
        client_uuid=payload.clientUuid.strip(),
        connection_no=conn_no,
        consumer_no=meta["consumerNo"],
        consumer_name=meta["consumerName"],
        subdivision=meta["subdivision"],
        submitted_by_id=actor.id,
        submitted_by_name=actor.name,
        submitted_by_role=actor.role,
        capture_mode=payload.captureMode or "CONSUMER_PHOTO",
        work_order_id=payload.workOrderId,
        previous_reading=prev_reading,
        previous_reading_date=prev_date,
        submitted_reading=float(payload.submittedReading),
        reading_date=payload.readingDate[:10],
        cycle_days=cycle_days,
        multiplier=config.multiplier,
        effective_consumption=effective_consumption,
        ocr_raw_text=payload.ocrRawText or f"KWH {payload.submittedReading}",
        ocr_normalized_reading=(
            float(payload.ocrNormalizedReading)
            if payload.ocrNormalizedReading is not None
            else float(payload.submittedReading)
        ),
        ocr_confidence=ocr_confidence,
        ocr_engine_version=payload.ocrEngineVersion or "tesseract.js-7.0.0-local-v1",
        manual_override=bool(payload.manualOverride),
        override_reason=payload.overrideReason,
        quality_passed=bool(payload.qualityPassed),
        quality_warnings_json=json.dumps(payload.qualityWarnings or []),
        photo_id=photo_id,
        anomalies_json=json.dumps(anomalies),
        status=reading_status,
        provisional_amount=float(provisional_breakdown["totalBillAmount"]),
        provisional_breakdown_json=json.dumps(provisional_breakdown),
        meter_config_version=config.version,
        threshold_version=thresholds.version,
        demo=True,
    )
    db.add(rec)
    db.flush()

    ocr_rec = MeterOcrExtractionRecord(
        reading_id=rec.id,
        meter_id=config.serial_number,
        engine_version=rec.ocr_engine_version,
        raw_text=rec.ocr_raw_text,
        candidate_reading=rec.ocr_normalized_reading,
        normalized_reading=rec.ocr_normalized_reading,
        confidence=rec.ocr_confidence,
        requires_review=(reading_status == "PENDING_REVIEW"),
        manual_override=rec.manual_override,
        override_reason=rec.override_reason,
        quality_passed=rec.quality_passed,
        quality_warnings_json=rec.quality_warnings_json,
    )
    db.add(ocr_rec)
    db.flush()

    for amb in payload.ambiguousDigits or []:
        db.add(
            MeterAmbiguousDigitRecord(
                ocr_result_id=ocr_rec.id,
                reading_id=rec.id,
                position=int(amb.get("position", 0)),
                char_value=str(amb.get("char", "?"))[:8],
                alternatives_json=json.dumps(amb.get("alternatives", [])),
                confidence=float(amb.get("confidence", 0.0)),
                reason=str(amb.get("reason", "Ambiguous digit detected")),
            )
        )

    db.add(
        MeterEventRecord(
            reading_id=rec.id,
            connection_no=conn_no,
            event_type=event_type,
            old_meter_final_reading=payload.oldMeterFinalReading,
            new_meter_start_reading=payload.newMeterStartReading,
            rollover_max_value=payload.rolloverMaxValue,
            effective_consumption=effective_consumption,
            notes=payload.meterEventNotes,
            recorded_by_id=actor.id,
            recorded_by_name=actor.name,
        )
    )

    db.add(
        MeterReadingReviewHistoryRecord(
            reading_id=rec.id,
            action="SUBMITTED",
            previous_status="NONE",
            new_status=reading_status,
            actor_id=actor.id,
            actor_name=actor.name,
            actor_role=actor.role,
            note=f"Submitted via {rec.capture_mode} ({len(anomalies)} anomaly flags).",
        )
    )

    if len(anomalies) > 0:
        primary = next(
            (a for a in anomalies if a["severity"] == "HIGH"), anomalies[0]
        )
        case_id = f"ANO-{rec.id.replace('MR-', '')}"
        expected_units = (
            round(
                (sum(meta["historicalCycleUnits"]) / max(1, sum(meta["historicalCycleDays"])))
                * cycle_days,
                2,
            )
            if meta["historicalCycleUnits"]
            else 0.0
        )
        case_rec = MeterAnomalyCaseRecord(
            id=case_id,
            reading_id=rec.id,
            connection_no=conn_no,
            consumer_no=meta["consumerNo"],
            consumer_name=meta["consumerName"],
            subdivision=meta["subdivision"],
            category=primary["category"],
            severity=primary["severity"],
            status="PENDING_REVIEW",
            summary=primary["reason"],
            reasons_json=json.dumps([a["reason"] for a in anomalies]),
            evidence_json=json.dumps(
                {
                    "reasons": [a["reason"] for a in anomalies],
                    "thresholdVersion": thresholds.version,
                    "cycleDays": cycle_days,
                    "photoId": photo_id,
                }
            ),
            expected_value=expected_units,
            recorded_value=effective_consumption,
            review_action="Verify meter photograph against OCR reading or request field re-read.",
            threshold_version=thresholds.version,
            recommended_action="Verify meter photograph against OCR reading or request field re-read.",
            assigned_role="EMPLOYEE",
            demo=True,
        )
        db.add(case_rec)
        db.add(
            MeterAnomalyStatusHistoryRecord(
                anomaly_id=case_id,
                from_status="DETECTED",
                to_status="PENDING_REVIEW",
                actor_id=actor.id,
                actor_name=actor.name,
                actor_role=actor.role,
                note=f"Automated anomaly detection flagged {len(anomalies)} item(s) under policy v{thresholds.version}.",
            )
        )
        _create_deduped_notification(
            db,
            dedupe_key=f"ANOMALY_DETECTED:{case_id}",
            recipient_key=meta["consumerNo"],
            user_id=actor.id if actor.role == "CONSUMER" else None,
            category="METER_ANOMALY",
            reference_id=case_id,
            title=f"Meter Reading Queued for Review ({rec.id})",
            message=f"Reading {rec.submitted_reading} kWh for {conn_no} has been routed for billing desk verification.",
        )

    serialized = {"reading": _serialize_reading_record(db, rec)}
    _record_actor_idempotency(
        db,
        client_uuid=payload.clientUuid,
        endpoint="POST:/meter-readings",
        actor_id=actor.id,
        payload_for_hash=idempotency_payload,
        resource_type="meter_reading_submissions",
        resource_id=rec.id,
        response_status=201,
        response_body=serialized,
    )
    log_event(
        db,
        actor_user_id=actor.id,
        action="PHASE11_METER_READING_SUBMITTED",
        entity_type="meter_reading_submissions",
        entity_id=rec.id,
        metadata={
            "connectionNo": conn_no,
            "submittedReading": rec.submitted_reading,
            "status": rec.status,
        },
    )
    db.commit()
    return serialized


@router.get("/{reading_id}/photo")
def get_private_meter_photo(
    reading_id: str,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    _ensure_not_management(actor, "private meter photographs")
    seed_phase11_demo_records(db)

    rec = db.get(MeterReadingSubmissionRecord, reading_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Meter reading record not found.")

    if actor.role == "CONSUMER" and not _consumer_owns_connection(
        db, actor, rec.connection_no
    ):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You cannot view another consumer's meter photograph.",
        )
    if actor.role == "FIELD_ENGINEER":
        assigned, _ = _field_engineer_assigned_to_connection(
            db, actor, rec.connection_no
        )
        if not assigned and rec.submitted_by_id != actor.id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: Meter photograph belongs to an unassigned connection.",
            )

    if not rec.photo_id:
        raise HTTPException(
            status_code=404, detail="No photograph attached to this meter reading."
        )

    photo_rec = db.get(MeterPrivatePhotoRecord, rec.photo_id)
    if not photo_rec:
        raise HTTPException(status_code=404, detail="Private photo record not found.")

    data_url = _read_decrypted_private_photo(photo_rec)
    return {
        "photoId": photo_rec.id,
        "dataUrl": data_url,
        "encryptedAtRest": True,
        "metadataStripped": photo_rec.metadata_stripped,
    }


@router.patch("/{reading_id}/review")
def review_meter_reading_endpoint(
    reading_id: str,
    payload: ReviewMeterReadingPayload,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    if actor.role not in ("EMPLOYEE", "ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Only Employee or Admin roles can review meter readings.",
        )
    if not payload.note or len(payload.note.strip()) < 3:
        raise HTTPException(
            status_code=400, detail="Review audit note is required."
        )

    seed_phase11_demo_records(db)
    idempotency_payload = {
        "readingId": reading_id,
        "action": payload.action,
        "note": payload.note.strip(),
        "correctedReading": payload.correctedReading,
    }
    replay = _check_actor_idempotency(
        db,
        client_uuid=payload.clientUuid,
        endpoint=f"PATCH:/meter-readings/{reading_id}/review",
        actor_id=actor.id,
        payload_for_hash=idempotency_payload,
    )
    if replay is not None:
        return replay

    rec = db.get(MeterReadingSubmissionRecord, reading_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Meter reading record not found.")

    if (
        rec.submitted_by_id == actor.id
        or rec.submitted_by_name.lower() == actor.name.lower()
    ):
        raise HTTPException(
            status_code=403,
            detail="Separation of duties: Staff cannot review their own submitted meter reading.",
        )

    prev_status = rec.status
    action = payload.action.upper()
    if action == "APPROVE":
        new_status = "APPROVED"
        if payload.correctedReading is not None and payload.correctedReading >= rec.previous_reading:
            rec.corrected_reading = float(payload.correctedReading)
            rec.effective_consumption = round(
                (rec.corrected_reading - rec.previous_reading) * rec.multiplier, 2
            )
            meta = _resolve_connection_meta(db, rec.connection_no)
            b_updated = calculate_configurable_cycle_tariff_breakdown(
                category_code=meta["tariffCategory"],
                units_consumed=rec.effective_consumption,
                sanctioned_load_kw=meta["sanctionedLoadKw"],
                cycle_days=rec.cycle_days,
            )
            rec.provisional_amount = float(b_updated["totalBillAmount"])
            rec.provisional_breakdown_json = json.dumps(b_updated)
        if rec.connection_no in CANONICAL_CONNECTIONS:
            final_val = rec.corrected_reading if rec.corrected_reading is not None else rec.reading_value
            CANONICAL_CONNECTIONS[rec.connection_no]["previousReading"] = final_val
            CANONICAL_CONNECTIONS[rec.connection_no]["previousReadingDate"] = (
                rec.reading_date.isoformat() if hasattr(rec.reading_date, "isoformat") else str(rec.reading_date)
            )
    elif action == "REJECT":
        new_status = "REJECTED"
    elif action in ("REQUEST_REREAD", "REREAD"):
        new_status = "REREAD_REQUESTED"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid review action: {action}")

    rec.status = new_status
    rec.reviewed_by_id = actor.id
    rec.reviewed_by_name = actor.name
    rec.reviewed_at = datetime.now(timezone.utc)
    rec.review_note = payload.note.strip()

    db.add(
        MeterReadingReviewHistoryRecord(
            reading_id=rec.id,
            action=action,
            previous_status=prev_status,
            new_status=new_status,
            actor_id=actor.id,
            actor_name=actor.name,
            actor_role=actor.role,
            note=payload.note.strip(),
            corrected_reading=rec.corrected_reading,
        )
    )

    linked_case = db.scalar(
        select(MeterAnomalyCaseRecord).where(
            MeterAnomalyCaseRecord.reading_id == rec.id
        )
    )
    if linked_case:
        old_case_status = linked_case.status
        linked_case.status = (
            "APPROVED"
            if action == "APPROVE"
            else "REJECTED"
            if action == "REJECT"
            else "UNDER_INVESTIGATION"
        )
        linked_case.resolution_note = payload.note.strip()
        linked_case.resolved_by_id = actor.id
        linked_case.resolved_by_name = actor.name
        db.add(
            MeterAnomalyStatusHistoryRecord(
                anomaly_id=linked_case.id,
                from_status=old_case_status,
                to_status=linked_case.status,
                actor_id=actor.id,
                actor_name=actor.name,
                actor_role=actor.role,
                note=f"Reading review ({action}): {payload.note.strip()}",
            )
        )

    serialized = {"reading": _serialize_reading_record(db, rec)}
    _record_actor_idempotency(
        db,
        client_uuid=payload.clientUuid,
        endpoint=f"PATCH:/meter-readings/{reading_id}/review",
        actor_id=actor.id,
        payload_for_hash=idempotency_payload,
        resource_type="meter_reading_submissions",
        resource_id=rec.id,
        response_status=200,
        response_body=serialized,
    )
    db.commit()
    return serialized


@router.get("/cases")
def list_anomaly_cases(
    connectionNo: str | None = Query(default=None),
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    _ensure_not_management(actor, "anomaly cases")
    seed_phase11_demo_records(db)

    stmt = select(MeterAnomalyCaseRecord).order_by(
        MeterAnomalyCaseRecord.created_at.desc()
    )
    if connectionNo:
        stmt = stmt.where(
            MeterAnomalyCaseRecord.connection_no == connectionNo.strip()
        )
    rows = db.scalars(stmt).all()

    if actor.role == "CONSUMER":
        if connectionNo and not _consumer_owns_connection(db, actor, connectionNo):
            raise HTTPException(
                status_code=403, detail="Access denied: You do not own this connection."
            )
        rows = [
            c for c in rows if _consumer_owns_connection(db, actor, c.connection_no)
        ]
    elif actor.role == "FIELD_ENGINEER":
        rows = [
            c
            for c in rows
            if _field_engineer_assigned_to_connection(db, actor, c.connection_no)[0]
        ]

    return {"cases": [_serialize_anomaly_case(db, c) for c in rows]}


@router.patch("/cases/{case_id}/status")
def transition_anomaly_case_status(
    case_id: str,
    payload: TransitionAnomalyStatusPayload,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    if actor.role not in ("EMPLOYEE", "ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Only Employee or Admin roles can transition anomaly case statuses.",
        )
    if not payload.note or len(payload.note.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Audit note is required when transitioning anomaly status.",
        )

    seed_phase11_demo_records(db)
    status_map = {
        "Detected": "DETECTED",
        "DETECTED": "DETECTED",
        "Pending review": "PENDING_REVIEW",
        "PENDING_REVIEW": "PENDING_REVIEW",
        "Under investigation": "UNDER_INVESTIGATION",
        "UNDER_INVESTIGATION": "UNDER_INVESTIGATION",
        "Approved": "APPROVED",
        "APPROVED": "APPROVED",
        "Rejected": "REJECTED",
        "REJECTED": "REJECTED",
        "Corrected": "ADJUSTED",
        "CORRECTED": "ADJUSTED",
        "CORRECTED_THROUGH_ADJUSTMENT": "ADJUSTED",
        "ADJUSTED": "ADJUSTED",
        "Closed": "CLOSED",
        "CLOSED": "CLOSED",
    }
    target_status = status_map.get(payload.status)
    if not target_status:
        raise HTTPException(
            status_code=400, detail=f"Invalid anomaly status: {payload.status}"
        )

    idempotency_payload = {
        "caseId": case_id,
        "status": target_status,
        "note": payload.note.strip(),
        "adjustedUnits": payload.adjustedUnits,
        "adjustedAmount": payload.adjustedAmount,
    }
    replay = _check_actor_idempotency(
        db,
        client_uuid=payload.clientUuid,
        endpoint=f"PATCH:/meter-readings/cases/{case_id}/status",
        actor_id=actor.id,
        payload_for_hash=idempotency_payload,
    )
    if replay is not None:
        return replay

    case_rec = db.get(MeterAnomalyCaseRecord, case_id)
    if not case_rec:
        raise HTTPException(status_code=404, detail="Anomaly case not found.")

    prev_status = case_rec.status
    case_rec.status = target_status
    case_rec.resolution_note = payload.note.strip()
    case_rec.resolved_by_id = actor.id
    case_rec.resolved_by_name = actor.name
    if payload.adjustedUnits is not None:
        case_rec.adjusted_units = float(payload.adjustedUnits)
    if payload.adjustedAmount is not None:
        case_rec.adjusted_amount = float(payload.adjustedAmount)

    db.add(
        MeterAnomalyStatusHistoryRecord(
            anomaly_id=case_rec.id,
            from_status=prev_status,
            to_status=target_status,
            actor_id=actor.id,
            actor_name=actor.name,
            actor_role=actor.role,
            note=payload.note.strip(),
            adjusted_units=case_rec.adjusted_units,
            adjusted_amount=case_rec.adjusted_amount,
        )
    )

    serialized = {"anomalyCase": _serialize_anomaly_case(db, case_rec)}
    _record_actor_idempotency(
        db,
        client_uuid=payload.clientUuid,
        endpoint=f"PATCH:/meter-readings/cases/{case_id}/status",
        actor_id=actor.id,
        payload_for_hash=idempotency_payload,
        resource_type="meter_anomaly_cases",
        resource_id=case_rec.id,
        response_status=200,
        response_body=serialized,
    )
    db.commit()
    return serialized


@router.get("/billing-reviews")
def list_billing_reviews(
    connectionNo: str | None = Query(default=None),
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    _ensure_not_management(actor, "billing review requests")
    seed_phase11_demo_records(db)

    stmt = select(ConsumerBillingReviewRecord).order_by(
        ConsumerBillingReviewRecord.created_at.desc()
    )
    if connectionNo:
        stmt = stmt.where(
            ConsumerBillingReviewRecord.connection_no == connectionNo.strip()
        )
    rows = db.scalars(stmt).all()

    if actor.role == "CONSUMER":
        if connectionNo and not _consumer_owns_connection(db, actor, connectionNo):
            raise HTTPException(
                status_code=403, detail="Access denied: You do not own this connection."
            )
        rows = [
            r for r in rows if _consumer_owns_connection(db, actor, r.connection_no)
        ]

    return {"reviews": [_serialize_billing_review(db, r) for r in rows]}


@router.post("/billing-reviews", status_code=201)
def create_billing_review_endpoint(
    payload: CreateBillingReviewPayload,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    _ensure_not_management(actor, "billing review submissions")
    seed_phase11_demo_records(db)

    idempotency_payload = {
        "billNo": payload.billNo.strip(),
        "category": payload.category.strip(),
        "description": payload.description.strip(),
        "preferredReading": payload.preferredReading,
    }
    replay = _check_actor_idempotency(
        db,
        client_uuid=payload.clientUuid,
        endpoint="POST:/meter-readings/billing-reviews",
        actor_id=actor.id,
        payload_for_hash=idempotency_payload,
    )
    if replay is not None:
        return replay

    existing_by_uuid = db.scalar(
        select(ConsumerBillingReviewRecord).where(
            ConsumerBillingReviewRecord.client_uuid == payload.clientUuid.strip()
        )
    )
    if existing_by_uuid:
        if existing_by_uuid.bill_no != payload.billNo.strip() or (
            actor.role == "CONSUMER"
            and not _consumer_owns_connection(
                db, actor, existing_by_uuid.connection_no
            )
        ):
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "Idempotency conflict: clientUuid already used by a different actor or payload.",
                    "code": "IDEMPOTENCY_CONFLICT",
                },
            )
        return {"review": _serialize_billing_review(db, existing_by_uuid)}

    bill_meta = CANONICAL_BILLS.get(payload.billNo.strip())
    if not bill_meta:
        db_bill = db.scalar(
            select(UtilityBill).where(UtilityBill.bill_no == payload.billNo.strip())
        )
        if not db_bill:
            raise HTTPException(
                status_code=404, detail=f"Bill {payload.billNo} not found."
            )
        conn_no = db_bill.consumer_no
        consumer_name = db_bill.consumer_name
    else:
        conn_no = bill_meta["connectionNo"]
        consumer_name = bill_meta["consumerName"]

    if actor.role == "CONSUMER" and not _consumer_owns_connection(db, actor, conn_no):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You can only request billing reviews for your own bills.",
        )

    if not payload.description or len(payload.description.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Please provide a clear description (at least 10 characters) for the billing review.",
        )

    rev_id = f"CBR-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    photo_id = None
    if payload.evidencePhotoDataUrl and payload.evidencePhotoDataUrl.strip().startswith(
        "data:image/"
    ):
        photo_rec = _store_encrypted_private_photo(
            db,
            photo_data_url=payload.evidencePhotoDataUrl,
            owner_type="BILLING_REVIEW",
            owner_id=rev_id,
            connection_no=conn_no,
            consumer_no=conn_no,
            actor=actor,
        )
        photo_id = photo_rec.id

    val_snap = _validate_bill_canonical(db, payload.billNo.strip())
    rev = ConsumerBillingReviewRecord(
        id=rev_id,
        client_uuid=payload.clientUuid.strip(),
        bill_no=payload.billNo.strip(),
        connection_no=conn_no,
        consumer_no=conn_no,
        consumer_name=consumer_name,
        category=payload.category.strip(),
        description=payload.description.strip(),
        preferred_reading=payload.preferredReading,
        evidence_photo_id=photo_id,
        status="PENDING_REVIEW",
        validation_snapshot_json=json.dumps(val_snap),
        demo=True,
    )
    db.add(rev)
    db.add(
        ConsumerBillingReviewHistoryRecord(
            review_id=rev.id,
            status="PENDING_REVIEW",
            actor_id=actor.id,
            actor_name=actor.name,
            actor_role=actor.role,
            note=payload.description.strip(),
        )
    )

    serialized = {"review": _serialize_billing_review(db, rev)}
    _record_actor_idempotency(
        db,
        client_uuid=payload.clientUuid,
        endpoint="POST:/meter-readings/billing-reviews",
        actor_id=actor.id,
        payload_for_hash=idempotency_payload,
        resource_type="consumer_billing_reviews",
        resource_id=rev.id,
        response_status=201,
        response_body=serialized,
    )
    db.commit()
    return serialized


@router.patch("/billing-reviews/{review_id}/status")
def transition_billing_review_status(
    review_id: str,
    payload: TransitionBillingReviewPayload,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    if actor.role not in ("EMPLOYEE", "ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Only Employee or Admin can update billing review status.",
        )
    if not payload.note or len(payload.note.strip()) < 3:
        raise HTTPException(status_code=400, detail="Resolution note is required.")

    seed_phase11_demo_records(db)
    rev = db.get(ConsumerBillingReviewRecord, review_id)
    if not rev:
        raise HTTPException(status_code=404, detail="Billing review not found.")

    rev.status = payload.status.strip().upper()
    rev.resolution_note = payload.note.strip()
    rev.resolved_by_id = actor.id
    rev.resolved_by_name = actor.name

    db.add(
        ConsumerBillingReviewHistoryRecord(
            review_id=rev.id,
            status=rev.status,
            actor_id=actor.id,
            actor_name=actor.name,
            actor_role=actor.role,
            note=payload.note.strip(),
        )
    )
    db.commit()
    return {"review": _serialize_billing_review(db, rev)}


@router.get("/adjustments")
def list_financial_adjustments(
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    if actor.role not in ("EMPLOYEE", "ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Only Employee and Admin roles can view financial adjustment proposals.",
        )

    seed_phase11_demo_records(db)
    rows = db.scalars(
        select(FinancialAdjustmentProposalRecord).order_by(
            FinancialAdjustmentProposalRecord.proposed_at.desc()
        )
    ).all()
    return {"adjustments": [_serialize_financial_adjustment(db, a) for a in rows]}


@router.post("/adjustments", status_code=201)
def propose_financial_adjustment_endpoint(
    payload: ProposeFinancialAdjustmentPayload,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    if actor.role not in ("EMPLOYEE", "ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Only Employee or Admin can propose financial adjustments.",
        )
    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="Detailed justification reason is required for financial adjustment proposals.",
        )

    seed_phase11_demo_records(db)
    idempotency_payload = {
        "billNo": payload.billNo.strip(),
        "proposedAdjustedUnits": round(float(payload.proposedAdjustedUnits), 2),
        "adjustmentType": payload.adjustmentType,
        "reason": payload.reason.strip(),
    }
    replay = _check_actor_idempotency(
        db,
        client_uuid=payload.clientUuid,
        endpoint="POST:/meter-readings/adjustments",
        actor_id=actor.id,
        payload_for_hash=idempotency_payload,
    )
    if replay is not None:
        return replay

    bill_meta = CANONICAL_BILLS.get(payload.billNo.strip())
    if not bill_meta:
        db_bill = db.scalar(
            select(UtilityBill).where(UtilityBill.bill_no == payload.billNo.strip())
        )
        if not db_bill:
            raise HTTPException(
                status_code=404, detail=f"Bill {payload.billNo} not found."
            )
        bill_meta = {
            "billNo": db_bill.bill_no,
            "connectionNo": db_bill.consumer_no,
            "consumerNo": db_bill.consumer_no,
            "consumerName": db_bill.consumer_name,
            "tariffCategory": db_bill.tariff_category,
            "sanctionedLoadKw": float(db_bill.sanctioned_load_kw),
            "cycleDays": int(db_bill.cycle_days or 61),
            "unitsBilled": float(db_bill.units_billed),
            "arrears": float(db_bill.arrears),
            "delayedPaymentSurcharge": float(db_bill.delayed_payment_surcharge),
            "totalAmount": float(db_bill.total_amount),
        }

    revised_breakdown = calculate_configurable_cycle_tariff_breakdown(
        category_code=bill_meta["tariffCategory"],
        units_consumed=float(payload.proposedAdjustedUnits),
        sanctioned_load_kw=bill_meta["sanctionedLoadKw"],
        cycle_days=bill_meta["cycleDays"],
        arrears=bill_meta["arrears"],
        delayed_payment_surcharge=bill_meta["delayedPaymentSurcharge"],
    )
    revised_amount = float(revised_breakdown["totalBillAmount"])
    original_amount = float(bill_meta["totalAmount"])
    adjustment_amount = round(abs(original_amount - revised_amount), 2)

    adj_id = f"ADJ-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    adj = FinancialAdjustmentProposalRecord(
        id=adj_id,
        anomaly_case_id=payload.anomalyCaseId,
        billing_review_id=payload.billingReviewId,
        bill_no=bill_meta["billNo"],
        connection_no=bill_meta["connectionNo"],
        consumer_no=bill_meta["consumerNo"],
        consumer_name=bill_meta["consumerName"],
        original_units=float(bill_meta["unitsBilled"]),
        original_billed_amount=original_amount,
        proposed_adjusted_units=float(payload.proposedAdjustedUnits),
        proposed_adjustment_amount=adjustment_amount,
        proposed_revised_amount=revised_amount,
        adjustment_type=payload.adjustmentType,
        reason=payload.reason.strip(),
        calculation_basis=(
            f"Phase 9 {bill_meta['tariffCategory']} Tariff Engine: "
            f"{payload.proposedAdjustedUnits} kWh over {bill_meta['cycleDays']} days -> ₹{revised_amount}"
        ),
        status="PENDING_APPROVAL",
        ledger_application_status="PENDING_AUTHORIZATION",
        proposed_by_id=actor.id,
        proposed_by_name=actor.name,
        proposed_by_role=actor.role,
        demo=True,
    )
    db.add(adj)
    db.add(
        FinancialAdjustmentHistoryRecord(
            adjustment_id=adj.id,
            from_status="DRAFT",
            to_status="PENDING_APPROVAL",
            ledger_application_status="PENDING_AUTHORIZATION",
            actor_id=actor.id,
            actor_name=actor.name,
            actor_role=actor.role,
            note=payload.reason.strip(),
        )
    )

    serialized = {"adjustment": _serialize_financial_adjustment(db, adj)}
    _record_actor_idempotency(
        db,
        client_uuid=payload.clientUuid,
        endpoint="POST:/meter-readings/adjustments",
        actor_id=actor.id,
        payload_for_hash=idempotency_payload,
        resource_type="financial_adjustment_proposals",
        resource_id=adj.id,
        response_status=201,
        response_body=serialized,
    )
    db.commit()
    return serialized


@router.patch("/adjustments/{adjustment_id}/review")
def review_financial_adjustment_endpoint(
    adjustment_id: str,
    payload: ReviewFinancialAdjustmentPayload,
    actor: Phase11Actor = Depends(get_phase11_actor),
    db: Session = Depends(get_db),
):
    if actor.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Only Admin can authorize or reject financial adjustment proposals.",
        )
    if not payload.note or len(payload.note.strip()) < 3:
        raise HTTPException(
            status_code=400, detail="Admin authorization audit note is required."
        )

    seed_phase11_demo_records(db)
    adj = db.get(FinancialAdjustmentProposalRecord, adjustment_id)
    if not adj:
        raise HTTPException(
            status_code=404, detail="Financial adjustment proposal not found."
        )

    if (
        adj.proposed_by_id == actor.id
        or adj.proposed_by_name.lower() == actor.name.lower()
    ):
        raise HTTPException(
            status_code=403,
            detail="Separation of duties violation: Proposer cannot approve or reject their own financial adjustment.",
        )

    prev_status = adj.status
    action = payload.action.strip().upper()
    if action == "APPROVE":
        adj.status = "APPROVED"
        adj.ledger_application_status = "APPLIED_AS_ADJUSTMENT_NOTE"
        adj.ledger_reference_id = f"LDG-NOTE-{adj.id.replace('ADJ-', '')}"
        adj.ledger_applied_at = datetime.now(timezone.utc)
    elif action == "REJECT":
        adj.status = "REJECTED"
        adj.ledger_application_status = "REJECTED_NOT_APPLIED"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action: {action}")

    adj.approved_by_id = actor.id
    adj.approved_by_name = actor.name
    adj.approved_by_role = actor.role
    adj.approved_at = datetime.now(timezone.utc)
    adj.approval_note = payload.note.strip()

    db.add(
        FinancialAdjustmentHistoryRecord(
            adjustment_id=adj.id,
            from_status=prev_status,
            to_status=adj.status,
            ledger_application_status=adj.ledger_application_status,
            actor_id=actor.id,
            actor_name=actor.name,
            actor_role=actor.role,
            note=payload.note.strip(),
        )
    )

    if adj.status == "APPROVED" and adj.anomaly_case_id:
        linked_case = db.get(MeterAnomalyCaseRecord, adj.anomaly_case_id)
        if linked_case:
            old_cs = linked_case.status
            linked_case.status = "ADJUSTED"
            linked_case.adjusted_units = adj.proposed_adjusted_units
            linked_case.adjusted_amount = adj.proposed_revised_amount
            linked_case.resolution_note = payload.note.strip()
            linked_case.resolved_by_id = actor.id
            linked_case.resolved_by_name = actor.name
            db.add(
                MeterAnomalyStatusHistoryRecord(
                    anomaly_id=linked_case.id,
                    from_status=old_cs,
                    to_status="ADJUSTED",
                    actor_id=actor.id,
                    actor_name=actor.name,
                    actor_role=actor.role,
                    note=f"Financial adjustment {adj.id} approved by Admin.",
                    adjusted_units=adj.proposed_adjusted_units,
                    adjusted_amount=adj.proposed_revised_amount,
                )
            )

    if adj.status == "APPROVED" and adj.billing_review_id:
        linked_rev = db.get(ConsumerBillingReviewRecord, adj.billing_review_id)
        if linked_rev:
            linked_rev.status = "ADJUSTED"
            linked_rev.resolution_note = payload.note.strip()
            linked_rev.resolved_by_id = actor.id
            linked_rev.resolved_by_name = actor.name
            db.add(
                ConsumerBillingReviewHistoryRecord(
                    review_id=linked_rev.id,
                    status="ADJUSTED",
                    actor_id=actor.id,
                    actor_name=actor.name,
                    actor_role=actor.role,
                    note=f"Financial adjustment {adj.id} approved by Admin.",
                )
            )

    db.commit()
    return {"adjustment": _serialize_financial_adjustment(db, adj)}
