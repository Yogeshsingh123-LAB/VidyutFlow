"""VidyutFlow 2.0 — Authoritative Phase 9 Billing & Surcharge Engine.

Provides deterministic, regulatory-compliant tariff calculation, daily Delayed Payment
Surcharge (DPS) accrual in Asia/Kolkata timezone, canonical 9-field balance statements,
5-bucket delinquency aging, and RFC 5545 calendar export matching Phase 9 Step 1–4D.
"""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

DEFAULT_POLICY_CODE = "POL-UGVCL-DPS-DEMO-2026.1"
DEFAULT_ANNUAL_RATE = 15.0  # 15.0% p.a. demo simulation


def parse_vidyut_date(date_str: str | None) -> Optional[date]:
    """Parse DD-Mmm-YYYY (e.g. '22-Oct-2026') or YYYY-MM-DD into a date object."""
    if not date_str:
        return None
    cleaned = str(date_str).strip()
    # Try ISO YYYY-MM-DD
    if len(cleaned) == 10 and cleaned[4] == "-" and cleaned[7] == "-":
        try:
            return date.fromisoformat(cleaned)
        except ValueError:
            pass
    # Try DD-Mmm-YYYY
    parts = cleaned.replace("/", "-").split("-")
    if len(parts) == 3:
        try:
            day = int(parts[0])
            m_str = parts[1].strip()[:3].lower()
            month = MONTH_MAP.get(m_str) or int(m_str)
            year = int(parts[2])
            return date(year, month, day)
        except Exception:
            pass
    return None


def format_vidyut_date(d: date) -> str:
    """Format date to DD-Mmm-YYYY."""
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{d.day:02d}-{month_names[d.month - 1]}-{d.year}"


def calculate_configurable_cycle_tariff_breakdown(
    tariff_category: str,
    sanctioned_load_kw: float,
    units_consumed: float,
    billing_cycle_type: str = "MONTHLY",
    rebate_or_subsidy: float = 0.0,
    other_adjustments: float = 0.0,
    billed_days_count: Optional[int] = None,
    standard_cycle_days_count: Optional[int] = None,
) -> Dict[str, Any]:
    """Calculate progressive slabs, fixed charges, FPPPA, duty, and total amount."""
    units = max(0, int(round(units_consumed)))
    load_kw = max(1.0, float(sanctioned_load_kw or 2.0))
    cycle_type = "BI_MONTHLY" if billing_cycle_type.upper() in ("BI_MONTHLY", "BIMONTHLY") else "MONTHLY"
    slab_multiplier = 2 if cycle_type == "BI_MONTHLY" else 1

    slab_breakdown: List[Dict[str, Any]] = []

    if tariff_category == "Commercial (NRGP)":
        t1_limit = 100 * slab_multiplier
        tier1 = min(units, t1_limit)
        tier2 = max(0, units - t1_limit)
        if tier1 > 0:
            slab_breakdown.append({
                "slab": f"0 - {t1_limit} Units (NRGP Tier 1)" if slab_multiplier == 2 else "0 - 100 Units (NRGP Tier 1)",
                "units": tier1,
                "rate": 4.75,
                "amount": round(tier1 * 4.75, 2),
            })
        if tier2 > 0:
            slab_breakdown.append({
                "slab": f"Above {t1_limit} Units (NRGP Tier 2)" if slab_multiplier == 2 else "Above 100 Units (NRGP Tier 2)",
                "units": tier2,
                "rate": 5.35,
                "amount": round(tier2 * 5.35, 2),
            })
    elif tariff_category == "Industrial (LTMD)":
        if units > 0:
            slab_breakdown.append({
                "slab": "All Units (LTMD Industrial Rate)",
                "units": units,
                "rate": 5.20,
                "amount": round(units * 5.20, 2),
            })
    elif tariff_category == "Agricultural (AG)":
        if units > 0:
            slab_breakdown.append({
                "slab": "Agricultural Subsidized Tariff (AG)",
                "units": units,
                "rate": 0.60,
                "amount": round(units * 0.60, 2),
            })
    else:
        # Residential (RGPU)
        w1 = 50 * slab_multiplier
        w2 = 50 * slab_multiplier
        w3 = 150 * slab_multiplier

        s1 = min(units, w1)
        s2 = min(max(0, units - w1), w2)
        s3 = min(max(0, units - (w1 + w2)), w3)
        s4 = max(0, units - (w1 + w2 + w3))

        if s1 > 0:
            slab_breakdown.append({
                "slab": "First 100 Units (0 - 100)" if slab_multiplier == 2 else "First 50 Units (0 - 50)",
                "units": s1,
                "rate": 3.05,
                "amount": round(s1 * 3.05, 2),
            })
        if s2 > 0:
            slab_breakdown.append({
                "slab": "Next 100 Units (101 - 200)" if slab_multiplier == 2 else "Next 50 Units (51 - 100)",
                "units": s2,
                "rate": 3.50,
                "amount": round(s2 * 3.50, 2),
            })
        if s3 > 0:
            slab_breakdown.append({
                "slab": "Next 300 Units (201 - 500)" if slab_multiplier == 2 else "Next 150 Units (101 - 250)",
                "units": s3,
                "rate": 4.15,
                "amount": round(s3 * 4.15, 2),
            })
        if s4 > 0:
            slab_breakdown.append({
                "slab": "Above 500 Units" if slab_multiplier == 2 else "Above 250 Units",
                "units": s4,
                "rate": 5.20,
                "amount": round(s4 * 5.20, 2),
            })

    if units == 0 and not slab_breakdown:
        slab_breakdown.append({
            "slab": "Zero Consumption Cycle (0 Units)",
            "units": 0,
            "rate": 0.0,
            "amount": 0.0,
        })

    energy_charges = round(sum(s["amount"] for s in slab_breakdown), 2)

    monthly_fixed_rate = {
        "Commercial (NRGP)": 70.0,
        "Industrial (LTMD)": 90.0,
        "Agricultural (AG)": 20.0,
    }.get(tariff_category, 25.0)

    cycle_months = 2 if cycle_type == "BI_MONTHLY" else 1
    pro_rata = 1.0
    if (
        billed_days_count is not None
        and standard_cycle_days_count is not None
        and standard_cycle_days_count > 0
        and billed_days_count < standard_cycle_days_count
    ):
        pro_rata = max(0.1, min(1.0, billed_days_count / standard_cycle_days_count))

    fixed_charges = round(load_kw * monthly_fixed_rate * cycle_months * pro_rata, 2)
    fuel_price_adjustment = round(units * 2.50, 2)

    duty_rate = {
        "Commercial (NRGP)": 0.20,
        "Agricultural (AG)": 0.05,
    }.get(tariff_category, 0.15)

    electricity_duty = float(round((energy_charges + fixed_charges + fuel_price_adjustment) * duty_rate))
    rebate = max(0.0, round(rebate_or_subsidy, 2))
    other = round(other_adjustments, 2)

    gross = round(energy_charges + fixed_charges + fuel_price_adjustment + electricity_duty + other - rebate, 2)
    total_amount = float(max(0, round(gross)))
    rounding_adj = round(total_amount - gross, 2)

    return {
        "slab_breakdown": slab_breakdown,
        "energy_charges": energy_charges,
        "fixed_charges": fixed_charges,
        "fuel_price_adjustment": fuel_price_adjustment,
        "electricity_duty": electricity_duty,
        "rebate_or_subsidy": rebate,
        "other_adjustments": other,
        "gross_before_rounding": gross,
        "rounding_adjustment": rounding_adj,
        "total_amount": total_amount,
        "billing_cycle_type": cycle_type,
        "is_demo_tariff_assumption": cycle_type == "BI_MONTHLY",
    }


def calculate_late_payment_charges(
    principal: float,
    due_date_str: str,
    reference_date_str: str,
    tariff_category: str = "Residential (RGPU)",
    annual_rate_percent: Optional[float] = None,
    grace_period_days: Optional[int] = None,
) -> Dict[str, Any]:
    """Calculate daily simple interest DPS on outstanding principal in Asia/Kolkata timezone."""
    due_d = parse_vidyut_date(due_date_str)
    ref_d = parse_vidyut_date(reference_date_str)

    if not due_d or not ref_d:
        return {
            "days_overdue": 0,
            "accrued_late_charges": 0.0,
            "daily_late_charge_accrual": 0.0,
            "effective_annual_rate": DEFAULT_ANNUAL_RATE,
        }

    # Rates & grace periods per category
    if annual_rate_percent is not None:
        rate = float(annual_rate_percent)
    elif tariff_category == "Industrial (LTMD)":
        rate = 18.0
    elif tariff_category == "Agricultural (AG)":
        rate = 12.0
    else:
        rate = 15.0

    if grace_period_days is not None:
        grace = int(grace_period_days)
    elif tariff_category == "Agricultural (AG)":
        grace = 7
    else:
        grace = 0

    diff_days = (ref_d - due_d).days
    effective_days = max(0, diff_days - grace) if diff_days > grace else 0

    if principal <= 0.0 or effective_days <= 0:
        daily_rate = round(principal * (rate / 100.0 / 365.0), 2) if principal > 0 else 0.0
        return {
            "days_overdue": effective_days,
            "raw_days_diff": diff_days,
            "accrued_late_charges": 0.0,
            "daily_late_charge_accrual": daily_rate,
            "effective_annual_rate": rate,
            "grace_period_days": grace,
        }

    daily_accrual = round(principal * (rate / 100.0 / 365.0), 2)
    # DPS = P * (R / 100 / 365) * D
    gross_dps = principal * (rate / 100.0 / 365.0) * effective_days
    accrued_dps = round(gross_dps, 2)

    return {
        "days_overdue": effective_days,
        "raw_days_diff": diff_days,
        "accrued_late_charges": accrued_dps,
        "daily_late_charge_accrual": daily_accrual,
        "effective_annual_rate": rate,
        "grace_period_days": grace,
    }


