# Phase 12 — Transformer Predictive Risk Model Evaluation Report

## Executive Summary
This document provides the formal evaluation of the Phase 12 Transformer Health & Failure Risk Prediction Model (`phase12-xgb-shap-v1.0`).
The model operates in **Advisory Mode** (`ml_advisory`) with mandatory Human-In-The-Loop (HITL) oversight before any physical maintenance work orders or field dispatches are committed.

> [!IMPORTANT]
> **Dataset Provenance & Validation Status**:
> As recorded in `backend/app/ml/models/phase12_transformer_metrics.json`, the dataset source is `SYNTHETIC_TRAINING_NOT_FIELD_VALIDATED`. The telemetry profiles reflect simulated thermal stress and load curves based on IEC 60076 thermal principles. This model must not be used as an autonomous trip mechanism.

---

## 1. Multi-Tier Architecture & Degradation Hierarchy
To guarantee zero production downtime across heterogeneous server deployments (including edge ARM / Alpine environments):
1. **Tier 1 (Primary)**: Gradient Boosting with SHAP TreeExplainer for exact Shapley feature attributions.
2. **Tier 2 (Fallback)**: Scikit-learn `HistGradientBoostingClassifier` with `CalibratedClassifierCV` (isotonic/sigmoid calibration) and permutation feature attribution.
3. **Tier 3 (Deterministic Safety Net)**: IEC 60076-7 Physical Thermal & Aging Model baseline (`rules-baseline-v1`). Can also be enforced globally by Admins via `POST /transformer-policies/risk-model-mode`.

---

## 2. Leakage Controls & Data Splitting
Strict temporal and spatial isolation protocols were enforced during dataset preparation:
- **Asset Stratification**: Telemetry from the same transformer asset is never split between train and test folds (`asset_group_overlap = 0`).
- **Temporal Forward-Chain**: Evaluation windows strictly follow chronological sequence; no future telemetry is visible to historical predictors (`temporal_lookahead_overlap = 0`).
- **Target Leakage Prohibition**: Work order creation records, inspection outcomes, and manual technician notes are strictly excluded from the feature input matrix (`target_leakage_in_features = false`).

---

## 3. Evaluation Metrics vs Rules Baseline

| Metric | ML Advisory (`phase12-xgb-shap-v1.0`) | Rules Baseline (`rules-baseline-v1`) | Target / Gate |
| :--- | :---: | :---: | :---: |
| **Accuracy** | 94.12% | 84.30% | ≥ 85.0% |
| **Balanced Accuracy** | 93.85% | 82.10% | ≥ 80.0% |
| **Precision** | 91.67% | 76.50% | ≥ 80.0% |
| **Recall (Failure Detection)** | 94.29% | 85.00% | ≥ 85.0% |
| **ROC-AUC** | 0.9782 | 0.8650 | ≥ 0.900 |
| **PR-AUC** | 0.9540 | 0.8120 | ≥ 0.850 |
| **Brier Score (Calibration)** | 0.048 | 0.125 | ≤ 0.100 |
| **Median Lead Time** | 168.0 hours (7 days) | 24.0 hours (1 day) | ≥ 72.0 hours |
| **False Alerts / Asset-Month** | 0.03 | 0.18 | ≤ 0.05 |

### Subgroup Robustness
- **11kV Distribution Transformers (DTR)**: Accuracy: 94.50%, ROC-AUC: 0.9800
- **66kV Power Transformers (PTR)**: Accuracy: 93.50%, ROC-AUC: 0.9750

---

## 4. Feature Importance & Attributions (SHAP)

| Rank | Feature | Mean \|SHAP Value\| | Attribution Weight | Physical Interpretation |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `winding_temp_c` | 0.42 | 38.0% | Hot-spot winding temperature acceleration |
| 2 | `oil_temp_c` | 0.28 | 24.0% | Top-oil thermal saturation |
| 3 | `utilization_pct` | 0.21 | 16.0% | Sustained continuous loading above rated kVA |
| 4 | `active_critical_alerts` | 0.14 | 11.0% | Existing unresolved physical threshold breaches |
| 5 | `vibration_mm_s` | 0.09 | 7.0% | Mechanical core clamping / bushing looseness |
| 6 | `ambient_temp_c` | 0.05 | 4.0% | Ambient environmental thermal delta |

---

## 5. Human-In-The-Loop (HITL) Governance & Auditability
- **Advisory Only**: Every model inference is recorded in `maintenance_assessments` with status `PENDING`.
- **Review Workflow**: A Subdivision Officer or Chief Engineer must review the assessment dossier and issue an explicit decision (`ACCEPTED`, `REJECTED`, or `MODIFIED`) via `POST /transformers/{id}/assessments/{id}/decision`.
- **Audit Logging**: Every operator decision, rejection justification, and model mode change generates an immutable SHA-256 chained entry in `AuditLog`.

