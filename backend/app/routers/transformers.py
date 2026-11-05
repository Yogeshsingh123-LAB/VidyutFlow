"""Asset Registry API + RBAC for Phase 12 Distribution Transformers (DTR).

RBAC Rules:
- consumer: 403 Forbidden on all asset management and telemetry routes
- officer (Employee) & engineer (Field): Read operations strictly scoped to subdivision_id == u.zone
- admin (Management/Admin): Full cross-zone read access; POST / PATCH asset mutations restricted to admin
- telemetry ingestion: Validated via X-Telemetry-Ingest-Key header with hmac.compare_digest
  against settings.telemetry_ingest_secret. Returns 401 when missing/invalid and 403 if
  called with normal user credentials.
"""
import asyncio
from datetime import date, datetime, timezone
import hmac
from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status as http_status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..config import settings
from ..db import get_db
import json
import uuid
from ..models import (
    User,
    TransformerAsset,
    TransformerSensor,
    TelemetryReading,
    TelemetryDeadLetter,
    TransformerAlert,
    InspectionRecord,
    MaintenanceAssessment,
    AlertPolicyVersion,
)
from ..services.rules_engine import evaluate_transformer_telemetry
from ..services.predictive_risk import calculate_transformer_risk, assess_and_persist_transformer_risk
from ..services.event_bus import transformer_event_bus, format_sse
from ..deps import AUTH_COOKIE_NAME, current_user, require
from ..audit import log_action
from ..security import sanitize_untrusted_text

router = APIRouter(prefix="/transformers", tags=["transformers"])
analytics_router = APIRouter(prefix="/transformer-analytics", tags=["transformer-analytics"])
policies_router = APIRouter(prefix="/transformer-policies", tags=["transformer-policies"])


def now_utc():
    return datetime.now(timezone.utc)


def verify_telemetry_ingest_key(
    request: Request,
    x_telemetry_ingest_key: str | None = Header(default=None, alias="X-Telemetry-Ingest-Key"),
) -> str:
    """Validate X-Telemetry-Ingest-Key header against settings.telemetry_ingest_secret via hmac.compare_digest.

    Returns 401 when missing/invalid and 403 if a normal user JWT tries to call it.
    """
    auth_header = request.headers.get("authorization") or ""
    auth_cookie = request.cookies.get(AUTH_COOKIE_NAME)
    has_user_creds = bool(auth_header.startswith("Bearer ") or auth_cookie)

    key = x_telemetry_ingest_key or request.headers.get("x-telemetry-ingest-key")
    if not key:
        if has_user_creds:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="User credentials cannot be used for service telemetry ingestion; valid X-Telemetry-Ingest-Key required",
            )
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Missing required X-Telemetry-Ingest-Key header",
        )

    expected = (settings.telemetry_ingest_secret or "").encode("utf-8")
    actual = key.encode("utf-8")
    if not hmac.compare_digest(actual, expected):
        if has_user_creds:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="User credentials cannot be used for service telemetry ingestion",
            )
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Invalid X-Telemetry-Ingest-Key",
        )

    return key


class TransformerCreate(BaseModel):
    utility_asset_code: str = Field(..., min_length=3, max_length=64, description="Discom asset code (e.g. DEMO-TR-NORTH-01)")
    feeder_id: str = Field(..., min_length=1, max_length=64, description="Upstream 11kV feeder identifier")
    substation_id: str = Field(..., min_length=1, max_length=64, description="Parent 66kV substation identifier")
    zone: str = Field(default="North", max_length=32, description="Subdivision zone name (North, South, Central, etc.)")
    rated_kva: float = Field(..., gt=0, description="Rated capacity in kVA (e.g. 100, 250, 315, 500)")
    phases: int = Field(default=3, ge=1, le=3, description="Electrical phase count (1 or 3)")
    voltage_class: str = Field(default="11kV/415V", max_length=16, description="Voltage rating transformation class")
    commissioning_date: date | None = None
    manufacturer: str | None = Field(default=None, max_length=128)
    serial_number: str | None = Field(default=None, max_length=64)
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)
    coordinate_source: str | None = Field(default="FIELD_GPS", max_length=32)
    status: str = Field(default="IN_SERVICE", max_length=16, description="IN_SERVICE | MAINTENANCE | FAULT | RETIRED")


class TransformerUpdate(BaseModel):
    feeder_id: str | None = Field(default=None, max_length=64)
    substation_id: str | None = Field(default=None, max_length=64)
    zone: str | None = Field(default=None, max_length=32)
    rated_kva: float | None = Field(default=None, gt=0)
    phases: int | None = Field(default=None, ge=1, le=3)
    voltage_class: str | None = Field(default=None, max_length=16)
    commissioning_date: date | None = None
    manufacturer: str | None = Field(default=None, max_length=128)
    serial_number: str | None = Field(default=None, max_length=64)
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)
    coordinate_source: str | None = Field(default=None, max_length=32)
    status: str | None = Field(default=None, max_length=16)


class TelemetryReadingCreate(BaseModel):
    transformer_id: str = Field(..., description="Transformer asset ID or utility_asset_code")
    sensor_id: str = Field(..., description="Sensor instrument ID")
    measured_at: datetime = Field(..., description="Timestamp of sensor measurement (ISO 8601)")
    value: float = Field(..., description="Metric value (kW, kVA, deg C, A, V)")
    unit: str = Field(..., max_length=16, description="Unit symbol")
    quality: str = Field(default="GOOD", max_length=8, description="GOOD | QUESTIONABLE | BAD")
    source: str = Field(default="IOT", max_length=24, description="SCADA | AMI | IOT | SIMULATED_DEMO")
    ingestion_id: str = Field(..., min_length=1, max_length=64, description="Unique client UUID / message idempotency ID")
    raw_payload_ref: str | None = Field(default=None, max_length=128)


class TelemetryBatchIngest(BaseModel):
    readings: list[TelemetryReadingCreate] = Field(..., min_length=1, max_length=1000)


class InspectionCreate(BaseModel):
    client_uuid: str | None = Field(default=None, max_length=64, description="Client UUID for idempotent submission")
    work_order_id: str | None = Field(default=None, max_length=64)
    checklist: Any = Field(default_factory=dict, description="Structured checklist items")
    observations: str | None = Field(default=None, max_length=2000)
    photo_refs: Any = Field(default_factory=list, description="Array of photo references / SHA256 hashes")
    gps_accuracy: float | None = Field(default=None, ge=0)
    signature: str | None = Field(default=None, max_length=256)
    review_status: str = Field(default="VERIFIED", max_length=16)


class PolicyCreate(BaseModel):
    transformer_class: str = Field(..., max_length=32, description="e.g. DISTRIBUTION_11KV_DEMO, POWER_66KV_DEMO")
    version: str = Field(..., max_length=32, description="Policy version identifier, e.g. v2026.11-custom")
    thresholds: dict[str, Any] = Field(..., description="Dict of threshold configs for overload, oil temp, etc.")
    source_evidence: str = Field(default="CEA_GRID_STANDARDS_2026", max_length=64, description="Standard or regulatory reference")