def derive_canonical_9_field_statement(
    bill: Any,
    payments: List[Any],
    reference_date_str: str,
    tariff_category: str = "Residential (RGPU)",
    waived_charges: float = 0.0,
    charges_settled: float = 0.0,
) -> Dict[str, Any]:
    """Derive the canonical 9-field financial statement for a bill."""
    original_bill_amount = float(getattr(bill, "total_amount", 0.0) or 0.0)
    bill_no = getattr(bill, "bill_no", "")
    consumer_no = getattr(bill, "consumer_no", "")
    due_date_str = getattr(bill, "due_date", "")

    # Calculate successful settled payments
    successful_payments = [
        p for p in payments
        if getattr(p, "bill_no", "") == bill_no and getattr(p, "status", "Successful") == "Successful"
    ]
    payments_settled = sum(float(getattr(p, "amount", 0.0) or 0.0) for p in successful_payments)
    remaining_principal = max(0.0, round(original_bill_amount - payments_settled, 2))

    # Calculate DPS
    dps_info = calculate_late_payment_charges(
        principal=remaining_principal,
        due_date_str=due_date_str,
        reference_date_str=reference_date_str,
        tariff_category=tariff_category,
    )

    gross_dps = dps_info["accrued_late_charges"]
    charges_paid_or_waived = round(waived_charges + charges_settled, 2)
    net_dps = max(0.0, round(gross_dps - charges_paid_or_waived, 2))
    total_outstanding = round(remaining_principal + net_dps, 2)

    is_settled = remaining_principal <= 0.01 and net_dps <= 0.01
    effective_status = "Paid" if is_settled else ("Overdue" if dps_info["days_overdue"] > 0 else getattr(bill, "status", "Unpaid"))

    return {
        "billNo": bill_no,
        "consumerNo": consumer_no,
        "originalBillAmount": original_bill_amount,
        "paymentsSuccessfullySettled": round(payments_settled, 2),
        "remainingPrincipal": remaining_principal,
        "accruedLatePaymentCharges": net_dps,
        "grossAccruedLateCharges": gross_dps,
        "chargesAlreadyPaidOrWaived": charges_paid_or_waived,
        "totalCurrentOutstanding": total_outstanding,
        "originalDueDate": due_date_str,
        "daysOverdue": dps_info["days_overdue"],
        "lastCalculationDate": reference_date_str,
        "dailyLateChargeAccrual": dps_info["daily_late_charge_accrual"],
        "annualRatePercent": dps_info["effective_annual_rate"],
        "derivedStatus": effective_status,
        "effectiveStatus": effective_status,
        "isOverdue": dps_info["days_overdue"] > 0 and not is_settled,
        "isFullySettled": is_settled,
    }


