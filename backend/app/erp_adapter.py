"""Simulated Discom ERP outbound webhook adapter (Item #16).

Transforms VidyutFlow `ConnectionRequest` rows into a canonical SAP IS-U-style utility
service-order payload, logs every outbound delivery in `erp_sync_logs`, parks failed
handoffs in a dead-letter queue (`status == "FAILED"`), and supports operator retry
with full hash-chained audit logging.

Honesty boundary: this adapter runs against an internal deterministic mock transport;
it is NOT connected to live UGVCL SAP / billing servers.
"""
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from .audit import audit
from .models import ConnectionRequest, ErpSyncLog, User

ERP_ADAPTER_DISCLOSURE = (
    "Simulated Discom ERP webhook adapter for demonstration only — maps VidyutFlow "
    "service requests into a canonical SAP IS-U-style payload with dead-letter queueing "
    "and retry. Not connected to live UGVCL production ERP or billing systems."
)

ERP_TARGET_SYSTEM = "Simulated Discom ERP / Billing Adapter (SAP IS-U-style JSON contract)"

ERP_FIELD_MAPPINGS = [
    {
        "source_field": "id",
        "erp_field": "EXT_SERVICE_ORDER_ID",
        "transform_rule": "UUIDv4 string preserved verbatim as external idempotency key",
        "required_on": "ALL",
    },
    {
        "source_field": "applicant_name",
        "erp_field": "BP_PARTNER_FULL_NAME",
        "transform_rule": "Trimmed UTF-8 consumer / entity legal name",
        "required_on": "ALL",
    },
    {
        "source_field": "phone",
        "erp_field": "BP_PRIMARY_MOBILE_IN",
        "transform_rule": "10 ASCII digits formatted as +91-<digits>",
        "required_on": "ALL",
    },
    {
        "source_field": "zone",
        "erp_field": "DISCOM_CIRCLE_CODE",
        "transform_rule": "North -> UGVCL-CIR-N01 · South -> UGVCL-CIR-S02 · else UGVCL-CIR-GEN",
        "required_on": "ALL",
    },
    {
        "source_field": "tariff_category",
        "erp_field": "ISU_RATE_CATEGORY",
        "transform_rule": "RGPU -> LT_DOM_RGPU · NRGP -> LT_COM_NRGP · else LT_GEN_TARIFF",
        "required_on": "ALL",
    },
    {
        "source_field": "phase",
        "erp_field": "SUPPLY_PHASE_CODE",
        "transform_rule": "3-Phase -> 3P_415V_AC · else 1P_230V_AC",
        "required_on": "ALL",
    },
    {
        "source_field": "requested_load_kw",
        "erp_field": "CONTRACTED_LOAD_KW",
        "transform_rule": "Finite positive float rounded to 2 decimal places",
        "required_on": "ALL",
    },
    {
        "source_field": "status",
        "erp_field": "ISU_WORKFLOW_STAGE",
        "transform_rule": "APPROVED -> SANCTION_RELEASED · COMPLETED -> METER_COMMISSIONED · else IN_REVIEW",
        "required_on": "ALL",
    },
    {
        "source_field": "meter_serial",
        "erp_field": "ISU_DEVICE_SERIAL_NO",
        "transform_rule": "Installed smart-meter serial; mandatory when status == COMPLETED",
        "required_on": "COMPLETED",
    },
    {
        "source_field": "updated_at",
        "erp_field": "EVENT_UTC_TIMESTAMP",
        "transform_rule": "ISO-8601 UTC timestamp",
        "required_on": "ALL",
    },
]


def _map_circle_code(zone: str) -> str:
    z = (zone or "").strip().lower()
    if z == "north":
        return "UGVCL-CIR-N01"
    if z == "south":
        return "UGVCL-CIR-S02"
    return "UGVCL-CIR-GEN"


def _map_rate_category(tariff: str) -> str:
    t = (tariff or "").upper()
    if "RGPU" in t or "RESIDENTIAL" in t:
        return "LT_DOM_RGPU"
    if "NRGP" in t or "COMMERCIAL" in t:
        return "LT_COM_NRGP"
    return "LT_GEN_TARIFF"


def _map_phase_code(phase: str) -> str:
    return "3P_415V_AC" if "3" in (phase or "") else "1P_230V_AC"


def _map_workflow_stage(status: str) -> str:
    if status == "APPROVED":
        return "SANCTION_RELEASED"
    if status == "COMPLETED":
        return "METER_COMMISSIONED"
    return "IN_REVIEW"


