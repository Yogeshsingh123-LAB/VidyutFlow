"""Phase 12 Step 5: Pure Rules Engine for Transformer Telemetry Monitoring.

Evaluates transformer telemetry readings against active AlertPolicyVersion thresholds:
- OVERLOAD (load % >= warn / crit)
- OIL_TEMP_HIGH (oil temp >= warn / crit)
- WINDING_TEMP_HIGH (winding temp >= warn / crit)
- HIGH_VIBRATION (vibration >= warn / crit)

Separation of Concerns:
- `evaluate_rules`: 100% pure, deterministic function (no DB / no I/O) suitable for direct unit testing.
- `evaluate_transformer_telemetry`: Database-backed orchestrator managing AlertPolicyVersion lookup,
  telemetry fetching, and idempotent TransformerAlert lifecycle updates.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from typing import Any
import uuid
from sqlalchemy.orm import Session

from ..models import (
    AlertPolicyVersion,
    TelemetryReading,
    TransformerAlert,
    TransformerAsset,
    TransformerSensor,
)
from .event_bus import transformer_event_bus

DEFAULT_POLICY_CLASS = "DISTRIBUTION_11KV_DEMO"
DEFAULT_THRESHOLDS = {
    "oil_temp_warn_c": 80.0,
    "oil_temp_crit_c": 90.0,
    "winding_temp_warn_c": 90.0,
    "winding_temp_crit_c": 105.0,
    "load_pct_warn": 85.0,
    "load_pct_crit": 100.0,
    "vibration_warn_mm_s": 4.5,
    "vibration_crit_mm_s": 7.1,
}


@dataclass(frozen=True)
class RuleViolation:
    alert_type: str
    severity: str  # "WARN" | "CRITICAL"
    value: float
    threshold_val: float
    unit: str
    sensor_type: str
    sensor_id: str | None
    evidence: dict[str, Any]
    dedupe_key: str
    threshold_version: str


def evaluate_rules(
    transformer_id: str,
    rated_kva: float,
    readings: list[dict[str, Any]],
    thresholds: dict[str, float],
    threshold_version: str = "1.0.0-demo",
) -> list[RuleViolation]:
    """Pure, deterministic evaluation of telemetry readings against policy thresholds.

    Zero database or network dependencies.
    """
    violations: list[RuleViolation] = []
    rated_kva = float(rated_kva) if rated_kva and rated_kva > 0 else 100.0

    for r in readings:
        sensor_type = str(r.get("sensor_type") or "").upper()
        value = float(r.get("value", 0.0))
        unit = str(r.get("unit") or "")
        sensor_id = r.get("sensor_id")
        measured_at = r.get("measured_at")
        iso_time = measured_at.isoformat() if hasattr(measured_at, "isoformat") else str(measured_at or "")

        # 1. Overload evaluation
        if sensor_type == "LOAD_KVA":
            load_pct = round((value / rated_kva) * 100.0, 2)
            crit_val = float(thresholds.get("load_pct_crit", 100.0))
            warn_val = float(thresholds.get("load_pct_warn", 85.0))

            if load_pct >= crit_val:
                violations.append(
                    RuleViolation(
                        alert_type="OVERLOAD",
                        severity="CRITICAL",
                        value=load_pct,
                        threshold_val=crit_val,
                        unit="%",
                        sensor_type=sensor_type,
                        sensor_id=sensor_id,
                        evidence={
                            "load_kva": value,
                            "rated_kva": rated_kva,
                            "load_pct": load_pct,
                            "threshold_pct": crit_val,
                            "measured_at": iso_time,
                        },
                        dedupe_key=f"{transformer_id}:OVERLOAD",
                        threshold_version=threshold_version,
                    )
                )
            elif load_pct >= warn_val:
                violations.append(
                    RuleViolation(
                        alert_type="OVERLOAD",
                        severity="WARN",
                        value=load_pct,
                        threshold_val=warn_val,
                        unit="%",
                        sensor_type=sensor_type,
                        sensor_id=sensor_id,
                        evidence={
                            "load_kva": value,
                            "rated_kva": rated_kva,
                            "load_pct": load_pct,
                            "threshold_pct": warn_val,
                            "measured_at": iso_time,
                        },
                        dedupe_key=f"{transformer_id}:OVERLOAD",
                        threshold_version=threshold_version,
                    )
                )

        # 2. Oil temperature evaluation
        elif sensor_type == "OIL_TEMP":
            crit_val = float(thresholds.get("oil_temp_crit_c", 90.0))
            warn_val = float(thresholds.get("oil_temp_warn_c", 80.0))

            if value >= crit_val:
                violations.append(
                    RuleViolation(
                        alert_type="OIL_TEMP_HIGH",
                        severity="CRITICAL",
                        value=value,
                        threshold_val=crit_val,
                        unit=unit or "°C",
                        sensor_type=sensor_type,
                        sensor_id=sensor_id,
                        evidence={
                            "oil_temp_c": value,
                            "threshold_c": crit_val,
                            "measured_at": iso_time,
                        },
                        dedupe_key=f"{transformer_id}:OIL_TEMP_HIGH",
                        threshold_version=threshold_version,
                    )
                )
            elif value >= warn_val:
                violations.append(
                    RuleViolation(
                        alert_type="OIL_TEMP_HIGH",
                        severity="WARN",
                        value=value,
                        threshold_val=warn_val,
                        unit=unit or "°C",
                        sensor_type=sensor_type,
                        sensor_id=sensor_id,
                        evidence={
                            "oil_temp_c": value,
                            "threshold_c": warn_val,
                            "measured_at": iso_time,
                        },
                        dedupe_key=f"{transformer_id}:OIL_TEMP_HIGH",
                        threshold_version=threshold_version,
                    )
                )

        # 3. Winding temperature evaluation
        elif sensor_type == "WINDING_TEMP":
            crit_val = float(thresholds.get("winding_temp_crit_c", 105.0))
            warn_val = float(thresholds.get("winding_temp_warn_c", 90.0))

            if value >= crit_val:
                violations.append(
                    RuleViolation(
                        alert_type="WINDING_TEMP_HIGH",
                        severity="CRITICAL",
                        value=value,
                        threshold_val=crit_val,
                        unit=unit or "°C",
                        sensor_type=sensor_type,
                        sensor_id=sensor_id,
                        evidence={
                            "winding_temp_c": value,
                            "threshold_c": crit_val,
                            "measured_at": iso_time,
                        },
                        dedupe_key=f"{transformer_id}:WINDING_TEMP_HIGH",
                        threshold_version=threshold_version,
                    )
                )
            elif value >= warn_val:
                violations.append(
                    RuleViolation(
                        alert_type="WINDING_TEMP_HIGH",
                        severity="WARN",
                        value=value,
                        threshold_val=warn_val,
                        unit=unit or "°C",
                        sensor_type=sensor_type,
                        sensor_id=sensor_id,
                        evidence={
                            "winding_temp_c": value,
                            "threshold_c": warn_val,
                            "measured_at": iso_time,
                        },
                        dedupe_key=f"{transformer_id}:WINDING_TEMP_HIGH",
                        threshold_version=threshold_version,
                    )
                )

        # 4. Vibration evaluation
        elif sensor_type in ("VIBRATION", "VIBRATION_MM_S"):
            crit_val = float(thresholds.get("vibration_crit_mm_s", 7.1))
            warn_val = float(thresholds.get("vibration_warn_mm_s", 4.5))

            if value >= crit_val:
                violations.append(
                    RuleViolation(
                        alert_type="HIGH_VIBRATION",
                        severity="CRITICAL",
                        value=value,
                        threshold_val=crit_val,
                        unit=unit or "mm/s",
                        sensor_type=sensor_type,
                        sensor_id=sensor_id,
                        evidence={
                            "vibration_mm_s": value,
                            "threshold_mm_s": crit_val,
                            "measured_at": iso_time,
                        },
                        dedupe_key=f"{transformer_id}:HIGH_VIBRATION",
                        threshold_version=threshold_version,
                    )
                )
            elif value >= warn_val:
                violations.append(
                    RuleViolation(
                        alert_type="HIGH_VIBRATION",
                        severity="WARN",
                        value=value,
                        threshold_val=warn_val,
                        unit=unit or "mm/s",
                        sensor_type=sensor_type,
                        sensor_id=sensor_id,
                        evidence={
                            "vibration_mm_s": value,
                            "threshold_mm_s": warn_val,
                            "measured_at": iso_time,
                        },
                        dedupe_key=f"{transformer_id}:HIGH_VIBRATION",
                        threshold_version=threshold_version,
                    )
                )

    return violations


def _get_active_policy(db: Session, voltage_class: str | None = None) -> tuple[dict[str, float], str]:
    """Retrieve active policy thresholds and version for transformer class."""
    target_class = (
        "POWER_66KV_DEMO"
        if voltage_class and ("66" in voltage_class or "POWER" in voltage_class.upper())
        else DEFAULT_POLICY_CLASS
    )

    policy = (
        db.query(AlertPolicyVersion)
        .filter(AlertPolicyVersion.transformer_class == target_class)
        .order_by(AlertPolicyVersion.effective_from.desc())
        .first()
    )

    if policy:
        try:
            parsed = json.loads(policy.thresholds)
            thresholds = {k: float(v) for k, v in parsed.items()}
            return thresholds, policy.version
        except Exception:
            pass

    return DEFAULT_THRESHOLDS.copy(), "1.0.0-demo"


def evaluate_transformer_telemetry(
    db: Session,
    transformer_id: str,
) -> list[TransformerAlert]:
    """Evaluate latest telemetry for a transformer and persist / update TransformerAlert rows."""
    tr = db.query(TransformerAsset).filter(
        (TransformerAsset.id == transformer_id) | (TransformerAsset.utility_asset_code == transformer_id)
    ).first()

    if not tr:
        return []

    thresholds, version = _get_active_policy(db, tr.voltage_class)

    # Fetch latest telemetry reading for each active sensor of this transformer
    sensors = db.query(TransformerSensor).filter(TransformerSensor.transformer_id == tr.id).all()
    if not sensors:
        return []

    sensor_map = {s.id: s for s in sensors}
    readings: list[dict[str, Any]] = []

    for sensor in sensors:
        latest = (
            db.query(TelemetryReading)
            .filter(TelemetryReading.sensor_id == sensor.id)
            .order_by(TelemetryReading.measured_at.desc())
            .first()
        )
        if latest:
            readings.append({
                "sensor_type": sensor.sensor_type,
                "value": latest.value,
                "unit": latest.unit,
                "sensor_id": sensor.id,
                "measured_at": latest.measured_at,
            })

    if not readings:
        return []

    violations = evaluate_rules(
        transformer_id=tr.id,
        rated_kva=tr.rated_kva,
        readings=readings,
        thresholds=thresholds,
        threshold_version=version,
    )

    now = datetime.now(timezone.utc)
    persisted_alerts: list[TransformerAlert] = []

    for v in violations:
        existing = (
            db.query(TransformerAlert)
            .filter(TransformerAlert.dedupe_key == v.dedupe_key)
            .first()
        )

        if existing:
            # If previously resolved, reactivate upon recurring violation
            if existing.status == "RESOLVED":
                existing.status = "ACTIVE"
                existing.resolved_at = None
                existing.acknowledged_by = None
                existing.first_seen_at = now
                existing.severity = v.severity
            elif v.severity == "CRITICAL":
                # Upgrade severity if now critical
                existing.severity = "CRITICAL"
            existing.last_seen_at = now
            existing.threshold_version = v.threshold_version
            existing.evidence_refs = json.dumps(v.evidence)
            persisted_alerts.append(existing)
        else:
            new_alert = TransformerAlert(
                id=str(uuid.uuid4()),
                transformer_id=tr.id,
                alert_type=v.alert_type,
                severity=v.severity,
                first_seen_at=now,
                last_seen_at=now,
                status="ACTIVE",
                threshold_version=v.threshold_version,
                evidence_refs=json.dumps(v.evidence),
                dedupe_key=v.dedupe_key,
                acknowledged_by=None,
                escalation_state=None,
                resolved_at=None,
            )
            db.add(new_alert)
            persisted_alerts.append(new_alert)

    db.commit()
    for a in persisted_alerts:
        db.refresh(a)
        transformer_event_bus.publish_sync(
            "alert",
            {
                "id": a.id,
                "transformer_id": a.transformer_id,
                "utility_asset_code": tr.utility_asset_code,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "status": a.status,
                "zone": tr.zone,
                "dedupe_key": a.dedupe_key,
                "threshold_version": a.threshold_version,
                "last_seen_at": a.last_seen_at.isoformat() if a.last_seen_at else None,
            },
            zone=tr.zone,
        )

    return persisted_alerts


def evaluate_all_active_transformers(db: Session) -> dict[str, Any]:
    """Batch evaluation for all active transformers (invoked by background task or manual trigger)."""
    transformers = db.query(TransformerAsset).filter(TransformerAsset.status == "IN_SERVICE").all()
    results = {}
    for tr in transformers:
        alerts = evaluate_transformer_telemetry(db, tr.id)
        if alerts:
            results[tr.utility_asset_code] = len(alerts)
    return {
        "status": "success",
        "transformers_evaluated": len(transformers),
        "transformers_with_alerts": len(results),
        "details": results,
    }