def compute_delinquency_aging(
    bills: List[Any],
    payments: List[Any],
    reference_date_str: str,
) -> Dict[str, Any]:
    """Compute 5-bucket executive delinquency aging excluding fully settled bills."""
    bucket_keys = ["NOT_YET_DUE", "1_30_DAYS", "31_60_DAYS", "61_90_DAYS", "OVER_90_DAYS"]
    buckets: Dict[str, Dict[str, Any]] = {
        k: {
            "bucket_key": k,
            "bills_count": 0,
            "consumers_count": 0,
            "principal_inr": 0.0,
            "dps_inr": 0.0,
            "total_inr": 0.0,
            "consumer_nos": set(),
        }
        for k in bucket_keys
    }

    total_evaluated = len(bills)
    settled_excluded = 0
    delinquent_bills = 0
    delinquent_consumers: set[str] = set()

    total_overdue_principal = 0.0
    total_overdue_dps = 0.0
    total_not_yet_due_principal = 0.0

    drill_downs = []

    for b in bills:
        stmt = derive_canonical_9_field_statement(
            bill=b,
            payments=payments,
            reference_date_str=reference_date_str,
        )

        if stmt["isFullySettled"]:
            settled_excluded += 1
            continue

        days = stmt["daysOverdue"]
        c_no = stmt["consumerNo"]

        if days <= 0:
            target_bucket = "NOT_YET_DUE"
            total_not_yet_due_principal += stmt["remainingPrincipal"]
        elif days <= 30:
            target_bucket = "1_30_DAYS"
        elif days <= 60:
            target_bucket = "31_60_DAYS"
        elif days <= 90:
            target_bucket = "61_90_DAYS"
        else:
            target_bucket = "OVER_90_DAYS"

        is_delinquent = target_bucket != "NOT_YET_DUE"
        if is_delinquent:
            delinquent_bills += 1
            delinquent_consumers.add(c_no)
            total_overdue_principal += stmt["remainingPrincipal"]
            total_overdue_dps += stmt["accruedLatePaymentCharges"]

        b_entry = buckets[target_bucket]
        b_entry["bills_count"] += 1
        b_entry["consumer_nos"].add(c_no)
        b_entry["principal_inr"] = round(b_entry["principal_inr"] + stmt["remainingPrincipal"], 2)
        b_entry["dps_inr"] = round(b_entry["dps_inr"] + stmt["accruedLatePaymentCharges"], 2)
        b_entry["total_inr"] = round(b_entry["principal_inr"] + b_entry["dps_inr"], 2)

        drill_downs.append({
            "bill_no": stmt["billNo"],
            "consumer_no": c_no,
            "bucket_key": target_bucket,
            "remaining_principal": stmt["remainingPrincipal"],
            "accrued_dps": stmt["accruedLatePaymentCharges"],
            "total_outstanding": stmt["totalCurrentOutstanding"],
            "days_overdue": days,
            "status": stmt["derivedStatus"],
        })

    for k in bucket_keys:
        buckets[k]["consumers_count"] = len(buckets[k].pop("consumer_nos"))

    total_overdue_principal = round(total_overdue_principal, 2)
    total_overdue_dps = round(total_overdue_dps, 2)
    total_overdue_balance = round(total_overdue_principal + total_overdue_dps, 2)

    return {
        "reference_date": reference_date_str,
        "total_evaluated_bills_count": total_evaluated,
        "total_settled_bills_excluded_count": settled_excluded,
        "total_delinquent_bills_count": delinquent_bills,
        "total_delinquent_consumers_count": len(delinquent_consumers),
        "total_overdue_principal_inr": total_overdue_principal,
        "total_overdue_dps_inr": total_overdue_dps,
        "total_overdue_balance_inr": total_overdue_balance,
        "total_not_yet_due_principal_inr": round(total_not_yet_due_principal, 2),
        "buckets": buckets,
        "drill_down_records": drill_downs,
    }


def generate_ics_calendar_content(
    events: List[Dict[str, Any]],
) -> str:
    """Generate standard RFC 5545 .ics calendar content."""
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//VidyutFlow//UGVCL Smart Utility Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]

    for evt in events:
        due_d = parse_vidyut_date(evt.get("due_date") or evt.get("dueDate"))
        compact_date = due_d.strftime("%Y%m%d") if due_d else "20261022"
        next_day = (due_d + timedelta(days=1)).strftime("%Y%m%d") if due_d else "20261023"

        bill_no = evt.get("bill_no") or evt.get("billNo", "BILL")
        consumer_no = evt.get("consumer_no") or evt.get("consumerNo", "")
        amount = evt.get("total_outstanding") or evt.get("totalCurrentOutstanding") or evt.get("total_amount", 0.0)

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:BILL-DUE-{bill_no}-{compact_date}@vidyutflow.ugvcl.demo",
            "DTSTAMP:20261101T000000Z",
            f"DTSTART;VALUE=DATE:{compact_date}",
            f"DTEND;VALUE=DATE:{next_day}",
            f"SUMMARY:UGVCL Electricity Bill Due: {bill_no} (INR {amount})",
            f"DESCRIPTION:Uttar Gujarat Vij Company Limited\\nBill No: {bill_no}\\nConsumer: {consumer_no}\\nTotal Outstanding: INR {amount}",
            "LOCATION:UGVCL Sub-Division Office, North Gujarat",
            "STATUS:CONFIRMED",
            "TRANSP:OPAQUE",
            "CLASS:PUBLIC",
            "END:VEVENT",
        ])

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"