class MaintenanceWorkOrderCreate(BaseModel):
    work_order_type: str = Field(default="TRANSFORMER_OVERLOAD_INSPECTION", max_length=64)
    priority: str = Field(default="HIGH", max_length=16, description="LOW | MEDIUM | HIGH | CRITICAL")
    assigned_engineer_id: str | None = Field(default=None, max_length=36)
    description: str | None = Field(default=None, max_length=2000)
    recommended_action: str | None = Field(default=None, max_length=1000)


def _alert_out(a: TransformerAlert, tr: TransformerAsset | None = None) -> dict[str, Any]:
    evidence = {}
    if a.evidence_refs:
        try:
            evidence = json.loads(a.evidence_refs)
        except Exception:
            evidence = {"raw": a.evidence_refs}
    return {
        "id": a.id,
        "transformer_id": a.transformer_id,
        "utility_asset_code": tr.utility_asset_code if tr else None,
        "zone": tr.zone if tr else None,
        "alert_type": a.alert_type,
        "severity": a.severity,
        "status": a.status,
        "first_seen_at": a.first_seen_at.isoformat() if a.first_seen_at else None,
        "last_seen_at": a.last_seen_at.isoformat() if a.last_seen_at else None,
        "threshold_version": a.threshold_version,
        "evidence": evidence,
        "dedupe_key": a.dedupe_key,
        "acknowledged_by": a.acknowledged_by,
        "escalation_state": a.escalation_state,
        "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
    }


def _assessment_out(a: MaintenanceAssessment, tr: TransformerAsset | None = None) -> dict[str, Any]:
    features_data = json.loads(a.features) if isinstance(a.features, str) else (a.features or {})
    explanation_data = json.loads(a.explanation) if isinstance(a.explanation, str) else [a.explanation or ""]
    return {
        "id": a.id,
        "transformer_id": a.transformer_id,
        "utility_asset_code": tr.utility_asset_code if tr else None,
        "zone": tr.zone if tr else None,
        "generated_at": a.generated_at.isoformat() if a.generated_at else None,
        "prediction_horizon": a.prediction_horizon,
        "risk_probability": a.risk_probability,
        "uncertainty": a.uncertainty,
        "model_version": a.model_version,
        "features": features_data,
        "explanation": explanation_data,
        "recommended_review": a.recommended_review,
        "human_decision": a.human_decision,
    }


def _inspection_out(rec: InspectionRecord) -> dict[str, Any]:
    checklist = {}
    if rec.checklist:
        try:
            checklist = json.loads(rec.checklist)
        except Exception:
            checklist = rec.checklist

    photo_refs = []
    if rec.photo_refs:
        try:
            photo_refs = json.loads(rec.photo_refs)
        except Exception:
            photo_refs = [rec.photo_refs]

    return {
        "id": rec.id,
        "transformer_id": rec.transformer_id,
        "work_order_id": rec.work_order_id,
        "assigned_to": rec.assigned_to,
        "checklist": checklist,
        "observations": rec.observations,
        "photo_refs": photo_refs,
        "verified_at": rec.verified_at.isoformat() if rec.verified_at else None,
        "gps_accuracy": rec.gps_accuracy,
        "signature": rec.signature,
        "review_status": rec.review_status,
    }


def _asset_out(tr: TransformerAsset) -> dict[str, Any]:
    return {
        "id": tr.id,
        "utility_asset_code": tr.utility_asset_code,
        "feeder_id": tr.feeder_id,
        "substation_id": tr.substation_id,
        "zone": tr.zone,
        "subdivision_id": tr.zone,  # Alias zone to subdivision_id matching SubdivisionZone.name
        "rated_kva": tr.rated_kva,
        "phases": tr.phases,
        "voltage_class": tr.voltage_class,
        "commissioning_date": tr.commissioning_date.isoformat() if tr.commissioning_date else None,
        "manufacturer": tr.manufacturer,
        "serial_number": tr.serial_number,
        "latitude": tr.latitude,
        "longitude": tr.longitude,
        "coordinate_source": tr.coordinate_source,
        "coordinate_verified_at": tr.coordinate_verified_at.isoformat() if tr.coordinate_verified_at else None,
        "status": tr.status,
        "metadata_version": tr.metadata_version,
        "created_at": tr.created_at.isoformat() if tr.created_at else None,
        "updated_at": tr.updated_at.isoformat() if tr.updated_at else None,
    }


def _sensor_out(s: TransformerSensor) -> dict[str, Any]:
    return {
        "id": s.id,
        "transformer_id": s.transformer_id,
        "sensor_type": s.sensor_type,
        "unit": s.unit,
        "channel_phase": s.channel_phase,
        "calibration_at": s.calibration_at.isoformat() if s.calibration_at else None,
        "last_seen_at": s.last_seen_at.isoformat() if s.last_seen_at else None,
        "source_system": s.source_system,
        "quality_state": s.quality_state,
        "active": s.active,
    }


def _check_read_access(u: User, tr: TransformerAsset, db: Session | None = None) -> None:
    if u.role == "consumer":
        if db is not None:
            log_action(
                db,
                actor=u,
                action="SECURITY_VIOLATION",
                entity="transformer",
                entity_id=tr.id,
                detail=f"Consumer {u.email} blocked from accessing transformer {tr.id} ({tr.utility_asset_code})",
            )
            db.commit()
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Access restricted to utility personnel",
        )
    if u.role in ("officer", "engineer"):
        user_zone = (u.zone or "").strip().lower()
        tr_zone = (tr.zone or "").strip().lower()
        if user_zone != tr_zone:
            if db is not None:
                log_action(
                    db,
                    actor=u,
                    action="SECURITY_VIOLATION",
                    entity="transformer",
                    entity_id=tr.id,
                    detail=f"User {u.email} ({u.zone}) blocked from accessing transformer in zone {tr.zone}",
                )
                db.commit()
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: transformer asset is located in '{tr.zone}' zone, outside your assigned '{u.zone}' zone",
            )


def require_transformer_role(*allowed_roles: str):
    """Enforce RBAC on transformer endpoints with tamper-evident audit logging for 403 blocks."""
    def _guard(
        request: Request,
        db: Session = Depends(get_db),
        u: User = Depends(current_user),
    ) -> User:
        if u.role not in allowed_roles:
            entity_id = (
                request.path_params.get("transformer_id")
                or request.path_params.get("alert_id")
                or request.path_params.get("id")
                or "fleet"
            )
            log_action(
                db,
                actor=u,
                action="SECURITY_VIOLATION",
                entity="transformer",
                entity_id=str(entity_id),
                detail=f"Consumer {u.email} blocked with 403 on {request.method} {request.url.path}; requires {', '.join(allowed_roles)}",
            )
            db.commit()
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted to utility personnel (requires {', '.join(allowed_roles)})",
            )
        return u
    return _guard



