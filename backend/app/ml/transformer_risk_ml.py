"""Phase 12 Distribution Transformer Predictive Risk ML Module.

Aliases and re-exports functionality from transformer_risk.py to satisfy
both naming conventions seamlessly.
"""
from .transformer_risk import (
    FEATURE_NAMES,
    NOMINAL_BASELINES,
    MODEL_VERSION,
    predict_transformer_risk_ml,
    get_model_tier,
)

__all__ = [
    "FEATURE_NAMES",
    "NOMINAL_BASELINES",
    "MODEL_VERSION",
    "predict_transformer_risk_ml",
    "get_model_tier",
]

