"""Phase 12 Distribution Transformer Predictive Risk Engine.

Implements multi-tier predictive failure risk modeling with SHAP/feature attributions:
  Tier 1: XGBoost (xgb.XGBClassifier) + SHAP (shap.TreeExplainer)
  Tier 2: scikit-learn HistGradientBoostingClassifier + CalibratedClassifierCV
  Tier 3: IEC 60076-7 Physical-Thermal baseline with calibrated feature attributions

Outputs calibrated failure probability (7D/30D horizon), primary risk driver,
per-feature attributions, and actionable utility maintenance recommendations.
"""
from __future__ import annotations

import math
from typing import Any

try:
    from ..config import settings
except Exception:
    settings = None

MODEL_VERSION = "phase12-xgb-shap-v1.0"

FEATURE_NAMES = [
    "utilization_pct",
    "oil_temp_c",
    "winding_temp_c",
    "vibration_mms",
    "active_critical_alerts",
    "active_warning_alerts",
    "age_years",
    "voltage_thd_pct",
    "ambient_temp_c",
]

# Standard IEC 60076-7 / IEEE C57.91 reference baselines
NOMINAL_BASELINES = {
    "utilization_pct": 55.0,
    "oil_temp_c": 55.0,
    "winding_temp_c": 65.0,
    "vibration_mms": 2.0,
    "active_critical_alerts": 0.0,
    "active_warning_alerts": 0.0,
    "age_years": 8.0,
    "voltage_thd_pct": 2.5,
    "ambient_temp_c": 35.0,
}

# Detection of available ML libraries
_TIER: str | None = None
_MODEL: Any = None
_EXPLAINER: Any = None


def _generate_synthetic_training_data() -> tuple[list[list[float]], list[int]]:
    """Generate synthetic training samples conforming to IEC 60076-7 thermal stress."""
    X: list[list[float]] = []
    y: list[int] = []

    # 1. Nominal operating points (y=0)
    for u in [30.0, 45.0, 60.0, 70.0, 78.0]:
        for ot in [40.0, 50.0, 60.0, 70.0]:
            wt = ot + (u / 100.0) * 18.0
            for vib in [1.2, 2.5, 3.8]:
                for age in [2.0, 8.0, 14.0]:
                    X.append([u, ot, wt, vib, 0.0, 0.0, age, 2.2, 32.0])
                    y.append(0)

    # 2. Borderline / warning states (mixed y=0 and y=1)
    for u in [85.0, 95.0, 100.0]:
        for ot in [78.0, 84.0, 88.0]:
            wt = ot + 22.0
            for vib in [4.2, 5.0, 6.0]:
                for age in [15.0, 22.0]:
                    is_fail = int(u >= 95.0 or ot >= 85.0 or vib >= 5.5 or age >= 20.0)
                    X.append([u, ot, wt, vib, 0.0, 1.0, age, 3.8, 38.0])
                    y.append(is_fail)

    # 3. Critical failure states (y=1)
    for u in [105.0, 115.0, 130.0]:
        for ot in [92.0, 98.0, 108.0]:
            wt = ot + 28.0
            for vib in [6.5, 7.8, 9.5]:
                for age in [12.0, 24.0, 30.0]:
                    X.append([u, ot, wt, vib, 1.0, 2.0, age, 5.5, 42.0])
                    y.append(1)

    return X, y


def _init_model() -> tuple[str, Any, Any]:
    """Initialize ML model with Tier 1 -> Tier 2 -> Tier 3 fallback."""
    # Attempt Tier 1: XGBoost + SHAP
    try:
        import xgboost as xgb  # type: ignore
        import shap  # type: ignore

        X_train, y_train = _generate_synthetic_training_data()
        clf = xgb.XGBClassifier(
            n_estimators=40,
            max_depth=3,
            learning_rate=0.1,
            eval_metric="logloss",
            random_state=42,
        )
        clf.fit(X_train, y_train)
        explainer = shap.TreeExplainer(clf)
        return "tier1_xgboost_shap", clf, explainer
    except Exception:
        pass

    # Attempt Tier 2: scikit-learn HistGradientBoostingClassifier + CalibratedClassifierCV
    try:
        from sklearn.ensemble import HistGradientBoostingClassifier  # type: ignore
        from sklearn.calibration import CalibratedClassifierCV  # type: ignore

        X_train, y_train = _generate_synthetic_training_data()
        base = HistGradientBoostingClassifier(
            max_iter=40,
            max_depth=3,
            random_state=42,
        )
        clf = CalibratedClassifierCV(estimator=base, cv=3)
        clf.fit(X_train, y_train)
        return "tier2_sklearn_histgbr", clf, None
    except Exception:
        pass

    # Tier 3: Pure Python IEC 60076-7 Physical-Thermal baseline
    return "tier3_iec60076_physical", None, None


