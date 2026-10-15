# ML report (synthetic data only)
Code: `backend/app/ml/` (`synthetic.py` → `train.py` → `predict.py`). Results: `backend/app/ml/models/metrics.json`
(tracked in git; model binaries are regenerated on first start — retrain with `cd backend && python scripts/train_models.py`).
Live at `GET /assistant/ml-metrics`.
1. **Complaint/fault classifier** — TF-IDF (1–2 g) + Logistic Regression → category, and a second model → severity; drives routing priority.
2. **SLA-breach risk predictor** — Random Forest over load, documents-complete, zone pending, weekend, category, severity → probability + human-readable reasons.
**Caveats:** synthetic text is templated, so classifier accuracy is inflated vs real free text; SLA labels come
from a noisy synthetic rule. Never present these numbers as UGVCL's real performance.
