# ML report (synthetic data only)

Code: `backend/app/ml/` (`synthetic.py` → `train.py` → `predict.py`). Results: `backend/app/ml/models/metrics.json`
(tracked in git; model binaries are regenerated on first start — retrain with `cd backend && python scripts/train_models.py`).
Live at `GET /assistant/ml-metrics`. Figures for the deck: `docs/assets/ml_confusion_matrices.png`,
`docs/assets/ml_risk_distribution.png` (regenerate with `python scripts/export_ml_charts.py`).

1. **Complaint/fault classifier** — TF-IDF (1–2 g) + Logistic Regression → category, and a class-balanced second model → severity; drives routing priority. A conservative keyword safety guardrail escalates known electrical danger phrases to SAFETY/CRITICAL because the synthetic classifier has weak recall on unseen safety phrasing.
2. **SLA-breach risk predictor** — Random Forest over load, documents-complete, zone pending, weekend, category, severity → probability + human-readable reasons.

## Results (held-out; reproduce with `python scripts/train_models.py` — verified byte-identical, 22 Oct 2026)

| Model | Accuracy | Balanced acc. | F1 (macro) | Majority baseline | Test n | Reading |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| Category classifier | **0.733** | 0.744 | 0.719 | 0.185 | 195 | +55 pts over guessing; confusion concentrates in templated-overlap classes (see chart) |
| Severity classifier | **0.846** | 0.774 | 0.761 | 0.328 | 195 | +52 pts over guessing; CRITICAL recall is weak (small class) |
| SLA-breach predictor | **0.794** | 0.758 | 0.768 | 0.625 | 160 | +17 pts over guessing; breach precision 0.79, recall 0.62, F1 0.69 |

**Every number above is on synthetic data.** The SLA model's accuracy is a *triage probability*, not a verdict: officers act on the printed reasons (missing documents, high zonal load, weekend, ≥10 kW approval chain) and the human decides.

**Evaluation protocol.** Classifier metrics hold out complete *source templates*, so wording variants of a template cannot appear on both sides of the split. The SLA model uses a stratified random split of synthetic rows and reports breach precision/recall/F1 alongside accuracy. `make train` is deterministic (fixed seeds) — the tracked `metrics.json` reproduces byte-identically.

**Caveats.** Held-out templates are still a small, constructed vocabulary and do not establish performance on real consumer text; SLA labels come from a noisy synthetic rule. Never present these numbers as UGVCL's real performance. For deployment, retrain and validate on appropriately governed UGVCL data.

**Assistant architecture clarification (TF-IDF vs optional Gemini UI drawer).**
- **Backend ML & Policy RAG (`backend/app/ml/`, `POST /assistant/chat`, `GET /assistant/ml-metrics`):** Runs 100% locally in Python/scikit-learn with zero external API calls. `POST /assistant/chat` performs deterministic role/zone-scoped live database queries plus TF-IDF cosine-similarity retrieval over the 3 bundled policy extracts (`backend/data/policies/`). None of the evaluation metrics in this report involve an LLM.
- **Portal Vidyut Mitra Drawer (`POST /api/ai-chat` in `frontend/vite.config.ts`, `AIAssistantDrawer.tsx`):** Provides a role-scoped conversational UI that uses server-side Google Gemini (`GEMINI_API_KEY`, `3.5 s` server timeout, read-only tools) when configured, automatically falling back to a deterministic rule-based `Grounded Engine` (`utilityAiEngine.ts`) when offline, unconfigured, or quota-limited—and attaching cited FastAPI TF-IDF `/assistant/chat` results whenever a verified backend session is active. Every message displays a badge indicating which engine answered.

## Honesty script (30 seconds, say it exactly)

> *"Both models are trained on synthetic data — templates plus a noisy labelling rule. We report held-out accuracy against a majority baseline, so the number can never look better than always guessing the most common answer. Accuracy is not confidence: the SLA score is a triage probability, the printed reasons are what the officer acts on, and every final decision stays with the human — the models never approve or reject a connection."*

## Hostile questions (defence drill — 2-line answers)

**Q1. Is this real UGVCL data?**
No — every row is synthetic (`backend/app/ml/synthetic.py`), disclosed in the README, this report, the API (`data_notice` on `/assistant/ml-metrics`), and the charts. Real-data retraining and validation are explicitly the post-pilot step.

**Q2. Why should we trust 79%?**
You shouldn't "trust" it as a verdict — it is +17 points over the majority baseline (0.625) on held-out synthetic rows, with breach precision 0.79 and recall 0.62 printed openly. The number buys triage order; the reasons column buys the decision; the officer keeps the decision.

**Q3. Your classifier once showed 100% — isn't that fake?**
100% was a templating artefact of an easy vocabulary split, and we said so then. The current harder template-group hold-out gives 0.73/0.85 — we publish that instead. A team that keeps the flattering number would be faking; we kept the honest one.

*(Optional Q4. What happens when real text arrives?* → Out-of-vocabulary free text will degrade TF-IDF; the guardrail escalates unknown safety phrasing conservatively; the plan is governed UGVCL data → retrain → re-baseline → re-approve, keeping the same API contracts.*)*
