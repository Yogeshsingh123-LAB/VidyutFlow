"""Unit tests for Phase 12 Step 5: Pure Rules Engine for Transformer Telemetry."""
from datetime import datetime, timezone
from pathlib import Path
import sys
import pytest

try:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
    import export_openapi
except Exception:
    pass

from app.services.rules_engine import (
    DEFAULT_THRESHOLDS,
    evaluate_rules,
)


def now_utc():
    return datetime.now(timezone.utc)


def test_pure_rules_engine_normal_telemetry_returns_zero_violations():
    readings = [
        {"sensor_type": "LOAD_KVA", "value": 150.0, "unit": "kVA", "sensor_id": "s1", "measured_at": now_utc()},
        {"sensor_type": "OIL_TEMP", "value": 55.0, "unit": "°C", "sensor_id": "s2", "measured_at": now_utc()},
        {"sensor_type": "WINDING_TEMP", "value": 65.0, "unit": "°C", "sensor_id": "s3", "measured_at": now_utc()},
        {"sensor_type": "VIBRATION", "value": 2.1, "unit": "mm/s", "sensor_id": "s4", "measured_at": now_utc()},
    ]

    # rated 315 kVA -> 150 kVA is ~47.6% (well below 85% warn)
    violations = evaluate_rules(
        transformer_id="TR-01",
        rated_kva=315.0,
        readings=readings,
        thresholds=DEFAULT_THRESHOLDS,
    )
    assert len(violations) == 0


def test_pure_rules_engine_warn_and_critical_thresholds():
    # 1. Overload: rated 100 kVA. 88 kVA = 88% (WARN >= 85%), 105 kVA = 105% (CRITICAL >= 100%)
    v_warn = evaluate_rules(
        transformer_id="TR-01",
        rated_kva=100.0,
        readings=[{"sensor_type": "LOAD_KVA", "value": 88.0, "unit": "kVA", "sensor_id": "s1", "measured_at": now_utc()}],
        thresholds=DEFAULT_THRESHOLDS,
    )
    assert len(v_warn) == 1
    assert v_warn[0].alert_type == "OVERLOAD"
    assert v_warn[0].severity == "WARN"
    assert v_warn[0].dedupe_key == "TR-01:OVERLOAD"
    assert v_warn[0].value == 88.0

    v_crit = evaluate_rules(
        transformer_id="TR-01",
        rated_kva=100.0,
        readings=[{"sensor_type": "LOAD_KVA", "value": 105.0, "unit": "kVA", "sensor_id": "s1", "measured_at": now_utc()}],
        thresholds=DEFAULT_THRESHOLDS,
    )
    assert len(v_crit) == 1
    assert v_crit[0].alert_type == "OVERLOAD"
    assert v_crit[0].severity == "CRITICAL"

    # 2. Oil Temp: 85°C (WARN >= 80), 95°C (CRITICAL >= 90)
    v_oil_warn = evaluate_rules(
        transformer_id="TR-01",
        rated_kva=100.0,
        readings=[{"sensor_type": "OIL_TEMP", "value": 85.0, "unit": "°C", "sensor_id": "s2", "measured_at": now_utc()}],
        thresholds=DEFAULT_THRESHOLDS,
    )
    assert len(v_oil_warn) == 1
    assert v_oil_warn[0].alert_type == "OIL_TEMP_HIGH"
    assert v_oil_warn[0].severity == "WARN"
    assert v_oil_warn[0].dedupe_key == "TR-01:OIL_TEMP_HIGH"

    v_oil_crit = evaluate_rules(
        transformer_id="TR-01",
        rated_kva=100.0,
        readings=[{"sensor_type": "OIL_TEMP", "value": 92.0, "unit": "°C", "sensor_id": "s2", "measured_at": now_utc()}],
        thresholds=DEFAULT_THRESHOLDS,
    )
    assert len(v_oil_crit) == 1
    assert v_oil_crit[0].alert_type == "OIL_TEMP_HIGH"
    assert v_oil_crit[0].severity == "CRITICAL"

    # 3. Winding Temp: 95°C (WARN >= 90), 108°C (CRITICAL >= 105)
    v_wind_warn = evaluate_rules(
        transformer_id="TR-01",
        rated_kva=100.0,
        readings=[{"sensor_type": "WINDING_TEMP", "value": 95.0, "unit": "°C", "sensor_id": "s3", "measured_at": now_utc()}],
        thresholds=DEFAULT_THRESHOLDS,
    )
    assert len(v_wind_warn) == 1
    assert v_wind_warn[0].alert_type == "WINDING_TEMP_HIGH"
    assert v_wind_warn[0].severity == "WARN"

    v_wind_crit = evaluate_rules(
        transformer_id="TR-01",
        rated_kva=100.0,
        readings=[{"sensor_type": "WINDING_TEMP", "value": 110.0, "unit": "°C", "sensor_id": "s3", "measured_at": now_utc()}],
        thresholds=DEFAULT_THRESHOLDS,
    )
    assert len(v_wind_crit) == 1
    assert v_wind_crit[0].alert_type == "WINDING_TEMP_HIGH"
    assert v_wind_crit[0].severity == "CRITICAL"

    # 4. Vibration: 5.2 mm/s (WARN >= 4.5), 7.8 mm/s (CRITICAL >= 7.1)
    v_vib_crit = evaluate_rules(
        transformer_id="TR-01",
        rated_kva=100.0,
        readings=[{"sensor_type": "VIBRATION", "value": 7.8, "unit": "mm/s", "sensor_id": "s4", "measured_at": now_utc()}],
        thresholds=DEFAULT_THRESHOLDS,
    )
    assert len(v_vib_crit) == 1
    assert v_vib_crit[0].alert_type == "HIGH_VIBRATION"
    assert v_vib_crit[0].severity == "CRITICAL"
    assert v_vib_crit[0].dedupe_key == "TR-01:HIGH_VIBRATION"


def test_pure_rules_engine_multiple_violations_in_single_batch():
    readings = [
        {"sensor_type": "LOAD_KVA", "value": 110.0, "unit": "kVA", "sensor_id": "s1", "measured_at": now_utc()},
        {"sensor_type": "OIL_TEMP", "value": 94.0, "unit": "°C", "sensor_id": "s2", "measured_at": now_utc()},
        {"sensor_type": "WINDING_TEMP", "value": 70.0, "unit": "°C", "sensor_id": "s3", "measured_at": now_utc()},
    ]
    # rated 100kVA -> load is 110% (CRIT), oil is 94°C (CRIT), winding is normal
    violations = evaluate_rules(
        transformer_id="TR-DEMO-02",
        rated_kva=100.0,
        readings=readings,
        thresholds=DEFAULT_THRESHOLDS,
    )
    assert len(violations) == 2
    types = {v.alert_type for v in violations}
    assert types == {"OVERLOAD", "OIL_TEMP_HIGH"}
    assert all(v.severity == "CRITICAL" for v in violations)
