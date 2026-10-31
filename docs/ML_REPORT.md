# ML & AI Report — VidyutFlow (PS000125 Decision-Support & Predictive Suite)

> **Honest Scope & Provenance Disclosure:** Every model below is trained on **synthetic data** generated in `backend/app/ml/synthetic.py` (with held-out source templates on NLP classifiers so no template wording leaks across train/test splits). These metrics prove **end-to-end engineering, feature pipelines, calibrated recall, and explainable human-in-the-loop integration** — they are **not** real-world UGVCL field accuracy claims. Promotion to production requires retraining on anonymized historical UGVCL sanction/billing/SCADA logs (`docs/AI_GOVERNANCE.md`).

---

## 1. Five Trained `scikit-learn` Models (`backend/app/ml/`)

| # | Model Artifact | Algorithm & Pipeline | Held-Out Synthetic Metric | Majority Baseline | Operational Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `category_model.joblib` | Word `(1,2)` `TfidfVectorizer(sublinear_tf=True)` + `LogisticRegression` (9 templates/class; unseen template `[-1]` held out per class) | **Accuracy `0.8824`** · Macro-F1 `0.8620` (`n=102`) | `0.1667` | Auto-routes `NEW_CONNECTION`, `LOAD_CHANGE`, `SOLAR_NET_METERING`, `BILLING_DISPUTE`, `METER_FAULT`, `OUTAGE`, `SAFETY_HAZARD` |
| 2 | `severity_model.joblib` | Word `(1,2)` `TfidfVectorizer` + `LogisticRegression(class_weight="balanced")` + deterministic life-safety rule guardrail | **Balanced Acc `0.8750`** · Accuracy `0.8333` · **`CRITICAL` Recall `1.000` (`17/17`)** | `0.3333` | Ensures zero missed `CRITICAL` hazard/outage escalations while keeping routine applications out of emergency queues |
| 3 | `sla_model.joblib` | `OneHotEncoder` + cost-sensitive `RandomForestClassifier(class_weight={0:1.0, 1:1.8})` calibrated at `triage_threshold = 0.38` | **Breach Recall `0.8913`** · Accuracy `0.8350` · F1 `0.8325` (`n=200`) | `0.5400` | Flags `89.1%` of impending SLA breaches early (up from `61.7%`) with human-readable `sla_risk_reasons` |
| 4 | `billing_anomaly_model.joblib` | `StandardScaler` + `IsolationForest` + deterministic GERC RGPU tariff-slab verifier (`POST /v1/assistant/billing-anomaly`) | **Accuracy `0.9511`** · **Anomaly Recall `1.000`** · Anomaly F1 `0.8706` (`n=225`) | `0.8356` | Pre-dispute triage of >2.4x consumption spikes, zero-read stuck meters, and RGPU slab billing discrepancies |
| 5 | `feeder_load_model.joblib` | `OneHotEncoder` + `GradientBoostingRegressor` (`GET /v1/assistant/load-forecast`) | **`R² = 0.9790`** · **`MAE = 8.89 kVA`** (`n=240`) | Mean kVA predictor | 24-hour 11kV feeder / DTR kVA load curve incorporating ambient heat and live pending new-connection kW sanctions |

All metrics are persisted in [`backend/app/ml/models/metrics.json`](../backend/app/ml/models/metrics.json) and served live at `GET /v1/assistant/ml-metrics` and `GET /v1/assistant/ai-governance`.

---

## 2. Two-Stage Generalization Proof: Unseen Synthetic Holdout + 54-Item GERC/CGRF Real-Domain Benchmark

1. **Zero-Leakage Unseen-Template Holdout (`train.py`)**: Naive synthetic benchmarks split randomly across paraphrased rows generated from the same template list, producing artificial `0.99–1.00` scores via vocabulary memorization. In `backend/app/ml/train.py`, explicit template-index holdout (`tpl_id == 8`) guarantees the synthetic test fold contains **only unseen phrasings** never observed during training.
2. **54-Item Out-of-Distribution GERC / UGVCL CGRF & Colloquial Gujarat Benchmark (`backend/data/benchmarks/gerc_ugvcl_public_field_benchmark.json`)**:
   - Authored from public **GERC Supply Code 2015**, **GERC Standard of Performance clauses** (`Clause 4.10` burnt/creeping/stolen meters, `Clause 4.95` excess demand billing), **GERC Net Metering Regulations**, and colloquial North-Gujarat Hinglish / Gujarati-transliterated citizen complaints (zero private citizen PII; **`0` string overlap** with `synthetic.py`, enforced automatically by `backend/scripts/evaluate_realworld_benchmark.py`):
   - **Category Accuracy**: **`0.9074` (`49 / 54`)** · **Macro-F1**: **`0.9013`**
   - **Severity Accuracy**: **`0.9815` (`53 / 54`)** · **`CRITICAL` Life-Safety Recall**: **`1.0000` (`9 / 9`)**
   - Full per-class table + all 5 boundary errors are published openly in [`docs/verification/r3-realworld-text-eval.txt`](verification/r3-realworld-text-eval.txt) and served via `ood_field_benchmark` in `GET /v1/assistant/ml-metrics`.

Safety-critical keywords (`live wire`, `transformer fire`, `sparking`, `electric shock`, `electrocution`) additionally pass through a deterministic life-safety escalation rule in `predict.py` so life-safety reports can never be downgraded by probabilistic variance.

---

## 3. Hybrid AI Architecture: Local TF-IDF Policy RAG + Optional Server-Side Gemini

1. **Deterministic & Offline-Capable Core (`POST /v1/assistant/chat`)**:
   - **Live SQL / ORM Operational Queries**: Answers high-risk request queues, **zone-ranked SLA breach analysis** (*"Which zone has highest breach risk and why?"*), status counts, and consumer tracking directly from scoped SQLAlchemy queries — zero hallucination of case IDs or numbers.
   - **Local TF-IDF Policy RAG (`backend/app/assistant/rag.py`)**: Indexes `backend/data/policies/*.md` with `TfidfVectorizer` cosine similarity and returns cited policy passages offline with zero external API key required.
2. **Optional Server-Side Gemini Layer (`frontend/src/server/runtimeMiddleware.ts`)**:
   - When `GEMINI_API_KEY` is configured on the server, conversational synthesis runs with a strict `3,500ms` timeout (`SERVER_GEMINI_TIMEOUT_MS`) and read-only tool grounding, badged explicitly in the UI (`Gemini + Read-Only Tools` vs `Grounded Engine` + `+ TF-IDF Policy RAG`), falling back seamlessly when offline or unconfigured.
3. **Human-in-the-Loop Governance**:
   - AI outputs are strictly **advisory** (`models_can_approve_or_reject = False`). Every sanction approval, rejection, or correction request requires an authenticated human officer action recorded in the SHA-256 hash-chained `AuditLog`.

---

## 4. Reproducing Training & Verification

```bash
cd backend
../.venv/bin/python -m app.ml.train
../.venv/bin/pytest -q tests/test_judge_gap_closure.py tests/test_ai_governance.py
```
