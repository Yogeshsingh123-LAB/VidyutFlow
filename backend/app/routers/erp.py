"""ERP adapter REST router (Item #16): field mappings, sync log, failed queue, and retry."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..access import require_request_access, visible_requests
from ..db import get_db
from ..deps import require
from ..erp_adapter import (
    ERP_ADAPTER_DISCLOSURE,
    ERP_FIELD_MAPPINGS,
    ERP_TARGET_SYSTEM,
    record_erp_sync,
    retry_failed_erp_sync,
    serialize_erp_log,
)
from ..models import ConnectionRequest, ErpSyncLog, User
from ..perf import kpi_cache

router = APIRouter(prefix="/erp", tags=["erp"])


class ManualErpSyncRequest(BaseModel):
    simulate_failure: bool = False


class RetryErpSyncRequest(BaseModel):
    meter_serial: str = ""


@router.get("/mappings")
def get_erp_mappings(u: User = Depends(require("officer", "admin"))):
    """Return canonical VidyutFlow -> ERP field mapping specification and simulation disclosure."""
    return {
        "adapter_mode": "simulated_webhook",
        "is_simulated": True,
        "target_system": ERP_TARGET_SYSTEM,
        "disclosure": ERP_ADAPTER_DISCLOSURE,
        "mappings": ERP_FIELD_MAPPINGS,
    }


@router.get("/logs")
def list_erp_logs(
    status: str = Query("ALL", description="Filter by ALL, SYNCED, or FAILED"),
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """List ERP sync logs & failed-sync dead-letter queue (zone-scoped for officers)."""
    normalized_status = (status or "ALL").strip().upper()
    if normalized_status not in ("ALL", "SYNCED", "FAILED"):
        raise HTTPException(400, "status must be ALL, SYNCED, or FAILED")

    base_q = db.query(ErpSyncLog)
    if u.role == "officer":
        visible_ids = visible_requests(db, u).with_entities(ConnectionRequest.id)
        base_q = base_q.filter(ErpSyncLog.request_id.in_(visible_ids))

    all_rows = base_q.order_by(ErpSyncLog.created_at.desc()).limit(200).all()
    total = len(all_rows)
    synced_count = sum(1 for row in all_rows if row.status == "SYNCED")
    failed_count = sum(1 for row in all_rows if row.status == "FAILED")

    filtered_rows = (
        all_rows
        if normalized_status == "ALL"
        else [row for row in all_rows if row.status == normalized_status]
    )

    req_ids = {row.request_id for row in filtered_rows}
    req_by_id = (
        {
            r.id: r
            for r in db.query(ConnectionRequest)
            .filter(ConnectionRequest.id.in_(req_ids))
            .all()
        }
        if req_ids
        else {}
    )

    return {
        "is_simulated": True,
        "disclosure": ERP_ADAPTER_DISCLOSURE,
        "summary": {
            "total": total,
            "synced": synced_count,
            "failed_queue": failed_count,
        },
        "items": [serialize_erp_log(row, req_by_id.get(row.request_id)) for row in filtered_rows],
    }


@router.post("/sync/{request_id}")
def trigger_erp_sync(
    request_id: str,
    body: ManualErpSyncRequest = ManualErpSyncRequest(),
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Trigger an outbound ERP adapter sync for a visible service request."""
    r = db.get(ConnectionRequest, request_id)
    if not r:
        raise HTTPException(404, "Request not found")
    require_request_access(db, u, r)

    log = record_erp_sync(
        db,
        r,
        u,
        "MANUAL_SYNC",
        simulate_failure=body.simulate_failure,
    )
    db.commit()
    kpi_cache.bump_epoch()
    db.refresh(log)
    return serialize_erp_log(log, r)


