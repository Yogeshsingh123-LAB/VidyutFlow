# ML report (synthetic data only)
Models live in `backend/app/ml/` (`synthetic.py` → `train.py` → `predict.py`); metrics are written to `backend/app/ml/models/metrics.json` at train time and served at `GET /assistant/ml-metrics`.
1. **Complaint/fault classifier** — TF-IDF (1–2 grams) + Logistic Regression, predicts category and (second model) severity from request text; drives routing priority.
2. **SLA-breach risk predictor** — Random Forest over load, documents-complete, zone pending count, weekend, category, severity; API returns probability + human-readable top reasons.
Latest generated `metrics.json` is committed in the repo — read the live numbers there / in the app. **Caveats:** synthetic text is templated, so classifier accuracy is inflated vs real free-text; SLA labels come from a noisy synthetic rule. Never present these as UGVCL's real performance. Retrain: `cd backend && python scripts/train_models.py`.
