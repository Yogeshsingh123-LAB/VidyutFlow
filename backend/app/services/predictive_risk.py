"""Predictive Risk Baseline service for Phase 12 Distribution Transformers.

Computes multi-factor risk probability, prediction horizon, uncertainty,
feature attribution, and recommended actions based on telemetry history,
thermal load, operational alerts, and asset age.
"""
from datetime import datetime, timezone
import json
from typing import Any
from sqlalchemy.orm import Session

from ..models import (
    User,
    TransformerAsset,
    TransformerSensor,
    TelemetryReading,
    TransformerAlert,
    MaintenanceAssessment,
)
from ..ml.transformer_risk import predict_transformer_risk_ml, MODEL_VERSION


def calculate_transformer_risk(db: Session, transformer: TransformerAsset) -> dict[str, Any]:
    """Calculate predictive risk metrics for a single transformer asset."""
    now = datetime.now(timezone.utc)
    rated_kva = float(transformer.rated_kva or 315.0)

    # 1. Fetch latest readings for each sensor type
    sensors = (
        db.query(TransformerSensor)
        .filter(TransformerSensor.transformer_id == transformer.id, TransformerSensor.active == True)
        .all()
    )

    latest_by_type: dict[str, TelemetryReading] = {}
    for s in sensors:
        r = (
            db.query(TelemetryReading)
            .filter(TelemetryReading.sensor_id == s.id)
            .order_by(TelemetryReading.measured_at.desc())
            .first()
        )
        if r:
            latest_by_type[s.sensor_type] = r

    load_reading = latest_by_type.get("LOAD_KVA")
    oil_temp_reading = latest_by_type.get("OIL_TEMP")
    winding_temp_reading = latest_by_type.get("WINDING_TEMP")
    vibration_reading = latest_by_type.get("HIGH_VIBRATION") or latest_by_type.get("VIBRATION")

    # 2. Extract values & compute ratios
    load_kva = float(load_reading.value) if load_reading else (rated_kva * 0.50)
    utilization_pct = round((load_kva / rated_kva) * 100.0, 1)
    oil_temp = float(oil_temp_reading.value) if oil_temp_reading else 55.0
    winding_temp = float(winding_temp_reading.value) if winding_temp_reading else 65.0
    vibration_val = float(vibration_reading.value) if vibration_reading else 2.0

    # 3. Active alerts
    active_alerts = (
        db.query(TransformerAlert)
        .filter(
            TransformerAlert.transformer_id == transformer.id,
            TransformerAlert.status.in_(["ACTIVE", "ACKNOWLEDGED"]),
        )
        .all()
    )
    critical_alerts = sum(1 for a in active_alerts if a.severity == "CRITICAL")
    warn_alerts = sum(1 for a in active_alerts if a.severity == "WARN")

    # 4. Asset Age
    age_years = 5.0
    if transformer.commissioning_date:
        age_years = max(0.5, round((now.date() - transformer.commissioning_date).days / 365.25, 1))

    # 5. ML Predictive Risk with SHAP / feature attributions
    ml_input = {
        "utilization_pct": utilization_pct,
        "oil_temp_c": oil_temp,
        "winding_temp_c": winding_temp,
        "vibration_mms": vibration_val,
        "active_critical_alerts": float(critical_alerts),
        "active_warning_alerts": float(warn_alerts),
        "age_years": age_years,
        "voltage_thd_pct": 2.5,
        "ambient_temp_c": 35.0,
    }
    ml_result = predict_transformer_risk_ml(ml_input)

    risk_prob = ml_result["risk_probability"]
    explanations = list(ml_result["explanations"])

    # Asset state adjustments
    if transformer.status == "FAULT":
        risk_prob = max(risk_prob, 0.95)
        explanations.insert(0, "Transformer is in FAULT state")
    elif transformer.status == "MAINTENANCE":
        risk_prob = min(0.95, max(risk_prob, 0.35))
        explanations.insert(0, "Transformer currently undergoing scheduled maintenance")

    # Horizon and level reconciliation
    if risk_prob >= 0.70:
        horizon = "7D"
        risk_level = "HIGH"
        recommended_action = ml_result["recommended_review"]
    elif risk_prob >= 0.35:
        horizon = "30D"
        risk_level = "MEDIUM"
        recommended_action = ml_result["recommended_review"]
    else:
        horizon = "30D"
        risk_level = "LOW"
        recommended_action = ml_result["recommended_review"]

    # 6. Uncertainty evaluation (based on sensor telemetry availability)
    sensor_count = len(latest_by_type)
    if sensor_count >= 4:
        uncertainty = 0.05
    elif sensor_count >= 2:
        uncertainty = 0.15
    elif sensor_count >= 1:
        uncertainty = 0.25
    else:
        uncertainty = 0.35
        explanations.append("Limited active sensor telemetry; risk estimated from asset nameplate baseline")

    features = {
        "load_kva": load_kva,
        "rated_kva": rated_kva,
        "utilization_pct": utilization_pct,
        "oil_temp_c": oil_temp,
        "winding_temp_c": winding_temp,
        "vibration_mms": vibration_val,
        "active_critical_alerts": critical_alerts,
        "active_warning_alerts": warn_alerts,
        "age_years": age_years,
        "status": transformer.status,
        "sensors_reporting": sensor_count,
        "primary_driver": ml_result["primary_driver"],
        "feature_attributions": ml_result["feature_attributions"],
        "shap_summary": ml_result["shap_summary"],
        "model_name": ml_result["model_name"],
        "tier_used": ml_result["tier_used"],
    }

    return {
        "transformer_id": transformer.id,
        "utility_asset_code": transformer.utility_asset_code,
        "zone": transformer.zone,
        "risk_probability": risk_prob,
        "risk_level": risk_level,
        "uncertainty": uncertainty,
        "prediction_horizon": horizon,
        "model_version": ml_result["model_version"],
        "primary_driver": ml_result["primary_driver"],
        "feature_attributions": ml_result["feature_attributions"],
        "shap_summary": ml_result["shap_summary"],
        "model_name": ml_result["model_name"],
        "tier_used": ml_result["tier_used"],
        "features": features,
        "explanation": explanations or ["All monitored parameters are within nominal threshold limits."],
        "recommended_review": recommended_action,
    }


def assess_and_persist_transformer_risk(
    db: Session,
    transformer: TransformerAsset,
    actor: User | None = None,
) -> MaintenanceAssessment:
    """Compute and persist a MaintenanceAssessment record."""
    risk_data = calculate_transformer_risk(db, transformer)
    now = datetime.now(timezone.utc)

    assessment = MaintenanceAssessment(
        transformer_id=transformer.id,
        generated_at=now,
        prediction_horizon=risk_data["prediction_horizon"],
        risk_probability=risk_data["risk_probability"],
        uncertainty=risk_data["uncertainty"],
        model_version=risk_data["model_version"],
        features=json.dumps(risk_data["features"]),
        explanation=json.dumps(risk_data["explanation"]),
        recommended_review=risk_data["recommended_review"],
        human_decision="PENDING",
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment

