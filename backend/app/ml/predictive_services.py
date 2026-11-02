"""AI-Assisted Predictive Decision Support (Billing Anomaly Detection & 24h Feeder Load Forecasting).

Uses trained scikit-learn models (`billing_anomaly_model.joblib` IsolationForest and
`load_forecast_model.joblib` GradientBoostingRegressor) trained on synthetic UGVCL-shaped
features — strictly advisory decision support for officers/engineers (human decides).
"""
import math
import pandas as pd

from .predict import _load, ensure_models
from .synthetic import (
    BILLING_ANOMALY_FEATURES,
    LOAD_FORECAST_FEATURES,
    compute_rgpu_slab_inr,
)

ZONE_TO_INDEX = {
    "North": 0,
    "South": 1,
    "East": 2,
    "West": 3,
    "Central": 4,
}

DEFAULT_RATED_KVA_BY_ZONE = {
    "North": 315.0,
    "South": 315.0,
    "East": 200.0,
    "West": 200.0,
    "Central": 500.0,
}


def detect_billing_anomaly(
    *,
    consumer_no: str,
    units_kwh: float,
    historical_avg_kwh: float,
    sanctioned_load_kw: float,
    billed_energy_inr: float | None = None,
) -> dict:
    """Evaluate a consumer billing record using IsolationForest + deterministic tariff audit rules."""
    ensure_models()
    iso = _load("billing_anomaly_model.joblib")
    expected_slab_inr = compute_rgpu_slab_inr(units_kwh)
    actual_billed_inr = (
        round(float(billed_energy_inr), 2)
        if billed_energy_inr is not None
        else expected_slab_inr
    )

    ratio = round(float(units_kwh) / max(float(historical_avg_kwh), 1.0), 4)
    kwh_per_kw = round(float(units_kwh) / max(float(sanctioned_load_kw), 0.5), 4)
    slab_disc_inr = round(actual_billed_inr - expected_slab_inr, 2)
    slab_disc_pct = round(abs(slab_disc_inr) / max(expected_slab_inr, 25.0), 4)
    zero_flag = int(float(units_kwh) <= 3.0 and float(historical_avg_kwh) >= 60.0)

    X = pd.DataFrame(
        [
            {
                "consumption_ratio": ratio,
                "kwh_per_kw": kwh_per_kw,
                "slab_discrepancy_pct": slab_disc_pct,
                "zero_read_flag": zero_flag,
            }
        ]
    )[BILLING_ANOMALY_FEATURES]

    model_flag = False
    decision_score = 0.0
    if iso is not None:
        pred = int(iso.predict(X)[0])
        raw_score = float(iso.decision_function(X)[0])
        decision_score = round(max(0.0, min(1.0, 0.5 - raw_score)), 3)
        model_flag = pred == -1

    reasons: list[str] = []
    if ratio >= 2.2:
        reasons.append(
            f"Consumption spike: {units_kwh} kWh is {ratio:.1f}x historical average ({historical_avg_kwh} kWh)"
        )
    if zero_flag:
        reasons.append(
            f"Suspected stuck/bypassed meter: {units_kwh} kWh recorded against {historical_avg_kwh} kWh baseline"
        )
    if kwh_per_kw >= 220.0:
        reasons.append(
            f"Sanctioned load stress: {kwh_per_kw:.0f} kWh per kW exceeds typical {sanctioned_load_kw} kW load factor"
        )
    if abs(slab_disc_inr) >= 50.0 and slab_disc_pct >= 0.06:
        reasons.append(
            f"Tariff slab variance: billed ₹{actual_billed_inr:.2f} vs computed RGPU slab ₹{expected_slab_inr:.2f} (Δ ₹{slab_disc_inr:+.2f})"
        )

    is_anomaly = bool(model_flag or reasons)
    severity = (
        "HIGH"
        if (ratio >= 3.0 or zero_flag or slab_disc_pct >= 0.20)
        else ("MEDIUM" if is_anomaly else "NORMAL")
    )
    recommended_action = (
        "Queue officer billing audit & field optical-port MRI meter check before invoice dispatch."
        if is_anomaly
        else "Within normal consumption & GERC RGPU slab tolerance — safe for automated billing cycle."
    )

    return {
        "data_notice": "SYNTHETIC IsolationForest + RGPU slab check — advisory triage only, human officer decides.",
        "consumer_no": consumer_no,
        "is_anomaly": is_anomaly,
        "severity": severity,
        "anomaly_score": decision_score if not reasons else max(decision_score, 0.72),
        "metrics": {
            "units_kwh": round(float(units_kwh), 2),
            "historical_avg_kwh": round(float(historical_avg_kwh), 2),
            "consumption_ratio": ratio,
            "expected_slab_inr": expected_slab_inr,
            "billed_energy_inr": actual_billed_inr,
            "slab_variance_inr": slab_disc_inr,
        },
        "reasons": reasons or ["No consumption spike, zero-read pattern, or tariff slab discrepancy detected"],
        "recommended_action": recommended_action,
    }


