"""Operational Alert Engine with simulated SMS/Email channels + audit logging (Item #17).

Evaluates three deterministic operational rules across open utility requests:
1. `SLA_BREACH_RISK`: open request whose ML `sla_breach_risk >= threshold` or `sla_due_at <= now`.
2. `UNASSIGNED_STALE`: open request without an assigned field engineer older than `unassigned_hours`.
3. `REPEATED_ZONE_FAILURES`: zone accumulating `>= zone_failure_threshold` abnormal items
   (`BLOCKED`, `NEEDS_CORRECTION`, `CRITICAL` severity, or `FAILED` ERP syncs).

For each newly triggered rule condition (idempotent via `AlertDispatch(dedup_key, channel)`):
- Inserts per-staff `Notification` rows (`IN_APP` alert centre)
- Formats and logs a `SIMULATED_SMS` record (masked recipient phone)
- Formats and logs a `SIMULATED_EMAIL` record (zone officer / admin recipients)
- Appends a tamper-evident hash-chained `AuditLog` entry (`ALERT_DISPATCHED`)

Honesty boundary: SMS and Email channels are 100% simulated in-database outboxes;
no external telecom DLT or SMTP servers are contacted.
"""
from collections import defaultdict
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from .audit import audit
from .config import settings
from .models import AlertDispatch, ConnectionRequest, ErpSyncLog, User
from .notify import notify_users

ALERT_CHANNEL_DISCLOSURE = (
    "Simulated SMS and Email channels for demonstration only — alert payloads are "
    "formatted, persisted in alert_dispatches, delivered to the in-app Alert Centre, "
    "and hash-chained into audit_logs. No external telecom SMS or SMTP gateway is called."
)

TERMINAL_STATUSES = {"COMPLETED", "REJECTED"}


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _mask_phone(phone: str) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if len(digits) >= 4:
        return f"+91-XXXXXX{digits[-4:]}"
    return "+91-XXXXXXXXXX"


def serialize_alert_dispatch(d: AlertDispatch) -> dict:
    return {
        "id": d.id,
        "rule_code": d.rule_code,
        "severity": d.severity,
        "zone": d.zone,
        "request_id": d.request_id,
        "dedup_key": d.dedup_key,
        "channel": d.channel,
        "recipient": d.recipient,
        "subject": d.subject,
        "body": d.body,
        "status": d.status,
        "created_at": d.created_at,
        "is_simulated": d.channel in ("SIMULATED_SMS", "SIMULATED_EMAIL"),
    }


def _emit_alert_bundle(
    db: Session,
    actor: User | None,
    *,
    rule_code: str,
    severity: str,
    zone: str,
    request_id: str,
    dedup_key: str,
    subject: str,
    message: str,
    sms_recipient: str,
    existing_keys: set[tuple[str, str]],
) -> list[AlertDispatch]:
    if (dedup_key, "SIMULATED_SMS") in existing_keys:
        return []

    zone_officers = (
        db.query(User)
        .filter(User.role == "officer", User.zone == zone, User.is_active.is_(True))
        .all()
    )
    admins = db.query(User).filter(User.role == "admin", User.is_active.is_(True)).all()
    staff_targets = {u.id for u in zone_officers} | {u.id for u in admins}
    email_recipients = sorted({u.email for u in zone_officers} | {u.email for u in admins})
    email_to = ", ".join(email_recipients[:4]) if email_recipients else "ops-desk@vidyut.local"

    # 1. In-app Alert Centre notifications for zone officers + admins
    notify_users(
        db,
        staff_targets,
        subject,
        message,
        "alert" if severity == "critical" else "warning",
        request_id,
    )

    # 2. Record IN_APP, SIMULATED_SMS, and SIMULATED_EMAIL dispatch rows
    in_app_row = AlertDispatch(
        rule_code=rule_code,
        severity=severity,
        zone=zone,
        request_id=request_id,
        dedup_key=dedup_key,
        channel="IN_APP",
        recipient=f"{len(staff_targets)} staff inbox(es) ({zone})",
        subject=subject,
        body=message,
        status="DELIVERED_IN_APP",
    )
    sms_row = AlertDispatch(
        rule_code=rule_code,
        severity=severity,
        zone=zone,
        request_id=request_id,
        dedup_key=dedup_key,
        channel="SIMULATED_SMS",
        recipient=sms_recipient,
        subject=subject,
        body=f"[SIMULATED SMS · UGVCL-DEMO] {subject}: {message}"[:320],
        status="SIMULATED_SENT",
    )
    email_row = AlertDispatch(
        rule_code=rule_code,
        severity=severity,
        zone=zone,
        request_id=request_id,
        dedup_key=dedup_key,
        channel="SIMULATED_EMAIL",
        recipient=email_to,
        subject=f"[SIMULATED EMAIL · {severity.upper()}] {subject}",
        body=(
            f"DISCLOSURE: Simulated SMTP dispatch (no external email sent).\n"
            f"Rule: {rule_code} | Zone: {zone} | Severity: {severity.upper()}\n"
            f"Reference: {request_id or 'Zone-level aggregate'}\n\n"
            f"{message}"
        ),
        status="SIMULATED_SENT",
    )

    created = [in_app_row, sms_row, email_row]
    for row in created:
        db.add(row)
        existing_keys.add((dedup_key, row.channel))
    db.flush()

    # 3. Hash-chained audit log entry
    audit(
        db,
        actor,
        "ALERT_DISPATCHED",
        "alert",
        sms_row.id,
        f"rule={rule_code} zone={zone} severity={severity} channels=IN_APP,SIMULATED_SMS,SIMULATED_EMAIL ref={request_id or zone}",
    )
    return created


