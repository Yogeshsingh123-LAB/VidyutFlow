"""Authoritative Billing, Tariffs, Surcharges (DPS), and Settlement Router (Phase 9 Step 1–4D).

Provides live backend support for:
- Progressive bi-monthly/monthly electricity tariffs
- Asia/Kolkata daily Delayed Payment Surcharge (DPS) accrual
- Canonical 9-field overdue statements
- Smart Payment Calendar & RFC 5545 .ics calendar export
- 11-field financial settlement receipts & atomic notice resolution
- 5-bucket delinquency aging
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..access import require_request_access
from ..audit import audit
from ..billing_engine import (
    calculate_configurable_cycle_tariff_breakdown,
    calculate_late_payment_charges,
    compute_delinquency_aging,
    derive_canonical_9_field_statement,
    generate_ics_calendar_content,
    parse_vidyut_date,
    format_vidyut_date,
)
from ..db import get_db
from ..deps import current_user, require
from ..models import (
    ConsumerConnectionLink,
    ElectricityBill,
    FormalNotice,
    LateChargePolicy,
    PaymentTransaction,
    User,
)
from ..notify import notify
from ..perf import kpi_cache

router = APIRouter(prefix="/billing", tags=["billing"])


# ============================================================================
# SCHEMAS
# ============================================================================

class TariffCalculateRequest(BaseModel):
    tariff_category: str = "Residential (RGPU)"
    sanctioned_load_kw: float = 2.0
    units_consumed: float = 100.0
    billing_cycle_type: str = "MONTHLY"
    rebate_or_subsidy: float = 0.0
    other_adjustments: float = 0.0
    billed_days_count: Optional[int] = None
    standard_cycle_days_count: Optional[int] = None


class SettlePaymentRequest(BaseModel):
    bill_no: str
    amount: float
    payment_method: str = "UPI"
    transaction_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    reference_date: Optional[str] = None


class ServeNoticeRequest(BaseModel):
    bill_no: str
    issue_date: Optional[str] = None
    payment_deadline: Optional[str] = None
    service_date: Optional[str] = None


class CreateBillRequest(BaseModel):
    consumer_no: str
    bill_month: str
    bill_date: str
    due_date: str
    period_start_date: str
    period_end_date: str
    previous_reading_kwh: float
    current_reading_kwh: float
    sanctioned_load_kw: float = 2.0
    tariff_category: str = "Residential (RGPU)"
    billing_cycle_type: str = "MONTHLY"
    rebate_or_subsidy: float = 0.0


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _serialize_bill(bill: ElectricityBill) -> Dict[str, Any]:
    slabs = []
    if bill.slab_breakdown_json:
        try:
            slabs = json.loads(bill.slab_breakdown_json)
        except Exception:
            slabs = []
    return {
        "id": bill.id,
        "billNo": bill.bill_no,
        "consumerNo": bill.consumer_no,
        "billMonth": bill.bill_month,
        "billDate": bill.bill_date,
        "dueDate": bill.due_date,
        "billingCycleType": bill.billing_cycle_type,
        "periodStartDate": bill.period_start_date,
        "periodEndDate": bill.period_end_date,
        "previousReadingDate": bill.previous_reading_date,
        "currentReadingDate": bill.current_reading_date,
        "previousReadingKwh": bill.previous_reading_kwh,
        "currentReadingKwh": bill.current_reading_kwh,
        "readingProvenance": bill.reading_provenance,
        "unitsConsumed": bill.units_consumed,
        "energyCharges": bill.energy_charges,
        "fixedCharges": bill.fixed_charges,
        "fuelPriceAdjustment": bill.fuel_price_adjustment,
        "electricityDuty": bill.electricity_duty,
        "rebateOrSubsidy": bill.rebate_or_subsidy,
        "totalAmount": bill.total_amount,
        "status": bill.status,
        "slabBreakdown": slabs,
        "createdAt": bill.created_at.isoformat() if bill.created_at else None,
        "updatedAt": bill.updated_at.isoformat() if bill.updated_at else None,
    }


def _serialize_payment(p: PaymentTransaction) -> Dict[str, Any]:
    breakdown = None
    if p.settlement_breakdown_json:
        try:
            breakdown = json.loads(p.settlement_breakdown_json)
        except Exception:
            pass
    return {
        "id": p.id,
        "transactionId": p.transaction_id,
        "billNo": p.bill_no,
        "consumerNo": p.consumer_no,
        "amount": p.amount,
        "paymentDate": p.payment_date,
        "paymentMethod": p.payment_method,
        "status": p.status,
        "principalSettled": p.principal_settled,
        "lateChargesSettled": p.late_charges_settled,
        "referenceId": p.reference_id,
        "settlementBreakdown": breakdown,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
    }


def _serialize_notice(n: FormalNotice) -> Dict[str, Any]:
    snapshot = None
    if n.snapshot_at_issuance_json:
        try:
            snapshot = json.loads(n.snapshot_at_issuance_json)
        except Exception:
            pass
    return {
        "id": n.id,
        "billNo": n.bill_no,
        "consumerNo": n.consumer_no,
        "status": n.status,
        "issueDate": n.issue_date,
        "serviceDate": n.service_date,
        "paymentDeadline": n.payment_deadline,
        "disconnectionReviewStatus": n.disconnection_review_status,
        "snapshotAtIssuance": snapshot,
        "createdAt": n.created_at.isoformat() if n.created_at else None,
        "updatedAt": n.updated_at.isoformat() if n.updated_at else None,
    }


def _get_consumer_numbers_for_user(db: Session, user: User) -> List[str]:
    """Retrieve consumer numbers belonging to a consumer user."""
    links = db.query(ConsumerConnectionLink).filter(ConsumerConnectionLink.user_id == user.id).all()
    c_nos = [link.consumer_no for link in links]
    if not c_nos and user.email == "consumer@vidyutflow.demo":
        c_nos = ["04281-99231"]
    return c_nos


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/bills")
def list_bills(
    consumer_no: Optional[str] = Query(None, alias="consumerNo"),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    """List electricity bills with role-scoped authorization and cycle filtering."""
    q = db.query(ElectricityBill)

    if u.role == "consumer":
        allowed = _get_consumer_numbers_for_user(db, u)
        if consumer_no:
            if consumer_no not in allowed:
                raise HTTPException(403, "Access denied to requested consumer connection bills")
            q = q.filter(ElectricityBill.consumer_no == consumer_no)
        else:
            q = q.filter(ElectricityBill.consumer_no.in_(allowed))
    else:
        if consumer_no:
            q = q.filter(ElectricityBill.consumer_no == consumer_no)

    if status_filter:
        q = q.filter(ElectricityBill.status == status_filter)

    rows = q.order_by(ElectricityBill.due_date.desc()).all()
    return [_serialize_bill(b) for b in rows]


@router.post("/bills", status_code=status.HTTP_201_CREATED)
def create_bill(
    body: CreateBillRequest,
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Issue a new electricity bill with progressive slabs and audit trail."""
    existing = db.query(ElectricityBill).filter(
        ElectricityBill.consumer_no == body.consumer_no,
        ElectricityBill.bill_month == body.bill_month,
    ).first()
    if existing:
        raise HTTPException(409, f"Bill for month '{body.bill_month}' already exists for consumer {body.consumer_no}")

    units = max(0.0, body.current_reading_kwh - body.previous_reading_kwh)
    breakdown = calculate_configurable_cycle_tariff_breakdown(
        tariff_category=body.tariff_category,
        sanctioned_load_kw=body.sanctioned_load_kw,
        units_consumed=units,
        billing_cycle_type=body.billing_cycle_type,
        rebate_or_subsidy=body.rebate_or_subsidy,
    )

    bill_id = str(uuid.uuid4())
    bill_no = f"BILL-UG-{datetime.now(timezone.utc).strftime('%Y-%m')}-{bill_id[:4].upper()}"

    bill = ElectricityBill(
        id=bill_id,
        bill_no=bill_no,
        consumer_no=body.consumer_no,
        bill_month=body.bill_month,
        bill_date=body.bill_date,
        due_date=body.due_date,
        billing_cycle_type=breakdown["billing_cycle_type"],
        period_start_date=body.period_start_date,
        period_end_date=body.period_end_date,
        previous_reading_kwh=body.previous_reading_kwh,
        current_reading_kwh=body.current_reading_kwh,
        units_consumed=units,
        energy_charges=breakdown["energy_charges"],
        fixed_charges=breakdown["fixed_charges"],
        fuel_price_adjustment=breakdown["fuel_price_adjustment"],
        electricity_duty=breakdown["electricity_duty"],
        rebate_or_subsidy=breakdown["rebate_or_subsidy"],
        total_amount=breakdown["total_amount"],
        status="Unpaid",
        slab_breakdown_json=json.dumps(breakdown["slab_breakdown"]),
    )
    db.add(bill)
    db.flush()

    audit(
        db,
        u,
        "BILL_GENERATED",
        "electricity_bill",
        bill.id,
        f"bill_no={bill.bill_no} consumer_no={bill.consumer_no} total={bill.total_amount}",
    )
    db.commit()
    db.refresh(bill)
    return _serialize_bill(bill)


