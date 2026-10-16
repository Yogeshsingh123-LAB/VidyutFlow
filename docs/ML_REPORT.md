# ML report (synthetic data only)
Code: `backend/app/ml/` (`synthetic.py` → `train.py` → `predict.py`). Results: `backend/app/ml/models/metrics.json`
(tracked in git; model binaries are regenerated on first start — retrain with `cd backend && python scripts/train_models.py`).
Live at `GET /assistant/ml-metrics`.
1. **Complaint/fault classifier** — TF-IDF (1–2 g) + Logistic Regression → category, and a class-balanced second model → severity; drives routing priority. A conservative keyword safety guardrail escalates known electrical danger phrases to SAFETY/CRITICAL because the synthetic classifier has weak recall on unseen safety phrasing.
2. **SLA-breach risk predictor** — Random Forest over load, documents-complete, zone pending, weekend, category, severity → probability + human-readable reasons.
**Evaluation:** classifier metrics use complete held-out source templates, keeping wording variants of those templates out of training. The SLA model uses a stratified random split of synthetic rows and reports breach precision, recall and F1 alongside accuracy and a confusion matrix.
**Caveats:** all data is synthetic. Held-out templates are still a small, constructed vocabulary and do not establish performance on real consumer text; SLA labels come from a noisy synthetic rule. Never present these numbers as UGVCL's real performance. For deployment, retrain and validate on appropriately governed UGVCL data.