def get_model_tier() -> str:
    """Return active model tier name."""
    global _TIER, _MODEL, _EXPLAINER
    if _TIER is None:
        _TIER, _MODEL, _EXPLAINER = _init_model()
    return _TIER


def _compute_physical_iec_risk(features: dict[str, float]) -> tuple[float, dict[str, float], str]:
    """Tier 3: Pure Python physical-thermal simulation following IEC 60076-7 standards."""
    u = float(features.get("utilization_pct", NOMINAL_BASELINES["utilization_pct"]))
    ot = float(features.get("oil_temp_c", NOMINAL_BASELINES["oil_temp_c"]))
    wt = float(features.get("winding_temp_c", NOMINAL_BASELINES["winding_temp_c"]))
    vib = float(features.get("vibration_mms", NOMINAL_BASELINES["vibration_mms"]))
    crit_alerts = float(features.get("active_critical_alerts", 0.0))
    warn_alerts = float(features.get("active_warning_alerts", 0.0))
    age = float(features.get("age_years", NOMINAL_BASELINES["age_years"]))
    thd = float(features.get("voltage_thd_pct", NOMINAL_BASELINES["voltage_thd_pct"]))
    amb = float(features.get("ambient_temp_c", NOMINAL_BASELINES["ambient_temp_c"]))

    # 1. IEC 60076-7 Relative Aging Acceleration V = 2^((wt - 98) / 6)
    clamped_wt = max(40.0, min(140.0, wt))
    v_aging = math.pow(2.0, (clamped_wt - 98.0) / 6.0)

    # 2. Non-linear stress contributions (calibrated logit components)
    # Winding hot-spot stress
    if wt >= 110.0:
        z_wt = 2.4 + (wt - 110.0) * 0.10
    elif wt >= 98.0:
        z_wt = 1.2 + (wt - 98.0) * 0.10
    elif wt >= 85.0:
        z_wt = 0.4 + (wt - 85.0) * 0.05
    else:
        z_wt = -0.5

    # Oil temp stress
    if ot >= 90.0:
        z_ot = 1.8 + (ot - 90.0) * 0.08
    elif ot >= 80.0:
        z_ot = 0.8 + (ot - 80.0) * 0.08
    else:
        z_ot = -0.4

    # Utilization loading stress
    if u >= 110.0:
        z_u = 2.0 + (u - 110.0) * 0.08
    elif u >= 95.0:
        z_u = 1.0 + (u - 95.0) * 0.06
    elif u >= 80.0:
        z_u = 0.3 + (u - 80.0) * 0.04
    else:
        z_u = -0.5

    # Vibration mechanical stress
    if vib >= 7.1:
        z_vib = 1.8 + (vib - 7.1) * 0.20
    elif vib >= 4.5:
        z_vib = 0.7 + (vib - 4.5) * 0.20
    else:
        z_vib = -0.3

    # Operational alerts
    z_alerts = (crit_alerts * 1.6) + (warn_alerts * 0.5)

    # Asset aging
    if age >= 25.0:
        z_age = 0.8 + (age - 25.0) * 0.04
    elif age >= 15.0:
        z_age = 0.3
    else:
        z_age = -0.2

    # THD / Power quality
    z_thd = max(0.0, (thd - 4.0) * 0.20)

    # Ambient thermal delta
    z_amb = max(0.0, (amb - 40.0) * 0.08)

    # Total log-odds with tuned intercept (nominal sits at ~0.06-0.08 risk)
    z_total = -2.2 + (0.55 * z_wt) + (0.45 * z_ot) + (0.45 * z_u) + (0.35 * z_vib) + (0.50 * z_alerts) + (0.20 * z_age) + (0.10 * z_thd) + (0.10 * z_amb)

    # Logistic calibration
    prob = 1.0 / (1.0 + math.exp(-z_total))
    prob = min(0.98, max(0.04, round(prob, 3)))

    # Compute relative feature attributions (positive contributions)
    components = {
        "winding_temp_c": max(0.0, z_wt + 0.5),
        "oil_temp_c": max(0.0, z_ot + 0.4),
        "utilization_pct": max(0.0, z_u + 0.5),
        "vibration_mms": max(0.0, z_vib + 0.3),
        "active_critical_alerts": max(0.0, crit_alerts * 1.6),
        "active_warning_alerts": max(0.0, warn_alerts * 0.5),
        "age_years": max(0.0, z_age + 0.2),
        "voltage_thd_pct": z_thd,
        "ambient_temp_c": z_amb,
    }
    total_comp = sum(components.values()) or 1.0
    attributions = {k: round(v / total_comp, 3) for k, v in components.items()}

    # Primary driver is feature with highest positive contribution
    primary = max(attributions.items(), key=lambda x: x[1])[0]

    return prob, attributions, primary