@router.get("", summary="List transformer assets with RBAC zone-scoping")
def list_transformers(
    zone: str | None = Query(default=None, description="Filter by subdivision zone (Admin only)"),
    feeder_id: str | None = Query(default=None, description="Filter by upstream 11kV feeder ID"),
    substation_id: str | None = Query(default=None, description="Filter by 66kV substation ID"),
    asset_status: str | None = Query(default=None, alias="status", description="Filter by operational status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    if u.role == "consumer":
        log_action(
            db,
            actor=u,
            action="SECURITY_VIOLATION",
            entity="transformer",
            entity_id="fleet",
            detail=f"Consumer {u.email} blocked from listing transformers",
        )
        db.commit()
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Access restricted to utility personnel",
        )

    q = db.query(TransformerAsset)

    # Scoping: officer & engineer strictly restricted to own zone
    if u.role in ("officer", "engineer"):
        user_zone = (u.zone or "").strip().lower()
        q = q.filter(func.lower(TransformerAsset.zone) == user_zone)
    elif u.role == "admin":
        if zone and zone.strip():
            q = q.filter(func.lower(TransformerAsset.zone) == zone.strip().lower())

    if feeder_id:
        q = q.filter(TransformerAsset.feeder_id == feeder_id)
    if substation_id:
        q = q.filter(TransformerAsset.substation_id == substation_id)
    if asset_status:
        q = q.filter(TransformerAsset.status == asset_status)

    total = q.count()
    rows = q.order_by(TransformerAsset.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [_asset_out(r) for r in rows],
    }


@router.post("/telemetry", status_code=http_status.HTTP_201_CREATED, summary="Ingest transformer telemetry readings")
def ingest_telemetry(
    body: TelemetryBatchIngest,
    db: Session = Depends(get_db),
    _ingest_key: str = Depends(verify_telemetry_ingest_key),
):
    now = now_utc()
    ingested_count = 0
    duplicate_count = 0
    dead_letter_count = 0
    dead_letters = []

    tr_cache: dict[str, TransformerAsset | None] = {}
    sensor_cache: dict[str, TransformerSensor | None] = {}

    for item in body.readings:
        # 1. Resolve transformer
        tr_key = item.transformer_id
        if tr_key not in tr_cache:
            tr = db.query(TransformerAsset).filter(
                (TransformerAsset.id == tr_key) | (TransformerAsset.utility_asset_code == tr_key)
            ).first()
            tr_cache[tr_key] = tr
        else:
            tr = tr_cache[tr_key]

        if not tr:
            reason = f"Transformer '{item.transformer_id}' not found"
            dl = TelemetryDeadLetter(
                ingestion_id=item.ingestion_id,
                raw_payload=item.model_dump_json(),
                error_reason=reason,
                received_at=now,
            )
            db.add(dl)
            dead_letter_count += 1
            dead_letters.append({"ingestion_id": item.ingestion_id, "error": reason})
            continue

        # 2. Resolve sensor
        s_id = item.sensor_id
        if s_id not in sensor_cache:
            sensor = db.query(TransformerSensor).filter(TransformerSensor.id == s_id).first()
            sensor_cache[s_id] = sensor
        else:
            sensor = sensor_cache[s_id]

        if not sensor:
            reason = f"Sensor '{item.sensor_id}' not found"
            dl = TelemetryDeadLetter(
                ingestion_id=item.ingestion_id,
                raw_payload=item.model_dump_json(),
                error_reason=reason,
                received_at=now,
            )
            db.add(dl)
            dead_letter_count += 1
            dead_letters.append({"ingestion_id": item.ingestion_id, "error": reason})
            continue

        # 3. Item 3 rule: sensor_id must belong to that transformer
        if sensor.transformer_id != tr.id:
            reason = f"Sensor '{item.sensor_id}' does not belong to transformer '{tr.utility_asset_code}'"
            dl = TelemetryDeadLetter(
                ingestion_id=item.ingestion_id,
                raw_payload=item.model_dump_json(),
                error_reason=reason,
                received_at=now,
            )
            db.add(dl)
            dead_letter_count += 1
            dead_letters.append({"ingestion_id": item.ingestion_id, "error": reason})
            continue

        # 4. Check idempotency
        existing_reading = db.query(TelemetryReading).filter(
            TelemetryReading.ingestion_id == item.ingestion_id
        ).first()
        if existing_reading:
            duplicate_count += 1
            continue

        # 5. Insert TelemetryReading
        reading = TelemetryReading(
            transformer_id=tr.id,
            sensor_id=sensor.id,
            measured_at=item.measured_at,
            received_at=now,
            value=item.value,
            unit=sanitize_untrusted_text(item.unit),
            quality=sanitize_untrusted_text(item.quality),
            source=sanitize_untrusted_text(item.source),
            ingestion_id=item.ingestion_id,
            raw_payload_ref=sanitize_untrusted_text(item.raw_payload_ref) if item.raw_payload_ref else None,
        )
        db.add(reading)

        # Update sensor telemetry state
        sensor.last_seen_at = now
        sensor.quality_state = item.quality
        ingested_count += 1

        transformer_event_bus.publish_sync(
            "telemetry",
            {
                "transformer_id": tr.id,
                "utility_asset_code": tr.utility_asset_code,
                "sensor_id": sensor.id,
                "sensor_type": sensor.sensor_type,
                "value": item.value,
                "unit": item.unit,
                "quality": item.quality,
                "measured_at": item.measured_at.isoformat() if hasattr(item.measured_at, "isoformat") else str(item.measured_at),
                "zone": tr.zone,
            },
            zone=tr.zone,
        )

    db.commit()

    return {
        "status": "success",
        "total_received": len(body.readings),
        "ingested": ingested_count,
        "duplicates": duplicate_count,
        "dead_lettered": dead_letter_count,
        "dead_letters": dead_letters,
    }


@router.get("/telemetry/dead-letters", summary="Inspect telemetry dead-letter queue (Admin only)")
def list_telemetry_dead_letters(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("admin")),
):
    rows = db.query(TelemetryDeadLetter).order_by(TelemetryDeadLetter.received_at.desc()).limit(limit).all()
    return {
        "total": len(rows),
        "items": [
            {
                "id": dl.id,
                "ingestion_id": dl.ingestion_id,
                "error_reason": dl.error_reason,
                "raw_payload": dl.raw_payload,
                "received_at": dl.received_at.isoformat() if dl.received_at else None,
                "replayed_at": dl.replayed_at.isoformat() if dl.replayed_at else None,
            }
            for dl in rows
        ],
    }


