import json, os
import joblib
from ..config import settings

_cache = {}
def _load(name):
    if name not in _cache:
        p = os.path.join(settings.model_dir, name)
        _cache[name] = joblib.load(p) if os.path.exists(p) else None
    return _cache[name]

def ensure_models():
    if _load("category_model.joblib") is None:
        from .train import train; train(settings.model_dir)

def classify_text(text: str):
    ensure_models(); text = (text or "").strip()
    cat_m, sev_m = _load("category_model.joblib"), _load("severity_model.joblib")
    if not text or cat_m is None:
        return "NEW_CONNECTION", "MEDIUM"
    return str(cat_m.predict([text])[0]), str(sev_m.predict([text])[0])

def sla_risk(load_kw, category, severity, documents_complete, zone_pending, is_weekend=False):
    ensure_models(); m = _load("sla_model.joblib")
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