def build_erp_payload(r: ConnectionRequest) -> tuple[dict, list[str]]:
    errors: list[str] = []
    digits = (r.phone or "").strip()
    if not (len(digits) == 10 and digits.isascii() and digits.isdigit()):
        errors.append("BP_PRIMARY_MOBILE_IN requires a valid 10-digit ASCII phone number")

    meter_serial = (r.meter_serial or "").strip()
    if r.status == "COMPLETED" and not meter_serial:
        errors.append(
            "Missing required ERP field ISU_DEVICE_SERIAL_NO (meter_serial) for COMPLETED commissioning handoff"
        )

    ts = r.updated_at or r.created_at or datetime.now(timezone.utc)
    iso_ts = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)

    payload = {
        "EXT_SERVICE_ORDER_ID": r.id,
        "BP_PARTNER_FULL_NAME": (r.applicant_name or "").strip(),
        "BP_PRIMARY_MOBILE_IN": f"+91-{digits}" if len(digits) == 10 else digits,
        "DISCOM_CIRCLE_CODE": _map_circle_code(r.zone),
        "ISU_RATE_CATEGORY": _map_rate_category(r.tariff_category),
        "SUPPLY_PHASE_CODE": _map_phase_code(r.phase),
        "CONTRACTED_LOAD_KW": round(float(r.requested_load_kw or 0.0), 2),
        "ISU_WORKFLOW_STAGE": _map_workflow_stage(r.status),
        "ISU_DEVICE_SERIAL_NO": meter_serial,
        "EVENT_UTC_TIMESTAMP": iso_ts,
        "_adapter_simulated": True,
    }
    return payload, errors


def _make_erp_ref(r: ConnectionRequest, attempt: int) -> str:
    circle = _map_circle_code(r.zone).split("-")[-1]
    return f"SIM-ERP-{circle}-{r.id[:8].upper()}-{attempt}"


def record_erp_sync(
    db: Session,
    r: ConnectionRequest,
    actor: User | None,
    event_type: str,
    *,
    simulate_failure: bool = False,
) -> ErpSyncLog:
    """Transform `r` and record an `ErpSyncLog` row + hash-chained `AuditLog` entry.
    Does not call `db.commit()` so callers can commit atomically with workflow mutations."""
    payload, errors = build_erp_payload(r)
    now_dt = datetime.now(timezone.utc)

    if simulate_failure:
        status = "FAILED"
        err_msg = "Simulated ERP gateway timeout (HTTP 503) — queued in failed-sync log for operator retry"
        erp_ref = ""
        synced_at = None
    elif errors:
        status = "FAILED"
        err_msg = "; ".join(errors)
        erp_ref = ""
        synced_at = None
    else:
        status = "SYNCED"
        err_msg = ""
        erp_ref = _make_erp_ref(r, 1)
        synced_at = now_dt

    log = ErpSyncLog(
        request_id=r.id,
        event_type=event_type,
        status=status,
        attempt_count=1,
        erp_reference_id=erp_ref,
        mapped_payload_json=json.dumps(payload, sort_keys=True),
        error_message=err_msg,
        last_attempt_at=now_dt,
        synced_at=synced_at,
    )
    db.add(log)
    db.flush()

    audit_action = "ERP_SYNC_SUCCEEDED" if status == "SYNCED" else "ERP_SYNC_FAILED"
    audit(
        db,
        actor,
        audit_action,
        "erp_sync",
        log.id,
        f"req={r.id} event={event_type} status={status}" + (f" err={err_msg[:80]}" if err_msg else f" ref={erp_ref}"),
    )
    return log


def retry_failed_erp_sync(
    db: Session,
    log: ErpSyncLog,
    r: ConnectionRequest,
    actor: User,
    *,
    meter_serial_override: str = "",
) -> ErpSyncLog:
    """Retry a FAILED ERP sync entry against current `ConnectionRequest` state."""
    cleaned_meter = meter_serial_override.strip()
    if cleaned_meter and not (r.meter_serial or "").strip():
        r.meter_serial = cleaned_meter
        db.flush()

    payload, errors = build_erp_payload(r)
    now_dt = datetime.now(timezone.utc)
    log.attempt_count = int(log.attempt_count or 1) + 1
    log.last_attempt_at = now_dt
    log.mapped_payload_json = json.dumps(payload, sort_keys=True)

    if errors:
        log.status = "FAILED"
        log.error_message = "; ".join(errors)
        audit(
            db,
            actor,
            "ERP_SYNC_RETRY_FAILED",
            "erp_sync",
            log.id,
            f"req={r.id} attempt={log.attempt_count} err={log.error_message[:80]}",
        )
    else:
        log.status = "SYNCED"
        log.error_message = ""
        log.erp_reference_id = _make_erp_ref(r, log.attempt_count)
        log.synced_at = now_dt
        audit(
            db,
            actor,
            "ERP_SYNC_RETRIED",
            "erp_sync",
            log.id,
            f"req={r.id} attempt={log.attempt_count} ref={log.erp_reference_id}",
        )
    return log


def serialize_erp_log(log: ErpSyncLog, r: ConnectionRequest | None = None) -> dict:
    try:
        mapped = json.loads(log.mapped_payload_json or "{}")
    except Exception:
        mapped = {}
    return {
        "id": log.id,
        "request_id": log.request_id,
        "applicant_name": r.applicant_name if r else mapped.get("BP_PARTNER_FULL_NAME", ""),
        "zone": r.zone if r else "",
        "request_status": r.status if r else "",
        "event_type": log.event_type,
        "status": log.status,
        "attempt_count": log.attempt_count,
        "erp_reference_id": log.erp_reference_id,
        "mapped_payload": mapped,
        "error_message": log.error_message,
        "last_attempt_at": log.last_attempt_at,
        "synced_at": log.synced_at,
        "created_at": log.created_at,
        "is_simulated": True,
    }
