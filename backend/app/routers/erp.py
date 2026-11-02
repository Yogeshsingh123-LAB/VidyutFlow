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


def _expected_heterogeneous_targets(r: ConnectionRequest) -> list[dict]:
    req_short = r.id.replace("-", "")[:8].upper()
    deposit_inr = round(max(1.0, float(r.requested_load_kw or 1.0)) * 1200.0, 2)
    return [
        {
            "system_code": "SAP_S4_FICA_ISU",
            "system_name": "SAP S/4HANA Finance (FI-CA) & IS-U Work Management",
            "protocol": "OData v4 (/sap/opu/odata4/ugvcl/isu_srv_order/v4)",
            "external_ref": f"AUFNR-400{req_short}",
            "canonical_fields": {
                "VKONT_CONTRACT_ACCT": f"CA-{r.zone[:2].upper()}-{req_short}",
                "SECURITY_DEPOSIT_INR": deposit_inr,
                "WERKS_PLANT": f"UGVCL-{r.zone.upper()}",
                "EQUNR_METER": r.meter_serial or "PENDING_COMMISSION",
                "SYSTEM_STATUS": r.status,
            },
        },
        {
            "system_code": "E_URJA_CIS_BILLING",
            "system_name": "UGVCL e-Urja Consumer Information & Billing Engine",
            "protocol": "REST JSON (/cis/v2/consumer-master)",
            "external_ref": f"CIS-{r.zone[:1].upper()}-{req_short}",
            "canonical_fields": {
                "CONSUMER_NAME": r.applicant_name,
                "TARIFF_SLAB": r.tariff_category,
                "SANCTIONED_LOAD_KW": r.requested_load_kw,
                "PHASE": r.phase,
                "BILLING_READY": r.status == "COMPLETED" and bool(r.meter_serial),
            },
        },
        {
            "system_code": "GUVNL_1912_CRM",
            "system_name": "UGVCL / GUVNL 1912 Consumer Grievance & SLA Portal",
            "protocol": "Webhook EventBridge (/crm/v1/tickets/events)",
            "external_ref": f"CRM1912-{req_short}",
            "canonical_fields": {
                "REQUEST_CATEGORY": r.category,
                "SEVERITY": r.severity,
                "SLA_RISK_SCORE": round(float(r.sla_breach_risk or 0.0), 3),
                "LIFECYCLE_STATUS": r.status,
            },
        },
    ]


@router.post("/gateway/propagate/{request_id}")
def propagate_across_heterogeneous_systems(
    request_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """API Gateway Fan-Out ('Enter Once, Propagate Everywhere'):
    Syncs one canonical VidyutFlow request across SAP S/4HANA FI-CA/IS-U, e-Urja CIS Billing,
    and GUVNL 1912 Grievance CRM without replacing existing DISCOM systems or re-typing fields.
    """
    from ..audit import audit

    r = db.get(ConnectionRequest, request_id)
    if not r:
        raise HTTPException(404, "Request not found")
    require_request_access(db, u, r)

    targets = _expected_heterogeneous_targets(r)
    receipts = []
    for t in targets:
        log = record_erp_sync(db, r, u, f"GATEWAY_FANOUT:{t['system_code']}")
        log.erp_reference_id = t["external_ref"]
        receipts.append(
            {
                "system_code": t["system_code"],
                "system_name": t["system_name"],
                "protocol": t["protocol"],
                "external_ref": t["external_ref"],
                "status": "SYNCED",
                "payload_propagated": t["canonical_fields"],
            }
        )
    audit(
        db,
        u,
        "ERP_GATEWAY_PROPAGATED",
        "erp_gateway",
        r.id,
        f"targets=SAP_S4_FICA_ISU,E_URJA_CIS_BILLING,GUVNL_1912_CRM status={r.status} load_kw={r.requested_load_kw}",
    )
    db.commit()
    kpi_cache.bump_epoch()
    return {
        "is_simulated": True,
        "integration_pattern": "API_GATEWAY_EVENT_FANOUT_NON_INVASIVE",
        "replaces_existing_erp": False,
        "applicant_fields_retyped": 0,
        "request_id": r.id,
        "systems_propagated": len(receipts),
        "targets": receipts,
    }


@router.get("/reconcile")
def check_master_data_reconciliation(
    top: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Compare canonical VidyutFlow records against SAP FI-CA/IS-U, e-Urja Billing, and 1912 CRM sync logs."""
    rows = visible_requests(db, u).order_by(ConnectionRequest.created_at.desc()).limit(top).all()
    items = []
    in_sync_count = 0
    drift_count = 0

    for r in rows:
        logs = (
            db.query(ErpSyncLog)
            .filter(ErpSyncLog.request_id == r.id, ErpSyncLog.status == "SYNCED")
            .order_by(ErpSyncLog.created_at.desc())
            .all()
        )
        seen_codes = {
            lg.event_type.split(":", 1)[1]
            for lg in logs
            if lg.event_type and lg.event_type.startswith(("GATEWAY_FANOUT:", "MASTER_RECONCILED:"))
        }
        missing_systems = [
            code
            for code in ("SAP_S4_FICA_ISU", "E_URJA_CIS_BILLING", "GUVNL_1912_CRM")
            if code not in seen_codes
        ]
        latest_sync_at = logs[0].created_at if logs else None
        stale_after_update = bool(
            latest_sync_at and r.updated_at and r.updated_at > latest_sync_at and missing_systems
        )
        has_drift = len(missing_systems) > 0 or stale_after_update
        if has_drift:
            drift_count += 1
        else:
            in_sync_count += 1
        items.append(
            {
                "request_id": r.id,
                "applicant_name": r.applicant_name,
                "zone": r.zone,
                "status": r.status,
                "requested_load_kw": r.requested_load_kw,
                "meter_serial": r.meter_serial or "",
                "reconciliation_state": "DRIFT_DETECTED" if has_drift else "IN_SYNC",
                "synced_systems": sorted(seen_codes),
                "missing_or_stale_systems": missing_systems,
            }
        )
    return {
        "is_simulated": True,
        "summary": {
            "checked_requests": len(items),
            "in_sync": in_sync_count,
            "drift_detected": drift_count,
        },
        "items": items,
    }


@router.post("/reconcile/{request_id}")
def reconcile_master_data_for_request(
    request_id: str,
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Reconcile master-data drift across SAP S/4HANA FI-CA/IS-U, e-Urja CIS Billing & 1912 CRM."""
    from ..audit import audit

    r = db.get(ConnectionRequest, request_id)
    if not r:
        raise HTTPException(404, "Request not found")
    require_request_access(db, u, r)

    targets = _expected_heterogeneous_targets(r)
    reconciled_refs = {}
    for t in targets:
        lg = record_erp_sync(db, r, u, f"MASTER_RECONCILED:{t['system_code']}")
        lg.erp_reference_id = t["external_ref"]
        reconciled_refs[t["system_code"]] = t["external_ref"]

    audit(
        db,
        u,
        "ERP_MASTER_RECONCILED",
        "erp_gateway",
        r.id,
        f"reconciled=3 load_kw={r.requested_load_kw} meter={r.meter_serial or 'NA'}",
    )
    db.commit()
    kpi_cache.bump_epoch()
    return {
        "is_simulated": True,
        "request_id": r.id,
        "reconciliation_state": "IN_SYNC",
        "reconciled_systems": reconciled_refs,
    }