def forecast_feeder_load(
    *,
    zone: str = "North",
    ambient_temp_c: float = 36.0,
    rated_kva: float | None = None,
    pending_load_kw: float = 0.0,
) -> dict:
    """Predict 24-hour 11kV DTR / feeder kVA load profile using GradientBoostingRegressor."""
    ensure_models()
    gbr = _load("load_forecast_model.joblib")

    canonical_zone = zone if zone in ZONE_TO_INDEX else "North"
    zone_idx = ZONE_TO_INDEX[canonical_zone]
    cap_kva = float(rated_kva or DEFAULT_RATED_KVA_BY_ZONE.get(canonical_zone, 315.0))
    temp_c = max(10.0, min(52.0, float(ambient_temp_c)))
    pend_kw = max(0.0, float(pending_load_kw))

    rows = []
    for hour in range(24):
        rows.append(
            {
                "hour": hour,
                "sin_hour": round(math.sin(2 * math.pi * hour / 24.0), 5),
                "cos_hour": round(math.cos(2 * math.pi * hour / 24.0), 5),
                "ambient_temp_c": temp_c,
                "zone_idx": zone_idx,
                "rated_kva": cap_kva,
                "pending_load_kw": pend_kw,
            }
        )
    X = pd.DataFrame(rows)[LOAD_FORECAST_FEATURES]
    preds = gbr.predict(X) if gbr is not None else [cap_kva * 0.65] * 24

    hourly = []
    for h, kva in enumerate(preds):
        predicted_kva = round(max(10.0, float(kva)), 2)
        util_pct = round((predicted_kva / cap_kva) * 100.0, 1)
        hourly.append(
            {
                "hour": f"{h:02d}:00",
                "predicted_kva": predicted_kva,
                "utilization_pct": util_pct,
                "overload_warning": util_pct >= 90.0,
            }
        )

    peak_point = max(hourly, key=lambda x: x["predicted_kva"])
    overload_hours = [pt["hour"] for pt in hourly if pt["overload_warning"]]

    if peak_point["utilization_pct"] >= 95.0:
        recommendation = (
            f"CRITICAL PEAK ({peak_point['utilization_pct']}% at {peak_point['hour']}): "
            "Pre-switch APFC capacitor bank & schedule load transfer to adjacent 11kV ring feeder before sanctioning new ≥10 kW loads."
        )
        risk_band = "HIGH"
    elif peak_point["utilization_pct"] >= 82.0:
        recommendation = (
            f"ELEVATED PEAK ({peak_point['utilization_pct']}% at {peak_point['hour']}): "
            "Feeder approaching thermal watch band; stagger agricultural pump-set slot or inspect DTR oil temperature."
        )
        risk_band = "WATCH"
    else:
        recommendation = (
            f"HEALTHY MARGIN ({peak_point['utilization_pct']}% peak at {peak_point['hour']}): "
            "Sufficient DTR headroom available for pending service sanctions."
        )
        risk_band = "NORMAL"

    return {
        "data_notice": "SYNTHETIC GradientBoosting 24h load forecast — decision-support model, not live SCADA telemetry.",
        "zone": canonical_zone,
        "rated_capacity_kva": cap_kva,
        "ambient_temp_c": temp_c,
        "active_pending_load_kw": round(pend_kw, 2),
        "peak_hour": peak_point["hour"],
        "peak_kva": peak_point["predicted_kva"],
        "peak_utilization_pct": peak_point["utilization_pct"],
        "overload_hours": overload_hours,
        "risk_band": risk_band,
        "recommended_action": recommendation,
        "hourly_profile": hourly,
    }
