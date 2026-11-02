import json, os
import joblib
from ..config import settings

_cache = {}
SAFETY_CRITICAL_TERMS = (
    "live wire", "sparking", "electric shock", "electrocution", "short circuit",
    "exposed cable", "wire hanging", "pole leaning", "fire risk", "electrical fire",
    "fire in meter box",
)

def _load(name):
    if name not in _cache:
        p = os.path.join(settings.model_dir, name)
        _cache[name] = joblib.load(p) if os.path.exists(p) else None
    return _cache[name]

def ensure_models():
    required = (
        "category_model.joblib",
        "severity_model.joblib",
        "sla_model.joblib",
        "billing_anomaly_model.joblib",
        "load_forecast_model.joblib",
    )
    if any(_load(name) is None for name in required):
        _cache.clear()
        from .train import train; train(settings.model_dir)

def classify_text(text: str):
    text = (text or "").strip()
    normalized = text.casefold()
    # Safety signals get a conservative deterministic escalation because the
    # synthetic text classifier has weak recall on unseen safety phrasing.
    if any(term in normalized for term in SAFETY_CRITICAL_TERMS):
        from .governance import governance_monitor
        governance_monitor.record_classification("SAFETY", safety_override=True)
        return "SAFETY", "CRITICAL"
    ensure_models()
    cat_m, sev_m = _load("category_model.joblib"), _load("severity_model.joblib")
    if not text or cat_m is None:
        from .governance import governance_monitor
        governance_monitor.record_classification("NEW_CONNECTION", safety_override=False)
        return "NEW_CONNECTION", "MEDIUM"
    cat_pred, sev_pred = str(cat_m.predict([text])[0]), str(sev_m.predict([text])[0])
    from .governance import governance_monitor
    governance_monitor.record_classification(cat_pred, safety_override=False)
    return cat_pred, sev_pred

def sla_risk(load_kw, category, severity, documents_complete, zone_pending, is_weekend=False):
    ensure_models(); m = _load("sla_model.joblib")
    from .governance import governance_monitor
    governance_monitor.record_sla_inference()
    reasons = []
    if not documents_complete: reasons.append("Documents incomplete — likely rework / follow-up")
    if zone_pending >= 20: reasons.append(f"High workload in zone ({zone_pending} pending requests)")
    elif zone_pending >= 10: reasons.append(f"Moderate workload in zone ({zone_pending} pending)")
    if load_kw >= 10: reasons.append(f"High requested load ({load_kw} kW) — needs higher-level approval")
    if severity in ("HIGH","CRITICAL"): reasons.append(f"{severity} severity needs priority field visit")
    if is_weekend: reasons.append("Submitted on a weekend — first working-day queue is longer")
    if m is None: return (0.7 if reasons else 0.2), (reasons or ["No major risk factors detected"])
    import pandas as pd
    X = pd.DataFrame([{"requested_load_kw": load_kw, "category": category, "severity": severity,
        "documents_complete": int(documents_complete), "zone_pending": zone_pending,
        "is_weekend_submission": int(is_weekend)}])
    prob = float(m.predict_proba(X)[0][list(m.classes_).index(1)]) if 1 in list(m.classes_) else 0.0
    return round(prob, 3), (reasons or ["No major risk factors detected"])

def metrics():
    p = os.path.join(settings.model_dir, "metrics.json")
    return json.load(open(p)) if os.path.exists(p) else {"data_notice": "Models not trained yet."}