@router.post("/logs/{log_id}/retry")
def retry_erp_log(
    log_id: str,
    body: RetryErpSyncRequest = RetryErpSyncRequest(),
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Retry a FAILED ERP sync log entry and record the outcome in the hash-chained audit log."""
    log = db.get(ErpSyncLog, log_id)
    if not log:
        raise HTTPException(404, "ERP sync log entry not found")

    r = db.get(ConnectionRequest, log.request_id)
    if not r:
        raise HTTPException(404, "Associated request not found")
    require_request_access(db, u, r)

    if log.status == "SYNCED":
        raise HTTPException(409, "ERP sync entry is already SYNCED")

    retry_failed_erp_sync(
        db,
        log,
        r,
        u,
        meter_serial_override=body.meter_serial,
    )
    db.commit()
    kpi_cache.bump_epoch()
    db.refresh(log)
    return serialize_erp_log(log, r)


# ---------------------------------------------------------------------------
# Simulated SAP S/4HANA IS-U OData v4 ServiceOrder Gateway
# ---------------------------------------------------------------------------
class SapInboundAckPayload(BaseModel):
    request_id: str
    sap_order_no: str
    equipment_meter_no: str = ""
    posting_status: str = "POSTED_IN_SAP_ISU"


@router.get("/sap-odata/metadata")
def sap_odata_metadata(u: User = Depends(require("officer", "admin"))):
    """Simulated SAP S/4HANA IS-U OData v4 $metadata contract for ServiceOrders & MeterInstallations."""
    return {
        "@odata.version": "4.0",
        "is_simulated": True,
        "namespace": "ZUGVCL_ISU_SRV",
        "disclosure": ERP_ADAPTER_DISCLOSURE,
        "entity_sets": [
            {
                "name": "ServiceOrders",
                "entity_type": "ZUGVCL_ISU_SRV.ServiceOrder",
                "keys": ["AUFNR"],
                "properties": [
                    "AUFNR",
                    "EXTERNAL_REQ_ID",
                    "PARTNER_NAME",
                    "WERKS_ZONE",
                    "TARIFTYP",
                    "SANCTIONED_KW",
                    "EQUNR_METER",
                    "PRIOK",
                    "SYSTEM_STATUS",
                    "SYNC_STATUS",
                ],
            }
        ],
    }


@router.get("/sap-odata/ServiceOrders")
def sap_odata_service_orders(
    top: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Expose visible VidyutFlow requests as SAP S/4HANA IS-U OData v4 `ServiceOrder` entities."""
    rows = visible_requests(db, u).order_by(ConnectionRequest.created_at.desc()).limit(top).all()
    prio_map = {"CRITICAL": "1", "HIGH": "2", "MEDIUM": "3", "LOW": "4"}
    values = []
    for r in rows:
        values.append(
            {
                "AUFNR": f"400{r.id.replace('-', '')[:9].upper()}",
                "EXTERNAL_REQ_ID": r.id,
                "PARTNER_NAME": r.applicant_name,
                "WERKS_ZONE": f"UGVCL-{r.zone.upper()}",
                "TARIFTYP": r.tariff_category,
                "SANCTIONED_KW": r.requested_load_kw,
                "EQUNR_METER": r.meter_serial or "",
                "PRIOK": prio_map.get(r.severity, "3"),
                "SYSTEM_STATUS": r.status,
                "UPDATED_AT": r.updated_at.isoformat() if r.updated_at else None,
            }
        )
    return {
        "@odata.context": "$metadata#ServiceOrders",
        "@odata.count": len(values),
        "is_simulated": True,
        "disclosure": ERP_ADAPTER_DISCLOSURE,
        "value": values,
    }


@router.post("/sap-odata/ServiceOrders/inbound-ack")
def sap_odata_inbound_ack(
    body: SapInboundAckPayload,
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Receive simulated inbound SAP IS-U order/meter confirmation and record in ErpSyncLog."""
    r = db.get(ConnectionRequest, body.request_id)
    if not r:
        raise HTTPException(404, "Request not found")
    require_request_access(db, u, r)
    if body.equipment_meter_no.strip() and not r.meter_serial:
        r.meter_serial = body.equipment_meter_no.strip()[:64]
    log = record_erp_sync(db, r, u, f"SAP_ODATA_INBOUND:{body.posting_status[:24]}")
    log.erp_reference_id = body.sap_order_no.strip()[:64]
    db.commit()
    kpi_cache.bump_epoch()
    db.refresh(log)
    return {
        "acknowledged": True,
        "is_simulated": True,
        "sap_order_no": log.erp_reference_id,
        "sync_log": serialize_erp_log(log, r),
    }