def predict_transformer_risk_ml(features: dict[str, float]) -> dict[str, Any]:
    """Calculate multi-factor predictive failure risk with SHAP / feature attributions.

    Accepts features dictionary and returns full risk prediction and explainability payload.
    """
    global _TIER, _MODEL, _EXPLAINER
    if _TIER is None:
        _TIER, _MODEL, _EXPLAINER = _init_model()

    # Clean & fill input features
    cleaned: dict[str, float] = {}
    for k in FEATURE_NAMES:
        val = features.get(k)
        if val is None or not math.isfinite(float(val)):
            cleaned[k] = NOMINAL_BASELINES[k]
        else:
            cleaned[k] = float(val)

    feature_vector = [cleaned[k] for k in FEATURE_NAMES]
    tier_used = _TIER

    risk_prob = 0.08
    attributions: dict[str, float] = {}
    primary_driver = "winding_temp_c"
    model_name = "iec60076-thermal-baseline"

    mode = getattr(settings, "transformer_risk_mode", "ml_advisory") if settings else "ml_advisory"
    if mode == "rules_baseline":
        risk_prob, attributions, primary_driver = _compute_physical_iec_risk(cleaned)
        model_name = "rules-baseline-v1"
        tier_used = "rules_baseline"
        model_version = "rules-baseline-v1"
    else:
        model_version = MODEL_VERSION
        # Tier 1: XGBoost + SHAP
        if _TIER == "tier1_xgboost_shap" and _MODEL is not None and _EXPLAINER is not None:
            try:
                import numpy as np  # type: ignore

                X = np.array([feature_vector], dtype=float)
                probs = _MODEL.predict_proba(X)[0]
                risk_prob = min(0.98, max(0.04, round(float(probs[1]), 3)))

                # SHAP explainer
                shap_raw = _EXPLAINER.shap_values(X)
                # Depending on shap version, shap_raw may be list of arrays or 2D array
                if isinstance(shap_raw, list):
                    shap_vec = shap_raw[1][0] if len(shap_raw) > 1 else shap_raw[0][0]
                elif hasattr(shap_raw, "values"):
                    shap_vec = shap_raw.values[0]
                else:
                    shap_vec = shap_raw[0]

                # Normalize positive contributions
                raw_attribs = {FEATURE_NAMES[i]: float(shap_vec[i]) for i in range(len(FEATURE_NAMES))}
                # Feature attributions as positive weights summing to ~1.0
                pos_attribs = {k: max(0.0, v) for k, v in raw_attribs.items()}
                tot_pos = sum(pos_attribs.values()) or 1.0
                attributions = {k: round(v / tot_pos, 3) for k, v in pos_attribs.items()}
                primary_driver = max(attributions.items(), key=lambda x: x[1])[0]
                model_name = "xgboost-tree-explainer"
            except Exception:
                # Graceful degrade to physical baseline
                tier_used = "tier3_iec60076_physical"

        # Tier 2: scikit-learn HistGradientBoostingClassifier
        elif _TIER == "tier2_sklearn_histgbr" and _MODEL is not None:
            try:
                probs = _MODEL.predict_proba([feature_vector])[0]
                risk_prob = min(0.98, max(0.04, round(float(probs[1]), 3)))

                # Feature attribution via physical alignment
                _, attributions, primary_driver = _compute_physical_iec_risk(cleaned)
                model_name = "hist-gbr-calibrated"
            except Exception:
                tier_used = "tier3_iec60076_physical"

        # Tier 3 fallback
        if tier_used == "tier3_iec60076_physical":
            risk_prob, attributions, primary_driver = _compute_physical_iec_risk(cleaned)
            model_name = "iec60076-thermal-baseline"

    # Horizon, level, recommendations
    if risk_prob >= 0.70:
        horizon = "7D"
        risk_level = "HIGH"
        recommended_action = "Immediate DTR load rebalancing, urgent thermal imaging, and on-site dissolved gas analysis (DGA) required within 48 hours."
    elif risk_prob >= 0.35:
        horizon = "30D"
        risk_level = "MEDIUM"
        recommended_action = "Schedule field inspection, thermal imaging, and feeder patrol within 7 days."
    else:
        horizon = "30D"
        risk_level = "LOW"
        recommended_action = "Nominal operating parameters; maintain standard monthly inspection interval."

    # Explanations generation
    explanations: list[str] = []
    u = cleaned["utilization_pct"]
    ot = cleaned["oil_temp_c"]
    wt = cleaned["winding_temp_c"]
    vib = cleaned["vibration_mms"]
    crit = int(cleaned["active_critical_alerts"])
    warn = int(cleaned["active_warning_alerts"])
    age = cleaned["age_years"]

    if wt >= 105.0:
        aging_rate = math.pow(2.0, (wt - 98.0) / 6.0)
        explanations.append(
            f"Critical winding hot-spot temperature ({wt:.1f}°C) causes severe accelerated insulation degradation (IEC 60076-7 rate: {aging_rate:.1f}x nominal)."
        )
    elif wt >= 95.0:
        explanations.append(f"Elevated winding temperature ({wt:.1f}°C) operates above standard 90°C thermal design margin.")

    if ot >= 90.0:
        explanations.append(f"Top oil temperature ({ot:.1f}°C) exceeds critical 90°C threshold; transformer oil oxidation risk.")
    elif ot >= 80.0:
        explanations.append(f"Elevated oil temperature ({ot:.1f}°C) in warning range (80-90°C).")

    if u >= 110.0:
        explanations.append(f"Severe overload: operating at {u:.1f}% rated capacity limit.")
    elif u >= 100.0:
        explanations.append(f"Operating at nameplate capacity limit ({u:.1f}% load).")
    elif u >= 85.0:
        explanations.append(f"High continuous utilization ({u:.1f}% load).")

    if vib >= 7.1:
        explanations.append(f"Severe mechanical vibration ({vib:.2f} mm/s RMS) indicates core clamp loosening or abnormal mechanical resonance.")
    elif vib >= 4.5:
        explanations.append(f"Elevated mechanical vibration ({vib:.2f} mm/s RMS) above ISO 10816-3 warning boundary.")

    if crit > 0:
        explanations.append(f"{crit} unresolved CRITICAL operational alert(s) requiring active intervention.")
    if warn > 0:
        explanations.append(f"{warn} unresolved WARNING operational alert(s).")

    if age >= 25.0:
        explanations.append(f"Asset age ({age:.1f} years) exceeds typical 25-year design life; paper insulation tensile degradation.")

    if not explanations:
        explanations.append("All monitored thermal, electrical, and mechanical parameters remain within nominal IEC envelopes.")

    # SHAP summary structure
    shap_summary = [
        {
            "feature": f,
            "attribution": attributions.get(f, 0.0),
            "value": cleaned[f],
            "impact": "INCREASES_RISK" if attributions.get(f, 0.0) >= 0.15 else "NOMINAL",
        }
        for f in sorted(attributions.keys(), key=lambda k: attributions[k], reverse=True)
    ]

    return {
        "risk_probability": risk_prob,
        "risk_score": round(risk_prob * 100.0, 1),
        "risk_level": risk_level,
        "prediction_horizon": horizon,
        "primary_driver": primary_driver,
        "feature_attributions": attributions,
        "shap_summary": shap_summary,
        "recommended_review": recommended_action,
        "model_name": model_name,
        "model_version": model_version,
        "tier_used": tier_used,
        "explanations": explanations,
        "features": cleaned,
    }
