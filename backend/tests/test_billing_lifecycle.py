"""Comprehensive integration test suite for Authoritative Phase 9 Billing & Surcharge Lifecycle."""
import json
import pytest
from starlette.testclient import TestClient

from app.main import app
from app.db import SessionLocal
from app.models import ElectricityBill, PaymentTransaction, FormalNotice, User


def _login(c: TestClient, email: str, pw: str, role: str) -> dict:
    res = c.post(
        "/auth/login",
        data={"username": email, "password": pw, "role": role},
    )
    if res.status_code != 200:
        res = c.post(
            "/auth/login",
            json={"email": email, "password": pw, "role": role},
        )
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_billing_calculation_engine():
    """Verify progressive 2-month slabs, fixed charges, FPPPA, and duty calculation."""
    with TestClient(app) as c:
        assert c.get("/health").json()["status"] == "ok"
        headers = _login(c, "consumer@vidyutflow.demo", "Demo@12345", "consumer")

        # 1. Monthly Residential calculation
        payload = {
            "tariff_category": "Residential (RGPU)",
            "sanctioned_load_kw": 6.0,
            "units_consumed": 360.0,
            "billing_cycle_type": "MONTHLY",
            "rebate_or_subsidy": 50.0,
        }
        res = c.post("/billing/calculate", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data["slab_breakdown"]) == 4
        assert data["energy_charges"] > 1400.0
        assert data["fixed_charges"] == 150.0  # 6 kW * 25
        assert data["fuel_price_adjustment"] == 900.0  # 360 * 2.5
        assert data["total_amount"] > 0

        # 2. Bi-Monthly Residential calculation with 2x slabs
        payload_bi = {
            "tariff_category": "Residential (RGPU)",
            "sanctioned_load_kw": 4.0,
            "units_consumed": 600.0,
            "billing_cycle_type": "BI_MONTHLY",
        }
        res_bi = c.post("/billing/calculate", json=payload_bi, headers=headers)
        assert res_bi.status_code == 200
        data_bi = res_bi.json()
        assert data_bi["billing_cycle_type"] == "BI_MONTHLY"
        assert data_bi["fixed_charges"] == 200.0  # 4 kW * 25 * 2


def test_consumer_bills_authorization_and_listing():
    """Consumer can access their own bills and is blocked from accessing others."""
    with TestClient(app) as c:
        assert c.get("/health").json()["status"] == "ok"
        consumer_headers = _login(c, "consumer@vidyutflow.demo", "Demo@12345", "consumer")
        officer_headers = _login(c, "employee@vidyutflow.demo", "Demo@12345", "officer")

        # Consumer lists own bills
        res = c.get("/billing/bills", headers=consumer_headers)
        assert res.status_code == 200
        bills = res.json()
        assert len(bills) >= 2
        bill_nos = [b["billNo"] for b in bills]
        assert "BILL-UG-2026-10-8821" in bill_nos
        assert "BILL-UG-2026-09-8821" in bill_nos

        # Consumer querying unauthorized consumer number is blocked
        res_blocked = c.get(
            "/billing/bills?consumerNo=99999-00000",
            headers=consumer_headers,
        )
        assert res_blocked.status_code == 403

        # Officer can filter by consumer number
        res_officer = c.get(
            "/billing/bills?consumerNo=04281-99231",
            headers=officer_headers,
        )
        assert res_officer.status_code == 200
        assert len(res_officer.json()) >= 2


def test_overdue_statement_and_dps_accrual():
    """Canonical 9-field overdue statement calculates exact DPS in Asia/Kolkata timezone."""
    with TestClient(app) as c:
        assert c.get("/health").json()["status"] == "ok"
        headers = _login(c, "consumer@vidyutflow.demo", "Demo@12345", "consumer")

        # Reference date: 28-Oct-2026 (6 days overdue, 15% p.a.)
        res_28 = c.get(
            "/billing/overdue-statement?billNo=BILL-UG-2026-10-8821&referenceDate=28-Oct-2026",
            headers=headers,
        )
        assert res_28.status_code == 200
        stmt_28 = res_28.json()
        assert stmt_28["originalBillAmount"] == 2185.0
        assert stmt_28["remainingPrincipal"] == 2185.0
        assert stmt_28["daysOverdue"] == 6
        assert stmt_28["accruedLatePaymentCharges"] == 5.39
        assert stmt_28["totalCurrentOutstanding"] == 2190.39

        # Reference date: 04-Nov-2026 (13 days overdue)
        res_04 = c.get(
            "/billing/overdue-statement?billNo=BILL-UG-2026-10-8821&referenceDate=04-Nov-2026",
            headers=headers,
        )
        assert res_04.status_code == 200
        stmt_04 = res_04.json()
        assert stmt_04["daysOverdue"] == 13
        assert stmt_04["accruedLatePaymentCharges"] == 11.67
        assert stmt_04["totalCurrentOutstanding"] == 2196.67

        # Reference date: 05-Nov-2026 (14 days overdue)
        res_05 = c.get(
            "/billing/overdue-statement?billNo=BILL-UG-2026-10-8821&referenceDate=05-Nov-2026",
            headers=headers,
        )
        assert res_05.status_code == 200
        stmt_05 = res_05.json()
        assert stmt_05["daysOverdue"] == 14
        assert stmt_05["accruedLatePaymentCharges"] == 12.57
        assert stmt_05["totalCurrentOutstanding"] == 2197.57