@router.post("/calculate")
def calculate_tariff_breakdown(
    body: TariffCalculateRequest,
    u: User = Depends(current_user),
):
    """Calculate progressive cycle tariff breakdown for preview and verification."""
    return calculate_configurable_cycle_tariff_breakdown(
        tariff_category=body.tariff_category,
        sanctioned_load_kw=body.sanctioned_load_kw,
        units_consumed=body.units_consumed,
        billing_cycle_type=body.billing_cycle_type,
        rebate_or_subsidy=body.rebate_or_subsidy,
        other_adjustments=body.other_adjustments,
        billed_days_count=body.billed_days_count,
        standard_cycle_days_count=body.standard_cycle_days_count,
    )


@router.get("/calendar")
def get_payment_calendar(
    consumer_no: Optional[str] = Query(None, alias="consumerNo"),
    reference_date: Optional[str] = Query(None, alias="referenceDate"),
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    """Expose smart payment calendar events with 9-field canonical overdue properties."""
    ref_date = reference_date or "04-Nov-2026"
    q = db.query(ElectricityBill)

    if u.role == "consumer":
        allowed = _get_consumer_numbers_for_user(db, u)
        if consumer_no:
            if consumer_no not in allowed:
                raise HTTPException(403, "Access denied to requested consumer connection calendar")
            q = q.filter(ElectricityBill.consumer_no == consumer_no)
        else:
            q = q.filter(ElectricityBill.consumer_no.in_(allowed))
    elif consumer_no:
        q = q.filter(ElectricityBill.consumer_no == consumer_no)

    bills = q.all()
    bill_nos = [b.bill_no for b in bills]
    payments = db.query(PaymentTransaction).filter(PaymentTransaction.bill_no.in_(bill_nos)).all() if bill_nos else []
    notices = db.query(FormalNotice).filter(FormalNotice.bill_no.in_(bill_nos)).all() if bill_nos else []
    notice_by_bill = {n.bill_no: n for n in notices}

    events = []
    total_outstanding = 0.0
    active_notices_count = 0

    for b in bills:
        stmt = derive_canonical_9_field_statement(
            bill=b,
            payments=payments,
            reference_date_str=ref_date,
        )
        total_outstanding += stmt["totalCurrentOutstanding"]

        fn = notice_by_bill.get(b.bill_no)
        is_notice_active = fn is not None and fn.status != "RESOLVED"
        if is_notice_active:
            active_notices_count += 1

        events.append({
            "id": f"CAL-EVT-{b.bill_no}",
            "billNo": b.bill_no,
            "consumerNo": b.consumer_no,
            "billMonth": b.bill_month,
            "dueDate": b.due_date,
            "totalAmount": b.total_amount,
            "paidAmount": stmt["paymentsSuccessfullySettled"],
            "remainingPrincipal": stmt["remainingPrincipal"],
            "accruedLateCharges": stmt["accruedLatePaymentCharges"],
            "totalCurrentOutstanding": stmt["totalCurrentOutstanding"],
            "daysOverdue": stmt["daysOverdue"],
            "dailyLateChargeAccrual": stmt["dailyLateChargeAccrual"],
            "calculationReferenceDate": stmt["lastCalculationDate"],
            "status": stmt["derivedStatus"],
            "isOverdue": stmt["isOverdue"],
            "isFullyPaid": stmt["isFullySettled"],
            "billingCycleType": b.billing_cycle_type,
            "formalNoticeId": fn.id if fn else None,
            "formalNoticeStatus": fn.status if fn else None,
            "formalNoticePaymentDeadline": fn.payment_deadline if fn else None,
        })

    return {
        "summary": {
            "referenceDate": ref_date,
            "totalBillsCount": len(bills),
            "totalOutstandingPayable": round(total_outstanding, 2),
            "activeFormalNoticesCount": active_notices_count,
        },
        "events": events,
    }


@router.get("/calendar/export.ics")
def export_payment_calendar_ics(
    bill_no: Optional[str] = Query(None, alias="billNo"),
    consumer_no: Optional[str] = Query(None, alias="consumerNo"),
    reference_date: Optional[str] = Query(None, alias="referenceDate"),
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    """Export smart payment calendar obligations as an RFC 5545 compliant .ics file."""
    ref_date = reference_date or "04-Nov-2026"
    q = db.query(ElectricityBill)

    if u.role == "consumer":
        allowed = _get_consumer_numbers_for_user(db, u)
        if consumer_no:
            if consumer_no not in allowed:
                raise HTTPException(403, "Access denied")
            q = q.filter(ElectricityBill.consumer_no == consumer_no)
        else:
            q = q.filter(ElectricityBill.consumer_no.in_(allowed))
    elif consumer_no:
        q = q.filter(ElectricityBill.consumer_no == consumer_no)

    if bill_no:
        q = q.filter(ElectricityBill.bill_no == bill_no)

    bills = q.all()
    bill_nos = [b.bill_no for b in bills]
    payments = db.query(PaymentTransaction).filter(PaymentTransaction.bill_no.in_(bill_nos)).all() if bill_nos else []

    event_payloads = []
    for b in bills:
        stmt = derive_canonical_9_field_statement(bill=b, payments=payments, reference_date_str=ref_date)
        event_payloads.append({
            "billNo": b.bill_no,
            "consumerNo": b.consumer_no,
            "dueDate": b.due_date,
            "totalCurrentOutstanding": stmt["totalCurrentOutstanding"],
        })

    audit(db, u, "CALENDAR_EXPORTED", "calendar", bill_no or "all", f"bills_count={len(bills)}")
    db.commit()

    ics_text = generate_ics_calendar_content(event_payloads)
    filename = f"ugvcl-bill-due-{bill_no or 'all'}.ics"
    return Response(
        content=ics_text,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""},
    )


@router.get("/overdue-statement")
def get_overdue_statement(
    bill_no: Optional[str] = Query(None, alias="billNo"),
    consumer_no: Optional[str] = Query(None, alias="consumerNo"),
    reference_date: Optional[str] = Query(None, alias="referenceDate"),
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    """Return the real-time canonical 9-field overdue statement with daily DPS accrual."""
    ref_date = reference_date or "04-Nov-2026"
    q = db.query(ElectricityBill)

    if u.role == "consumer":
        allowed = _get_consumer_numbers_for_user(db, u)
        if consumer_no and consumer_no not in allowed:
            raise HTTPException(403, "Access denied")
        q = q.filter(ElectricityBill.consumer_no.in_(allowed))
    elif consumer_no:
        q = q.filter(ElectricityBill.consumer_no == consumer_no)

    if bill_no:
        q = q.filter(ElectricityBill.bill_no == bill_no)

    bills = q.all()
    if not bills:
        raise HTTPException(404, "No matching electricity bills found")

    bill_nos = [b.bill_no for b in bills]
    payments = db.query(PaymentTransaction).filter(PaymentTransaction.bill_no.in_(bill_nos)).all()

    statements = [
        derive_canonical_9_field_statement(bill=b, payments=payments, reference_date_str=ref_date)
        for b in bills
    ]
    return statements[0] if bill_no and len(statements) == 1 else statements


@router.post("/settle")
@router.post("/pay")
def settle_bill_payment(
    body: SettlePaymentRequest,
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    """Settle an electricity bill payment, reduce balance, and atomically resolve formal notices."""
    bill = db.query(ElectricityBill).filter(ElectricityBill.bill_no == body.bill_no).first()
    if not bill:
        raise HTTPException(404, f"Electricity bill '{body.bill_no}' not found")

    if u.role == "consumer":
        allowed = _get_consumer_numbers_for_user(db, u)
        if bill.consumer_no not in allowed:
            raise HTTPException(403, "Access denied to settle bill for this consumer number")

    ref_date = body.reference_date or "04-Nov-2026"
    existing_payments = db.query(PaymentTransaction).filter(PaymentTransaction.bill_no == bill.bill_no).all()

    # Idempotency check
    txn_key = body.transaction_id or body.idempotency_key
    if txn_key:
        match = next((p for p in existing_payments if p.transaction_id == txn_key or p.reference_id == txn_key), None)
        if match:
            return {
                "success": True,
                "duplicate": True,
                "message": "Payment already processed",
                "payment": _serialize_payment(match),
                "bill": _serialize_bill(bill),
            }

    stmt = derive_canonical_9_field_statement(
        bill=bill,
        payments=existing_payments,
        reference_date_str=ref_date,
    )

    amount = float(body.amount)
    if amount <= 0.0:
        raise HTTPException(422, "Payment amount must be greater than zero")

    rem_principal = stmt["remainingPrincipal"]
    accrued_dps = stmt["accruedLatePaymentCharges"]

    principal_settled = min(rem_principal, amount)
    remaining_after_principal = max(0.0, amount - principal_settled)
    late_charges_settled = min(accrued_dps, remaining_after_principal)

    net_principal_remaining = max(0.0, round(rem_principal - principal_settled, 2))
    net_dps_remaining = max(0.0, round(accrued_dps - late_charges_settled, 2))

    new_status = "Paid" if net_principal_remaining <= 0.01 and net_dps_remaining <= 0.01 else "Partially Paid"
    bill.status = new_status

    txn_id = body.transaction_id or f"TXN-{body.payment_method.upper()}-{uuid.uuid4().hex[:10].upper()}"
    settlement_json = json.dumps({
        "original_bill_amount": stmt["originalBillAmount"],
        "principal_settled": principal_settled,
        "late_charges_settled": late_charges_settled,
        "remaining_principal": net_principal_remaining,
        "remaining_dps": net_dps_remaining,
        "settled_at_reference_date": ref_date,
    })

    payment = PaymentTransaction(
        id=str(uuid.uuid4()),
        transaction_id=txn_id,
        bill_no=bill.bill_no,
        consumer_no=bill.consumer_no,
        amount=amount,
        payment_date=ref_date,
        payment_method=body.payment_method,
        status="Successful",
        principal_settled=principal_settled,
        late_charges_settled=late_charges_settled,
        reference_id=body.idempotency_key,
        settlement_breakdown_json=settlement_json,
    )
    db.add(payment)

    # Atomically resolve formal notice upon full payment
    resolved_notice_id = None
    if new_status == "Paid":
        active_notice = db.query(FormalNotice).filter(
            FormalNotice.bill_no == bill.bill_no,
            FormalNotice.status != "RESOLVED",
        ).first()
        if active_notice:
            active_notice.status = "RESOLVED"
            resolved_notice_id = active_notice.id
            audit(
                db,
                u,
                "NOTICE_RESOLVED",
                "formal_notice",
                active_notice.id,
                f"bill_no={bill.bill_no} resolved_via_payment={txn_id}",
            )

    audit(
        db,
        u,
        "PAYMENT_SETTLED",
        "electricity_bill",
        bill.id,
        f"txn_id={txn_id} amount={amount} principal={principal_settled} dps={late_charges_settled} status={new_status}",
    )

    notify(
        db,
        u.id,
        "Payment Confirmed",
        f"Payment of INR {amount:.2f} received for bill {bill.bill_no} via {body.payment_method}.",
        "success",
        bill.id,
    )

    db.commit()
    db.refresh(bill)
    db.refresh(payment)

    return {
        "success": True,
        "duplicate": False,
        "bill": _serialize_bill(bill),
        "payment": _serialize_payment(payment),
        "resolvedNoticeId": resolved_notice_id,
    }


@router.get("/payments")
def list_payments(
    bill_no: Optional[str] = Query(None, alias="billNo"),
    consumer_no: Optional[str] = Query(None, alias="consumerNo"),
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    """List financial payment transactions and settlement receipt audit trails."""
    q = db.query(PaymentTransaction)

    if u.role == "consumer":
        allowed = _get_consumer_numbers_for_user(db, u)
        if consumer_no and consumer_no not in allowed:
            raise HTTPException(403, "Access denied")
        q = q.filter(PaymentTransaction.consumer_no.in_(allowed))
    elif consumer_no:
        q = q.filter(PaymentTransaction.consumer_no == consumer_no)

    if bill_no:
        q = q.filter(PaymentTransaction.bill_no == bill_no)

    rows = q.order_by(PaymentTransaction.created_at.desc()).all()
    return [_serialize_payment(p) for p in rows]


@router.get("/aging")
def get_delinquency_aging(
    reference_date: Optional[str] = Query(None, alias="referenceDate"),
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Compute executive 5-bucket delinquency aging analysis across active bills."""
    ref_date = reference_date or "04-Nov-2026"
    bills = db.query(ElectricityBill).all()
    payments = db.query(PaymentTransaction).all()
    return compute_delinquency_aging(bills=bills, payments=payments, reference_date_str=ref_date)


@router.post("/notices", status_code=status.HTTP_201_CREATED)
def serve_formal_notice(
    body: ServeNoticeRequest,
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "admin")),
):
    """Serve a simulated Section 56 statutory demand notice with 15-day payment countdown."""
    bill = db.query(ElectricityBill).filter(ElectricityBill.bill_no == body.bill_no).first()
    if not bill:
        raise HTTPException(404, f"Bill '{body.bill_no}' not found")

    existing = db.query(FormalNotice).filter(
        FormalNotice.bill_no == body.bill_no,
        FormalNotice.status != "RESOLVED",
    ).first()
    if existing:
        raise HTTPException(409, f"Active formal notice '{existing.id}' already exists for bill '{body.bill_no}'")

    issue_d = body.issue_date or "24-Oct-2026"
    deadline_d = body.payment_deadline or "08-Nov-2026"
    service_d = body.service_date or issue_d

    notice = FormalNotice(
        id=f"FN-UG-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
        bill_no=bill.bill_no,
        consumer_no=bill.consumer_no,
        status="SERVED",
        issue_date=issue_d,
        service_date=service_d,
        payment_deadline=deadline_d,
        disconnection_review_status="PENDING_REVIEW",
        snapshot_at_issuance_json=json.dumps(_serialize_bill(bill)),
    )
    db.add(notice)
    db.flush()

    audit(
        db,
        u,
        "FORMAL_NOTICE_SERVED",
        "formal_notice",
        notice.id,
        f"bill_no={bill.bill_no} consumer_no={bill.consumer_no} deadline={deadline_d}",
    )
    db.commit()
    db.refresh(notice)
    return _serialize_notice(notice)


@router.get("/notices")
def list_formal_notices(
    consumer_no: Optional[str] = Query(None, alias="consumerNo"),
    bill_no: Optional[str] = Query(None, alias="billNo"),
    db: Session = Depends(get_db),
    u: User = Depends(current_user),
):
    """List formal notices with role-based scoping."""
    q = db.query(FormalNotice)

    if u.role == "consumer":
        allowed = _get_consumer_numbers_for_user(db, u)
        if consumer_no and consumer_no not in allowed:
            raise HTTPException(403, "Access denied")
        q = q.filter(FormalNotice.consumer_no.in_(allowed))
    elif consumer_no:
        q = q.filter(FormalNotice.consumer_no == consumer_no)

    if bill_no:
        q = q.filter(FormalNotice.bill_no == bill_no)

    rows = q.order_by(FormalNotice.created_at.desc()).all()
    return [_serialize_notice(n) for n in rows]