@router.get("/alerts", summary="List transformer alerts with RBAC zone-scoping")
def list_alerts(
    status: str | None = Query(default=None, description="ACTIVE | ACKNOWLEDGED | RESOLVED"),
    severity: str | None = Query(default=None, description="WARN | CRITICAL"),
    alert_type: str | None = Query(default=None, description="OVERLOAD | OIL_TEMP_HIGH | WINDING_TEMP_HIGH | HIGH_VIBRATION"),
    zone: str | None = Query(default=None, description="Filter by zone (Admin only)"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    if u.role == "consumer":
        log_action(
            db,
            actor=u,
            action="SECURITY_VIOLATION",
            entity="transformer",
            entity_id="alerts",
            detail=f"Consumer {u.email} blocked from listing transformer alerts",
        )
        db.commit()
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Access restricted to utility personnel")

    q = db.query(TransformerAlert, TransformerAsset).join(TransformerAsset, TransformerAlert.transformer_id == TransformerAsset.id)

    if u.role in ("officer", "engineer"):
        user_zone = (u.zone or "").strip().lower()
        q = q.filter(func.lower(TransformerAsset.zone) == user_zone)
    elif u.role == "admin":
        if zone and zone.strip():
            q = q.filter(func.lower(TransformerAsset.zone) == zone.strip().lower())

    if status:
        q = q.filter(TransformerAlert.status == status)
    if severity:
        q = q.filter(TransformerAlert.severity == severity)
    if alert_type:
        q = q.filter(TransformerAlert.alert_type == alert_type)

    total = q.count()
    rows = q.order_by(TransformerAlert.last_seen_at.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [_alert_out(alert, tr) for alert, tr in rows],
    }


@router.post("/alerts/{alert_id}/acknowledge", summary="Acknowledge active transformer alert")
def acknowledge_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("officer", "engineer", "admin")),
):
    alert = db.query(TransformerAlert).filter(TransformerAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Alert not found")

    tr = db.query(TransformerAsset).filter(TransformerAsset.id == alert.transformer_id).first()
    if tr:
        _check_read_access(u, tr, db=db)

    if alert.status == "RESOLVED":
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Cannot acknowledge resolved alert")

    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_by = u.id

    log_action(
        db,
        u.id,
        "TRANSFORMER_ALERT_ACKNOWLEDGED",
        "transformer_alerts",
        alert.id,
        f"type={alert.alert_type} sev={alert.severity} tr={tr.utility_asset_code if tr else alert.transformer_id}",
    )
    db.commit()
    db.refresh(alert)
    return _alert_out(alert, tr)


@router.post("/alerts/{alert_id}/resolve", summary="Resolve active or acknowledged transformer alert")
def resolve_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("officer", "engineer", "admin")),
):
    alert = db.query(TransformerAlert).filter(TransformerAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Alert not found")

    tr = db.query(TransformerAsset).filter(TransformerAsset.id == alert.transformer_id).first()
    if tr:
        _check_read_access(u, tr, db=db)

    alert.status = "RESOLVED"
    alert.resolved_at = now_utc()

    log_action(
        db,
        u.id,
        "TRANSFORMER_ALERT_RESOLVED",
        "transformer_alerts",
        alert.id,
        f"type={alert.alert_type} tr={tr.utility_asset_code if tr else alert.transformer_id}",
    )
    db.commit()
    db.refresh(alert)
    transformer_event_bus.publish_sync(
        "alert_resolved",
        {
            "id": alert.id,
            "transformer_id": alert.transformer_id,
            "utility_asset_code": tr.utility_asset_code if tr else None,
            "alert_type": alert.alert_type,
            "status": "RESOLVED",
            "zone": tr.zone if tr else None,
            "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
        },
        zone=tr.zone if tr else None,
    )
    return _alert_out(alert, tr)


@router.get(
    "/stream",
    summary="Server-Sent Events (SSE) real-time stream of transformer telemetry and alerts",
    response_class=StreamingResponse,
    responses={
        200: {
            "content": {"text/event-stream": {}},
            "description": "Continuous real-time SSE stream of transformer events.",
        }
    },
)
async def stream_transformer_events(
    request: Request,
    transformer_id: str | None = Query(default=None, description="Optional transformer ID or code to filter stream"),
    max_events: int | None = Query(default=None, ge=1, le=1000, description="Max events to yield before closing (useful for test client / bounded polling)"),
    heartbeat_seconds: float = Query(default=15.0, ge=0.01, le=60.0, description="Heartbeat interval in seconds"),
    replay_history: bool = Query(default=True, description="Whether to replay recent events buffer on connect"),
    u: User = Depends(require_transformer_role("officer", "engineer", "admin")),
    db: Session = Depends(get_db),
):
    """Real-time SSE event stream for transformer telemetry, alerts, and grid operations.

    Authentication:
    - Authenticated via existing HttpOnly cookie `vidyutflow_access_token` or `Authorization: Bearer <token>`.
    - Passing JWT in URL query parameters is prohibited and returns 400.

    RBAC & Scoping:
    - consumer: 403 Forbidden.
    - officer / engineer: Events filtered strictly to `u.zone`.
    - admin: Cross-zone events.
    """
    if "token" in request.query_params or "access_token" in request.query_params:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Passing JWT tokens in URL query parameters is prohibited. Use Authorization header or HttpOnly cookie.",
        )

    target_tr_id: str | None = None
    if transformer_id:
        tr = db.query(TransformerAsset).filter(
            (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
        ).first()
        if not tr:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")
        _check_read_access(u, tr, db=db)
        target_tr_id = tr.id

    q = await transformer_event_bus.subscribe()

    async def event_generator():
        delivered = 0
        try:
            # 1. Initial connection handshake event
            init_payload = {
                "status": "connected",
                "role": u.role,
                "zone": u.zone,
                "filtered_transformer_id": target_tr_id,
                "connected_at": now_utc().isoformat(),
            }
            yield format_sse(event="connected", data=init_payload)
            delivered += 1
            if max_events is not None and delivered >= max_events:
                return

            # 2. Replay recent events matching user role and transformer
            if replay_history:
                recent_events = transformer_event_bus.get_recent(
                    zone=u.zone if u.role in ("officer", "engineer") else None,
                    transformer_id=target_tr_id,
                    limit=5,
                )
                for rev in recent_events:
                    ev_name = rev.get("event", "message")
                    ev_data = rev.get("data", {})
                    yield format_sse(event=ev_name, data=ev_data)
                    delivered += 1
                    if max_events is not None and delivered >= max_events:
                        return

            while True:
                if await request.is_disconnected():
                    break

                try:
                    event = await asyncio.wait_for(q.get(), timeout=heartbeat_seconds)
                except asyncio.TimeoutError:
                    yield format_sse(comment=f"heartbeat {now_utc().isoformat()}")
                    delivered += 1
                    if max_events is not None and delivered >= max_events:
                        break
                    continue

                # RBAC zone filtering
                if u.role in ("officer", "engineer"):
                    event_zone = event.get("zone")
                    if event_zone and u.zone and event_zone.strip().lower() != u.zone.strip().lower():
                        continue

                # Target transformer filtering
                if target_tr_id:
                    data = event.get("data") or {}
                    event_tr_id = data.get("transformer_id")
                    if event_tr_id and event_tr_id != target_tr_id:
                        continue

                ev_name = event.get("event", "message")
                ev_data = event.get("data", {})
                yield format_sse(event=ev_name, data=ev_data)
                delivered += 1
                if max_events is not None and delivered >= max_events:
                    break
        finally:
            await transformer_event_bus.unsubscribe(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{transformer_id}", summary="Get transformer asset details by ID or code")
def get_transformer(
    transformer_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()

    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")

    _check_read_access(u, tr, db=db)
    return _asset_out(tr)


@router.get("/{transformer_id}/sensors", summary="List instrumented sensors for a transformer")
def get_transformer_sensors(
    transformer_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()

    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")

    _check_read_access(u, tr, db=db)
    sensors = db.query(TransformerSensor).filter(TransformerSensor.transformer_id == tr.id).all()
    return {
        "transformer_id": tr.id,
        "utility_asset_code": tr.utility_asset_code,
        "total_sensors": len(sensors),
        "items": [_sensor_out(s) for s in sensors],
    }


@router.get("/{transformer_id}/telemetry", summary="Query recent telemetry readings for a transformer")
def get_transformer_telemetry(
    transformer_id: str,
    sensor_type: str | None = Query(default=None, description="Filter by sensor type (LOAD_KVA, OIL_TEMP, etc.)"),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()

    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")

    _check_read_access(u, tr, db=db)

    q = db.query(TelemetryReading).filter(TelemetryReading.transformer_id == tr.id)
    if sensor_type:
        sensor_ids = [
            s.id
            for s in db.query(TransformerSensor.id)
            .filter(
                TransformerSensor.transformer_id == tr.id,
                TransformerSensor.sensor_type == sensor_type,
            )
            .all()
        ]
        q = q.filter(TelemetryReading.sensor_id.in_(sensor_ids))

    readings = q.order_by(TelemetryReading.measured_at.desc()).limit(limit).all()

    return {
        "transformer_id": tr.id,
        "utility_asset_code": tr.utility_asset_code,
        "total": len(readings),
        "items": [
            {
                "id": r.id,
                "sensor_id": r.sensor_id,
                "measured_at": r.measured_at.isoformat() if r.measured_at else None,
                "received_at": r.received_at.isoformat() if r.received_at else None,
                "value": r.value,
                "unit": r.unit,
                "quality": r.quality,
                "source": r.source,
                "ingestion_id": r.ingestion_id,
            }
            for r in readings
        ],
    }


@router.post("", status_code=http_status.HTTP_201_CREATED, summary="Register a new transformer asset (Admin only)")
def create_transformer(
    body: TransformerCreate,
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("admin")),
):
    clean_code = sanitize_untrusted_text(body.utility_asset_code)
    existing = db.query(TransformerAsset).filter(
        func.lower(TransformerAsset.utility_asset_code) == clean_code.lower()
    ).first()
    if existing:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Transformer with asset code '{clean_code}' already exists",
        )

    tr = TransformerAsset(
        utility_asset_code=clean_code,
        feeder_id=sanitize_untrusted_text(body.feeder_id),
        substation_id=sanitize_untrusted_text(body.substation_id),
        zone=sanitize_untrusted_text(body.zone) or "North",
        rated_kva=body.rated_kva,
        phases=body.phases,
        voltage_class=sanitize_untrusted_text(body.voltage_class),
        commissioning_date=body.commissioning_date,
        manufacturer=sanitize_untrusted_text(body.manufacturer) if body.manufacturer else None,
        serial_number=sanitize_untrusted_text(body.serial_number) if body.serial_number else None,
        latitude=body.latitude,
        longitude=body.longitude,
        coordinate_source=body.coordinate_source,
        coordinate_verified_at=now_utc() if (body.latitude is not None and body.longitude is not None) else None,
        status=body.status,
        metadata_version=1,
    )
    db.add(tr)
    db.flush()

    log_action(
        db,
        u.id,
        "TRANSFORMER_CREATED",
        "transformers_asset",
        tr.id,
        f"code={tr.utility_asset_code} zone={tr.zone} kva={tr.rated_kva}",
    )
    db.commit()
    db.refresh(tr)
    return _asset_out(tr)


@router.patch("/{transformer_id}", summary="Update transformer asset metadata (Admin only)")
def update_transformer(
    transformer_id: str,
    body: TransformerUpdate,
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("admin")),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()

    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return _asset_out(tr)

    for field, val in updates.items():
        if isinstance(val, str):
            val = sanitize_untrusted_text(val)
        setattr(tr, field, val)

    tr.metadata_version += 1
    tr.updated_at = now_utc()
    if body.latitude is not None or body.longitude is not None:
        tr.coordinate_verified_at = now_utc()

    log_action(
        db,
        u.id,
        "TRANSFORMER_UPDATED",
        "transformers_asset",
        tr.id,
        f"fields={','.join(sorted(updates.keys()))} v={tr.metadata_version}",
    )
    db.commit()
    db.refresh(tr)
    return _asset_out(tr)

@router.get("/{transformer_id}/alerts", summary="List alerts for a specific transformer")
def get_transformer_alerts(
    transformer_id: str,
    status: str | None = Query(default=None, description="ACTIVE | ACKNOWLEDGED | RESOLVED"),
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()
    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")
    _check_read_access(u, tr, db=db)

    q = db.query(TransformerAlert).filter(TransformerAlert.transformer_id == tr.id)
    if status:
        q = q.filter(TransformerAlert.status == status)

    rows = q.order_by(TransformerAlert.last_seen_at.desc()).all()
    return {
        "transformer_id": tr.id,
        "utility_asset_code": tr.utility_asset_code,
        "total": len(rows),
        "items": [_alert_out(a, tr) for a in rows],
    }


@router.post("/{transformer_id}/evaluate-alerts", summary="Trigger rules engine evaluation on latest transformer telemetry")
def evaluate_alerts(
    transformer_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()
    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")
    _check_read_access(u, tr, db=db)

    alerts = evaluate_transformer_telemetry(db, tr.id)
    return {
        "transformer_id": tr.id,
        "utility_asset_code": tr.utility_asset_code,
        "evaluated_alerts": len(alerts),
        "items": [_alert_out(a, tr) for a in alerts],
    }


@router.post("/{transformer_id}/inspections", status_code=http_status.HTTP_201_CREATED, summary="Record field inspection record (Idempotent on client_uuid, Audited)")
def create_field_inspection(
    transformer_id: str,
    body: InspectionCreate,
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("engineer", "admin")),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()
    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")

    # Engineer must belong to the transformer's zone
    if u.role == "engineer":
        user_zone = (u.zone or "").strip().lower()
        tr_zone = (tr.zone or "").strip().lower()
        if user_zone != tr_zone:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: cannot submit inspection for '{tr.zone}' transformer outside your assigned '{u.zone}' zone",
            )

    # Idempotency check on client_uuid
    if body.client_uuid:
        existing = db.query(InspectionRecord).filter(InspectionRecord.id == body.client_uuid).first()
        if existing:
            return _inspection_out(existing)

    rec_id = body.client_uuid if body.client_uuid else str(uuid.uuid4())
    checklist_json = json.dumps(body.checklist) if not isinstance(body.checklist, str) else body.checklist
    photo_refs_json = json.dumps(body.photo_refs) if not isinstance(body.photo_refs, str) else body.photo_refs
    obs = sanitize_untrusted_text(body.observations) if body.observations else None

    rec = InspectionRecord(
        id=rec_id,
        transformer_id=tr.id,
        work_order_id=body.work_order_id,
        assigned_to=u.id,
        checklist=checklist_json,
        observations=obs,
        photo_refs=photo_refs_json,
        verified_at=now_utc(),
        gps_accuracy=body.gps_accuracy,
        signature=body.signature,
        review_status=body.review_status or "VERIFIED",
    )
    db.add(rec)
    db.flush()

    log_action(
        db,
        u.id,
        "TRANSFORMER_INSPECTION_RECORDED",
        "inspection_records",
        rec.id,
        f"tr={tr.utility_asset_code} wo={body.work_order_id or ''} status={rec.review_status}",
    )
    db.commit()
    db.refresh(rec)
    return _inspection_out(rec)


@router.get("/{transformer_id}/inspections", summary="List field inspection records for a transformer")
def list_field_inspections(
    transformer_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()
    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")
    _check_read_access(u, tr, db=db)

    records = (
        db.query(InspectionRecord)
        .filter(InspectionRecord.transformer_id == tr.id)
        .order_by(InspectionRecord.verified_at.desc())
        .all()
    )
    return {
        "transformer_id": tr.id,
        "utility_asset_code": tr.utility_asset_code,
        "total": len(records),
        "items": [_inspection_out(r) for r in records],
    }

# ---------------------------------------------------------------------------
# Management Analytics & Fleet Health (Step 7)
# ---------------------------------------------------------------------------
@analytics_router.get("/summary", summary="Aggregated fleet health and predictive risk analytics (Officer, Admin)")
def get_analytics_summary(
    zone: str | None = Query(default=None, description="Filter by zone (Admin only)"),
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("officer", "admin")),
):

    q = db.query(TransformerAsset)
    effective_zone: str | None = None

    if u.role == "officer":
        effective_zone = (u.zone or "").strip()
        q = q.filter(func.lower(TransformerAsset.zone) == effective_zone.lower())
    elif u.role == "admin":
        if zone and zone.strip():
            effective_zone = zone.strip()
            q = q.filter(func.lower(TransformerAsset.zone) == effective_zone.lower())

    transformers = q.all()
    tr_ids = [t.id for t in transformers]

    # Status breakdown
    status_counts = {"IN_SERVICE": 0, "MAINTENANCE": 0, "FAULT": 0, "RETIRED": 0}
    for t in transformers:
        st = (t.status or "IN_SERVICE").upper()
        status_counts[st] = status_counts.get(st, 0) + 1

    # Active alerts summary
    alerts_summary = {
        "total_active": 0,
        "critical": 0,
        "warning": 0,
        "by_type": {
            "OVERLOAD": 0,
            "OIL_TEMP_HIGH": 0,
            "WINDING_TEMP_HIGH": 0,
            "HIGH_VIBRATION": 0,
        },
    }

    alerts = []
    if tr_ids:
        alerts = (
            db.query(TransformerAlert)
            .filter(
                TransformerAlert.transformer_id.in_(tr_ids),
                TransformerAlert.status.in_(["ACTIVE", "ACKNOWLEDGED"]),
            )
            .all()
        )

    for a in alerts:
        alerts_summary["total_active"] += 1
        if a.severity == "CRITICAL":
            alerts_summary["critical"] += 1
        elif a.severity == "WARN":
            alerts_summary["warning"] += 1
        at = a.alert_type
        if at in alerts_summary["by_type"]:
            alerts_summary["by_type"][at] += 1
        else:
            alerts_summary["by_type"][at] = 1

    # Predictive risk baseline across fleet
    high_risk_count = 0
    med_risk_count = 0
    low_risk_count = 0
    risk_scores: list[float] = []
    risk_evals: list[dict[str, Any]] = []

    for t in transformers:
        risk_data = calculate_transformer_risk(db, t)
        prob = float(risk_data["risk_probability"])
        risk_scores.append(prob)
        if prob >= 0.70:
            high_risk_count += 1
        elif prob >= 0.35:
            med_risk_count += 1
        else:
            low_risk_count += 1

        risk_evals.append({
            "transformer_id": t.id,
            "utility_asset_code": t.utility_asset_code,
            "zone": t.zone,
            "rated_kva": t.rated_kva,
            "status": t.status,
            "risk_probability": prob,
            "risk_level": risk_data["risk_level"],
            "prediction_horizon": risk_data["prediction_horizon"],
            "top_explanation": risk_data["explanation"][0] if risk_data["explanation"] else "Nominal",
            "recommended_review": risk_data["recommended_review"],
        })

    risk_evals.sort(key=lambda x: x["risk_probability"], reverse=True)
    top_risk_transformers = risk_evals[:5]

    if risk_scores:
        avg_risk = sum(risk_scores) / len(risk_scores)
        fleet_health_index = round(max(0.0, min(100.0, (1.0 - avg_risk) * 100.0)), 1)
    else:
        fleet_health_index = 100.0

    zone_breakdown: dict[str, dict[str, Any]] = {}
    for r in risk_evals:
        z = r["zone"] or "Unassigned"
        if z not in zone_breakdown:
            zone_breakdown[z] = {"total": 0, "high_risk": 0, "in_service": 0}
        zone_breakdown[z]["total"] += 1
        if r["risk_probability"] >= 0.70:
            zone_breakdown[z]["high_risk"] += 1
        if r["status"] == "IN_SERVICE":
            zone_breakdown[z]["in_service"] += 1

    return {
        "scope_zone": effective_zone,
        "zone_filter": effective_zone,
        "total_transformers": len(transformers),
        "status_counts": status_counts,
        "alerts_summary": alerts_summary,
        "risk_distribution": {
            "high_risk": high_risk_count,
            "medium_risk": med_risk_count,
            "low_risk": low_risk_count,
        },
        "fleet_health_index": fleet_health_index,
        "zone_breakdown": zone_breakdown,
        "top_risk_transformers": top_risk_transformers,
    }


# ---------------------------------------------------------------------------
# Alert Policies (Admin Only, Audited) (Step 7)
# ---------------------------------------------------------------------------
@policies_router.get("", summary="List alert policy versions (Admin only)")
def list_policies(
    transformer_class: str | None = Query(default=None, description="Filter by transformer class"),
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("admin")),
):
    q = db.query(AlertPolicyVersion)
    if transformer_class and transformer_class.strip():
        q = q.filter(func.lower(AlertPolicyVersion.transformer_class) == transformer_class.strip().lower())

    policies = q.order_by(AlertPolicyVersion.effective_from.desc()).all()
    return {
        "total": len(policies),
        "items": [
            {
                "id": p.id,
                "transformer_class": p.transformer_class,
                "version": p.version,
                "thresholds": json.loads(p.thresholds) if isinstance(p.thresholds, str) else p.thresholds,
                "source_evidence": p.source_evidence,
                "effective_from": p.effective_from.isoformat() if p.effective_from else None,
                "approved_by": p.approved_by,
            }
            for p in policies
        ],
    }


@policies_router.post(
    "",
    status_code=http_status.HTTP_201_CREATED,
    summary="Create new alert policy version (Admin only, Audited)",
)
def create_policy(
    body: PolicyCreate,
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("admin")),
):
    t_class = sanitize_untrusted_text(body.transformer_class)
    v_str = sanitize_untrusted_text(body.version)
    evidence = sanitize_untrusted_text(body.source_evidence)
    thresholds_json = json.dumps(body.thresholds) if not isinstance(body.thresholds, str) else body.thresholds

    pol = AlertPolicyVersion(
        id=str(uuid.uuid4()),
        transformer_class=t_class,
        version=v_str,
        thresholds=thresholds_json,
        source_evidence=evidence,
        effective_from=now_utc(),
        approved_by=u.id,
    )
    db.add(pol)
    db.flush()

    log_action(
        db,
        u.id,
        "TRANSFORMER_POLICY_CREATED",
        "alert_policy_versions",
        pol.id,
        f"class={t_class} v={v_str}",
    )
    db.commit()
    db.refresh(pol)

    return {
        "id": pol.id,
        "transformer_class": pol.transformer_class,
        "version": pol.version,
        "thresholds": body.thresholds,
        "source_evidence": pol.source_evidence,
        "effective_from": pol.effective_from.isoformat() if pol.effective_from else None,
        "approved_by": pol.approved_by,
    }


class RiskModelModeBody(BaseModel):
    mode: str = Field(..., description="'ml_advisory' or 'rules_baseline'")


@policies_router.get("/risk-model-mode", summary="Get transformer predictive risk model mode (Officer, Admin)")
def get_risk_model_mode(
    u: User = Depends(require_transformer_role("officer", "admin")),
):
    return {"mode": getattr(settings, "transformer_risk_mode", "ml_advisory")}


@policies_router.post("/risk-model-mode", summary="Toggle transformer predictive risk model mode (Admin only, Audited)")
def set_risk_model_mode(
    body: RiskModelModeBody,
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("admin")),
):
    mode = body.mode.strip().lower()
    if mode not in ("ml_advisory", "rules_baseline"):
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid mode; must be 'ml_advisory' or 'rules_baseline'",
        )
    settings.transformer_risk_mode = mode
    log_action(
        db,
        u.id,
        "RISK_MODEL_MODE_UPDATED",
        "settings",
        "transformer_risk_mode",
        f"mode={mode}",
    )
    db.commit()
    return {"status": "ok", "mode": settings.transformer_risk_mode}