def test_payment_calendar_and_ics_export():
    """Calendar summary, events, and RFC 5545 export generation."""
    with TestClient(app) as c:
        assert c.get("/health").json()["status"] == "ok"
        headers = _login(c, "consumer@vidyutflow.demo", "Demo@12345", "consumer")

        # Calendar JSON view
        res = c.get("/billing/calendar?referenceDate=04-Nov-2026", headers=headers)
        assert res.status_code == 200
        cal = res.json()
        assert "summary" in cal
        assert "events" in cal
        assert len(cal["events"]) >= 2
        assert cal["summary"]["totalBillsCount"] >= 2

        # Calendar .ics export
        res_ics = c.get("/billing/calendar/export.ics?billNo=BILL-UG-2026-10-8821", headers=headers)
        assert res_ics.status_code == 200
        assert res_ics.headers["Content-Type"].startswith("text/calendar")
        ics_body = res_ics.text
        assert "BEGIN:VCALENDAR" in ics_body
        assert "BEGIN:VEVENT" in ics_body
        assert "BILL-UG-2026-10-8821" in ics_body
        assert "END:VCALENDAR" in ics_body


def test_settle_bill_payment_idempotency_and_notice_resolution():
    """Settlement records financial trail, is idempotent, updates status, and resolves active notice."""
    with TestClient(app) as c:
        assert c.get("/health").json()["status"] == "ok"
        consumer_headers = _login(c, "consumer@vidyutflow.demo", "Demo@12345", "consumer")

        # Settle full amount on 04-Nov-2026: ₹2,196.67
        settle_payload = {
            "bill_no": "BILL-UG-2026-10-8821",
            "amount": 2196.67,
            "payment_method": "UPI",
            "idempotency_key": "IDEMP-TEST-SETTLE-001",
            "reference_date": "04-Nov-2026",
        }
        res = c.post("/billing/settle", json=settle_payload, headers=consumer_headers)
        assert res.status_code == 200
        result = res.json()
        assert result["success"] is True
        assert result["duplicate"] is False
        assert result["bill"]["status"] == "Paid"
        assert result["payment"]["principalSettled"] == 2185.0
        assert result["payment"]["lateChargesSettled"] == 11.67
        assert result["resolvedNoticeId"] == "FN-UG-2026-001"

        # Repeated request with same idempotency_key returns duplicate: true
        res_repeat = c.post("/billing/settle", json=settle_payload, headers=consumer_headers)
        assert res_repeat.status_code == 200
        assert res_repeat.json()["duplicate"] is True

        # Verify notice in database is RESOLVED
        db = SessionLocal()
        try:
            notice = db.query(FormalNotice).filter(FormalNotice.id == "FN-UG-2026-001").first()
            assert notice is not None
            assert notice.status == "RESOLVED"
        finally:
            db.close()

        # Verify payments endpoint reflects the transaction
        res_payments = c.get("/billing/payments?billNo=BILL-UG-2026-10-8821", headers=consumer_headers)
        assert res_payments.status_code == 200
        payments = res_payments.json()
        assert len(payments) >= 1
        assert payments[0]["principalSettled"] == 2185.0


def test_executive_delinquency_aging_and_notices():
    """5-bucket aging analysis and formal notice issuance."""
    with TestClient(app) as c:
        assert c.get("/health").json()["status"] == "ok"
        officer_headers = _login(c, "employee@vidyutflow.demo", "Demo@12345", "officer")

        # 1. Delinquency aging analysis
        res_aging = c.get("/billing/aging?referenceDate=04-Nov-2026", headers=officer_headers)
        assert res_aging.status_code == 200
        aging = res_aging.json()
        assert "buckets" in aging
        assert "NOT_YET_DUE" in aging["buckets"]
        assert "1_30_DAYS" in aging["buckets"]
        assert "31_60_DAYS" in aging["buckets"]
        assert "61_90_DAYS" in aging["buckets"]
        assert "OVER_90_DAYS" in aging["buckets"]

        # 2. Officer serves a new notice
        notice_payload = {
            "bill_no": "BILL-UG-2026-09-8821",
            "issue_date": "01-Nov-2026",
            "payment_deadline": "16-Nov-2026",
        }
        res_notice = c.post("/billing/notices", json=notice_payload, headers=officer_headers)
        assert res_notice.status_code == 201
        notice_data = res_notice.json()
        assert notice_data["billNo"] == "BILL-UG-2026-09-8821"
        assert notice_data["status"] == "SERVED"

        # List notices
        res_notices = c.get("/billing/notices", headers=officer_headers)
        assert res_notices.status_code == 200
        notices = res_notices.json()
        assert len(notices) >= 2