def evaluate_and_dispatch_alerts(
    db: Session,
    actor: User | None = None,
    *,
    zone_filter: str | None = None,
    sla_risk_threshold: float | None = None,
    unassigned_hours: float | None = None,
    zone_failure_threshold: int | None = None,
    now_override: datetime | None = None,
) -> list[AlertDispatch]:
    """Evaluate all 3 alert rules and emit idempotent multi-channel dispatches.
    Caller controls transaction commit (`db.commit()`)."""
    risk_cutoff = (
        settings.alert_sla_risk_threshold
        if sla_risk_threshold is None
        else float(sla_risk_threshold)
    )
    stale_hours = (
        settings.alert_unassigned_hours
        if unassigned_hours is None
        else float(unassigned_hours)
    )
    zone_fail_cutoff = (
        settings.alert_zone_failure_threshold
        if zone_failure_threshold is None
        else int(zone_failure_threshold)
    )
    now_utc = _as_utc(now_override) or datetime.now(timezone.utc)

    req_q = db.query(ConnectionRequest)
    if zone_filter is not None:
        if not zone_filter.strip():
            return []
        req_q = req_q.filter(ConnectionRequest.zone == zone_filter)
    requests = req_q.order_by(ConnectionRequest.created_at.asc()).all()

    existing_keys = {
        (row.dedup_key, row.channel)
        for row in db.query(AlertDispatch.dedup_key, AlertDispatch.channel).all()
    }

    newly_created: list[AlertDispatch] = []
    zone_abnormal_refs: dict[str, set[str]] = defaultdict(set)

    for r in requests:
        is_open = r.status not in TERMINAL_STATUSES
        zone = r.zone or "Unassigned"

        # Rule 1: SLA breach risk or overdue SLA deadline
        due_utc = _as_utc(r.sla_due_at)
        is_overdue = due_utc is not None and due_utc <= now_utc
        if is_open and (float(r.sla_breach_risk or 0.0) >= risk_cutoff or is_overdue):
            sev = (
                "critical"
                if (float(r.sla_breach_risk or 0.0) >= 0.85 or r.severity == "CRITICAL" or is_overdue)
                else "warning"
            )
            reason = (
                "SLA deadline overdue"
                if is_overdue
                else f"SLA breach risk {round(float(r.sla_breach_risk or 0.0) * 100)}%"
            )
            newly_created.extend(
                _emit_alert_bundle(
                    db,
                    actor,
                    rule_code="SLA_BREACH_RISK",
                    severity=sev,
                    zone=zone,
                    request_id=r.id,
                    dedup_key=f"SLA_BREACH_RISK:{r.id}",
                    subject=f"SLA Breach Risk Alert ({zone})",
                    message=f"{r.applicant_name} (ref {r.id[:8]}) · {reason} · status {r.status}",
                    sms_recipient=_mask_phone(r.phone),
                    existing_keys=existing_keys,
                )
            )

        # Rule 2: Unassigned request older than stale_hours
        created_utc = _as_utc(r.created_at) or now_utc
        age_hours = max(0.0, (now_utc - created_utc).total_seconds() / 3600.0)
        if is_open and not (r.assigned_engineer_id or "").strip() and age_hours >= stale_hours:
            sev = "critical" if (stale_hours > 0 and age_hours >= stale_hours * 2) else "warning"
            newly_created.extend(
                _emit_alert_bundle(
                    db,
                    actor,
                    rule_code="UNASSIGNED_STALE",
                    severity=sev,
                    zone=zone,
                    request_id=r.id,
                    dedup_key=f"UNASSIGNED_STALE:{r.id}",
                    subject=f"Unassigned Request > {stale_hours:g}h ({zone})",
                    message=(
                        f"{r.applicant_name} (ref {r.id[:8]}) unassigned for "
                        f"{age_hours:.1f}h in {zone} zone (status {r.status})"
                    ),
                    sms_recipient=_mask_phone(r.phone),
                    existing_keys=existing_keys,
                )
            )

        # Track zone abnormal items for Rule 3
        if is_open and (
            r.status in ("BLOCKED", "NEEDS_CORRECTION") or r.severity == "CRITICAL"
        ):
            zone_abnormal_refs[zone].add(f"req:{r.id}")

    # Include FAILED ERP sync rows in zone failure tally
    req_zone_map = {r.id: (r.zone or "Unassigned") for r in requests}
    if req_zone_map:
        failed_erp_rows = (
            db.query(ErpSyncLog)
            .filter(
                ErpSyncLog.status == "FAILED",
                ErpSyncLog.request_id.in_(set(req_zone_map.keys())),
            )
            .all()
        )
        for erp_row in failed_erp_rows:
            z = req_zone_map.get(erp_row.request_id, "Unassigned")
            zone_abnormal_refs[z].add(f"erp:{erp_row.id}")

    # Rule 3: Repeated zone failures
    for zone, refs in sorted(zone_abnormal_refs.items()):
        count = len(refs)
        if count >= zone_fail_cutoff:
            sev = "critical" if count > zone_fail_cutoff else "warning"
            newly_created.extend(
                _emit_alert_bundle(
                    db,
                    actor,
                    rule_code="REPEATED_ZONE_FAILURES",
                    severity=sev,
                    zone=zone,
                    request_id="",
                    dedup_key=f"REPEATED_ZONE_FAILURES:{zone}:n={count}",
                    subject=f"Repeated Zone Failures ({zone} · {count} active)",
                    message=(
                        f"{zone} zone has {count} concurrent abnormal/blocked/failed items "
                        f"(threshold: {zone_fail_cutoff}) requiring supervisory triage."
                    ),
                    sms_recipient=f"ops-oncall-{zone.lower()} (+91-XXXXXX0100)",
                    existing_keys=existing_keys,
                )
            )

    return newly_created
