"""Tests for Phase 12 Distribution Transformer Predictive Risk ML Model (XGBoost + SHAP).

Validates:
1. Multi-tier ML risk prediction and calibration on nominal vs extreme thermal conditions.
2. SHAP and feature attributions identifying top failure drivers.
3. Graceful fallback architecture across Tier 1 (XGBoost+SHAP), Tier 2 (scikit-learn), and Tier 3 (IEC 60076-7).
4. Full integration with assessment persistence and AI governance endpoint contracts.
"""
import os
import sys
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
os.environ["ENABLE_TRANSFORMER_SCHEDULER"] = "false"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from app.ml.transformer_risk import (
    predict_transformer_risk_ml,
    get_model_tier,
    FEATURE_NAMES,
    MODEL_VERSION,
)
from test_flow import login


def test_transformer_risk_prediction_nominal_vs_extreme():
    """Verify nominal assets yield LOW risk and overloaded/overheated assets yield HIGH risk with 7D horizon."""
    # 1. Nominal operating parameters
    nominal = predict_transformer_risk_ml({
        "utilization_pct": 52.0,
        "oil_temp_c": 55.0,
        "winding_temp_c": 65.0,
        "vibration_mms": 1.8,
        "active_critical_alerts": 0,
        "active_warning_alerts": 0,
        "age_years": 6.0,
        "voltage_thd_pct": 2.2,
        "ambient_temp_c": 32.0,
    })
    assert nominal["risk_probability"] < 0.20
    assert nominal["risk_level"] == "LOW"
    assert nominal["prediction_horizon"] == "30D"
    assert nominal["primary_driver"] in FEATURE_NAMES
    assert len(nominal["feature_attributions"]) == len(FEATURE_NAMES)
    assert len(nominal["shap_summary"]) > 0

    # 2. Extreme thermal and mechanical stress
    extreme = predict_transformer_risk_ml({
        "utilization_pct": 125.0,
        "oil_temp_c": 96.0,
        "winding_temp_c": 118.0,
        "vibration_mms": 8.2,
        "active_critical_alerts": 2,
        "active_warning_alerts": 3,
        "age_years": 26.0,
        "voltage_thd_pct": 6.5,
        "ambient_temp_c": 44.0,
    })
    assert extreme["risk_probability"] >= 0.70
    assert extreme["risk_level"] == "HIGH"
    assert extreme["prediction_horizon"] == "7D"
    assert extreme["primary_driver"] in ["winding_temp_c", "oil_temp_c", "utilization_pct", "active_critical_alerts", "vibration_mms"]
    assert any("critical" in exp.lower() or "overload" in exp.lower() or "alert" in exp.lower() for exp in extreme["explanations"])
    assert "Immediate" in extreme["recommended_review"] or "rebalancing" in extreme["recommended_review"]


def test_feature_attributions_and_shap_structure():
    """Verify all 9 feature attributions are present and sum to approximately 1.0."""
    result = predict_transformer_risk_ml({
        "utilization_pct": 98.0,
        "oil_temp_c": 86.0,
        "winding_temp_c": 102.0,
        "vibration_mms": 5.8,
    })
    attribs = result["feature_attributions"]
    assert set(attribs.keys()) == set(FEATURE_NAMES)
    for k, v in attribs.items():
        assert isinstance(v, float)
        assert v >= 0.0

    attrib_sum = sum(attribs.values())
    assert 0.95 <= attrib_sum <= 1.05, f"Attributions should sum to ~1.0, got {attrib_sum}"

    # SHAP summary sorting
    summary = result["shap_summary"]
    assert len(summary) == len(FEATURE_NAMES)
    assert summary[0]["attribution"] >= summary[-1]["attribution"]


def test_fallback_resilience_under_missing_libraries():
    """Ensure the predictor functions when native ML wheels are unavailable."""
    # Test Tier 3 IEC 60076-7 fallback directly
    with patch("app.ml.transformer_risk._TIER", "tier3_iec60076_physical"):
        res = predict_transformer_risk_ml({
            "utilization_pct": 60.0,
            "oil_temp_c": 62.0,
            "winding_temp_c": 70.0,
        })
        assert res["tier_used"] == "tier3_iec60076_physical"
        assert 0.04 <= res["risk_probability"] <= 0.98
        assert res["model_version"] == MODEL_VERSION


def test_transformer_assessment_persistence_integration():
    """Verify POST /transformers/{id}/assessments persists ML model attributions."""
    from app.db import SessionLocal
    from scripts.seed_demo_transformers import seed_demo_transformers

    with TestClient(app) as client:
        db = SessionLocal()
        try:
            seed_demo_transformers(db)
        finally:
            db.close()

        officer = login(client, "officer@vidyut.local", "Officer@123")
        admin = login(client, "admin@vidyut.local", "Admin@123")

        # Fetch North transformer
        reg_res = client.get("/transformers", headers=officer)
        assert reg_res.status_code == 200
        items = reg_res.json()["items"]
        assert len(items) >= 1
        tr_id = items[0]["id"]

        # Trigger ML Assessment
        assess_res = client.post(f"/transformers/{tr_id}/assessments", headers=officer)
        assert assess_res.status_code == 201
        data = assess_res.json()
        assert data["transformer_id"] == tr_id
        assert 0.04 <= data["risk_probability"] <= 0.98
        assert data["prediction_horizon"] in ["7D", "30D"]
        assert "features" in data
        assert "feature_attributions" in data["features"]
        assert "primary_driver" in data["features"]
        assert len(data["explanation"]) > 0


def test_ai_governance_includes_grid_asset_model_without_breaking_3_model_invariant():
    """Verify /v1/assistant/ai-governance reports Phase 12 asset model while keeping 3-model invariant."""
    with TestClient(app) as client:
        admin = login(client, "admin@vidyut.local", "Admin@123")
        gov_res = client.get("/v1/assistant/ai-governance", headers=admin)
        assert gov_res.status_code == 200
        gov = gov_res.json()

        # Strict invariant preserved
        assert len(gov["model_registry"]) == 3

        # Phase 12 Grid Asset Model Registry added
        assert "grid_asset_model_registry" in gov
        assert len(gov["grid_asset_model_registry"]) >= 1
        asset_model = gov["grid_asset_model_registry"][0]
        assert "transformer" in asset_model["model_id"].lower() or "transformer" in asset_model["task"].lower()
        assert asset_model["accuracy"] >= 0.90
        assert len(asset_model["features"]) == 9
        assert len(asset_model["top_shap_drivers"]) >= 3

        # Phase 12 Evaluation Report
        assert "phase12_evaluation_report" in gov
        assert gov["phase12_evaluation_report"]["roc_auc"] >= 0.90