# ---------------------------------------------------------------------------
# Maintenance Work Orders & Predictive Assessments (Step 7)
# ---------------------------------------------------------------------------
@router.post(
    "/{transformer_id}/maintenance-work-orders",
    status_code=http_status.HTTP_201_CREATED,
    summary="Create maintenance work order for transformer (Officer, Admin)",
)
def create_maintenance_work_order(
    transformer_id: str,
    body: MaintenanceWorkOrderCreate,
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("officer", "admin")),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()
    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")

    if u.role == "officer":
        user_zone = (u.zone or "").strip().lower()
        tr_zone = (tr.zone or "").strip().lower()
        if user_zone != tr_zone:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: cannot create work order for '{tr.zone}' transformer outside your assigned '{u.zone}' zone",
            )

    assigned_engineer: User | None = None
    if body.assigned_engineer_id:
        assigned_engineer = db.query(User).filter(User.id == body.assigned_engineer_id).first()
        if not assigned_engineer or assigned_engineer.role != "engineer":
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Assigned user must be an active engineer",
            )
        eng_zone = (assigned_engineer.zone or "").strip().lower()
        tr_zone = (tr.zone or "").strip().lower()
        if eng_zone != tr_zone:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Assigned engineer '{assigned_engineer.name}' belongs to '{assigned_engineer.zone}', not transformer zone '{tr.zone}'",
            )

    wo_id = f"WO-TR-{tr.utility_asset_code}-{uuid.uuid4().hex[:6].upper()}"

    checklist_dict = {
        "work_order_type": body.work_order_type,
        "priority": body.priority,
        "recommended_action": sanitize_untrusted_text(body.recommended_action) if body.recommended_action else None,
        "created_by": u.id,
    }

    rec = InspectionRecord(
        id=str(uuid.uuid4()),
        transformer_id=tr.id,
        work_order_id=wo_id,
        assigned_to=assigned_engineer.id if assigned_engineer else u.id,
        checklist=json.dumps(checklist_dict),
        observations=sanitize_untrusted_text(body.description) if body.description else None,
        photo_refs=json.dumps([]),
        verified_at=None,
        gps_accuracy=None,
        signature=None,
        review_status="PENDING",
    )
    db.add(rec)

    if body.priority == "CRITICAL" and tr.status == "IN_SERVICE":
        tr.status = "MAINTENANCE"
        tr.updated_at = now_utc()

    log_action(
        db,
        u.id,
        "TRANSFORMER_WORK_ORDER_CREATED",
        "transformers_asset",
        tr.id,
        f"wo={wo_id} type={body.work_order_type} prio={body.priority} tr={tr.utility_asset_code}",
    )
    db.commit()

    return {
        "work_order_id": wo_id,
        "transformer_id": tr.id,
        "utility_asset_code": tr.utility_asset_code,
        "zone": tr.zone,
        "work_order_type": body.work_order_type,
        "priority": body.priority,
        "status": "DISPATCHED" if assigned_engineer else "PENDING_ASSIGNMENT",
        "assigned_engineer_id": assigned_engineer.id if assigned_engineer else None,
        "description": body.description,
        "recommended_action": body.recommended_action,
        "created_at": now_utc().isoformat(),
        "created_by": u.id,
    }


@router.post(
    "/{transformer_id}/assessments",
    status_code=http_status.HTTP_201_CREATED,
    summary="Evaluate and record predictive risk baseline assessment (Officer, Admin)",
)
def create_risk_assessment(
    transformer_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("officer", "admin")),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()
    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")
    _check_read_access(u, tr, db=db)

    assessment = assess_and_persist_transformer_risk(db, tr, u)
    log_action(
        db,
        u.id,
        "TRANSFORMER_RISK_ASSESSED",
        "maintenance_assessments",
        assessment.id,
        f"tr={tr.utility_asset_code} risk={assessment.risk_probability} horizon={assessment.prediction_horizon}",
    )
    db.commit()
    db.refresh(assessment)
    return _assessment_out(assessment, tr)


@router.get("/{transformer_id}/assessments", summary="List predictive risk assessments for a transformer")
def list_risk_assessments(
    transformer_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()
    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")
    _check_read_access(u, tr, db=db)

    records = (
        db.query(MaintenanceAssessment)
        .filter(MaintenanceAssessment.transformer_id == tr.id)
        .order_by(MaintenanceAssessment.generated_at.desc())
        .all()
    )
    return {
        "transformer_id": tr.id,
        "utility_asset_code": tr.utility_asset_code,
        "total": len(records),
        "items": [_assessment_out(a, tr) for a in records],
    }


class AssessmentDecisionBody(BaseModel):
    decision: str = Field(..., description="ACCEPTED, REJECTED, or MODIFIED")
    decision_notes: str | None = Field(default=None, description="Notes from reviewing officer")


@router.post(
    "/{transformer_id}/assessments/{assessment_id}/decision",
    summary="Record human-in-the-loop decision on predictive assessment (Officer, Admin, Audited)",
)
def record_assessment_decision(
    transformer_id: str,
    assessment_id: str,
    body: AssessmentDecisionBody,
    db: Session = Depends(get_db),
    u: User = Depends(require_transformer_role("officer", "admin")),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()
    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")
    _check_read_access(u, tr, db=db)

    assessment = db.query(MaintenanceAssessment).filter(
        MaintenanceAssessment.id == assessment_id,
        MaintenanceAssessment.transformer_id == tr.id,
    ).first()
    if not assessment:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    valid_decisions = {"ACCEPTED", "REJECTED", "MODIFIED"}
    dec = body.decision.strip().upper()
    if dec not in valid_decisions:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid decision '{body.decision}'. Must be one of: {', '.join(sorted(valid_decisions))}",
        )

    assessment.human_decision = dec
    notes = sanitize_untrusted_text(body.decision_notes or "")
    log_action(
        db,
        u.id,
        "ASSESSMENT_DECISION_RECORDED",
        "maintenance_assessments",
        assessment.id,
        f"decision={dec} tr={tr.utility_asset_code} notes={notes[:60]}",
    )
    db.commit()
    db.refresh(assessment)
    return _assessment_out(assessment, tr)


@router.get("/{transformer_id}/health", summary="Get transformer health and latest assessment (Officer, Engineer, Admin)")
def get_transformer_health(
    transformer_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()
    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")
    _check_read_access(u, tr, db=db)

    sensors = (
        db.query(TransformerSensor)
        .filter(TransformerSensor.transformer_id == tr.id, TransformerSensor.active == True)
        .all()
    )

    latest_assessment = (
        db.query(MaintenanceAssessment)
        .filter(MaintenanceAssessment.transformer_id == tr.id)
        .order_by(MaintenanceAssessment.generated_at.desc())
        .first()
    )
    if not latest_assessment:
        latest_assessment = assess_and_persist_transformer_risk(db, tr, u)

    data_freshness = "DEMO" if tr.utility_asset_code.startswith("DEMO-") else ("LIVE" if len(sensors) > 0 else "NO_DATA")
    risk_prob = float(latest_assessment.risk_probability or 0.0)
    health_score = round(max(0.0, min(100.0, 100.0 - (risk_prob * 100.0))), 1)

    if risk_prob >= 0.75:
        risk_band = "CRITICAL"
    elif risk_prob >= 0.50:
        risk_band = "HIGH"
    elif risk_prob >= 0.25:
        risk_band = "MEDIUM"
    else:
        risk_band = "LOW"

    return {
        "transformer_id": tr.id,
        "utility_asset_code": tr.utility_asset_code,
        "zone": tr.zone,
        "health_score": health_score,
        "risk_band": risk_band,
        "risk_probability": risk_prob,
        "model_version": latest_assessment.model_version,
        "dataFreshness": data_freshness,
        "data_freshness": data_freshness,
        "active_sensor_count": len(sensors),
        "assessment": _assessment_out(latest_assessment, tr),
    }


@router.get("/{transformer_id}/maintenance-history", summary="Unified history of assessments, inspections, and alerts (Officer, Engineer, Admin)")
def get_maintenance_history(
    transformer_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()
    if not tr:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Transformer asset not found")
    _check_read_access(u, tr, db=db)

    history_items = []

    assessments = (
        db.query(MaintenanceAssessment)
        .filter(MaintenanceAssessment.transformer_id == tr.id)
        .order_by(MaintenanceAssessment.generated_at.desc())
        .limit(50)
        .all()
    )
    for a in assessments:
        history_items.append({
            "type": "ASSESSMENT",
            "id": a.id,
            "timestamp": a.generated_at.isoformat() if a.generated_at else None,
            "summary": f"Risk assessment ({a.model_version}): {a.prediction_horizon} horizon, risk={a.risk_probability}",
            "human_decision": a.human_decision,
            "details": {
                "prediction_horizon": a.prediction_horizon,
                "risk_probability": a.risk_probability,
                "uncertainty": a.uncertainty,
                "model_version": a.model_version,
            },
        })

    inspections = (
        db.query(InspectionRecord)
        .filter(InspectionRecord.transformer_id == tr.id)
        .order_by(InspectionRecord.verified_at.desc())
        .limit(50)
        .all()
    )
    for ins in inspections:
        history_items.append({
            "type": "INSPECTION",
            "id": ins.id,
            "timestamp": ins.verified_at.isoformat() if ins.verified_at else None,
            "summary": f"Field inspection by staff: {ins.review_status}",
            "status": ins.review_status,
            "details": {
                "work_order_id": ins.work_order_id,
                "observations": ins.observations,
                "gps_accuracy": ins.gps_accuracy,
            },
        })

    alerts = (
        db.query(TransformerAlert)
        .filter(TransformerAlert.transformer_id == tr.id)
        .order_by(TransformerAlert.first_seen_at.desc())
        .limit(50)
        .all()
    )
    for al in alerts:
        history_items.append({
            "type": "ALERT",
            "id": al.id,
            "timestamp": al.first_seen_at.isoformat() if al.first_seen_at else None,
            "summary": f"[{al.severity}] {al.alert_type} ({al.status})",
            "status": al.status,
            "details": {
                "alert_type": al.alert_type,
                "severity": al.severity,
                "status": al.status,
                "threshold_version": al.threshold_version,
            },
        })

    history_items.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    return {
        "transformer_id": tr.id,
        "utility_asset_code": tr.utility_asset_code,
        "total": len(history_items),
        "items": history_items,
    }
