"""Train all 5 scikit-learn models on synthetic data; write models + metrics.json (held-out test).

Models trained:
  1. Category classifier (TF-IDF + LogisticRegression, strict source-template holdout)
  2. Severity classifier (TF-IDF + LogisticRegression, strict source-template holdout)
  3. SLA-breach risk triage predictor (cost-sensitive RandomForest, triage threshold 0.38 for high breach recall)
  4. Billing anomaly detector (IsolationForest over kWh ratio, kWh/kW, slab discrepancy & zero-read flags)
  5. 24-hour Transformer/Feeder kVA load forecaster (GradientBoostingRegressor)
"""
import json
import os
from collections import Counter
import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, IsolationForest, RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    precision_score,
    r2_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import OneHotEncoder

from .synthetic import (
    BILLING_ANOMALY_FEATURES,
    LOAD_FORECAST_FEATURES,
    SLA_FEATURES,
    make_billing_anomaly_rows,
    make_classifier_rows,
    make_load_forecast_rows,
    make_sla_rows,
)

SLA_TRIAGE_THRESHOLD = 0.38


def majority_baseline(y):
    return Counter(y).most_common(1)[0][1] / len(y)


def classifier_metrics(y_true, y_pred, labels):
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "balanced_accuracy": round(float(balanced_accuracy_score(y_true, y_pred)), 4),
        "precision_macro": round(float(precision_score(y_true, y_pred, average="macro", zero_division=0)), 4),
        "recall_macro": round(float(recall_score(y_true, y_pred, average="macro", zero_division=0)), 4),
        "f1_macro": round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 4),
        "labels": list(labels),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
        "test_size": len(y_true),
    }


def train(out_dir="app/ml/models"):
    os.makedirs(out_dir, exist_ok=True)

    # 1) Category + severity classifiers (strict held-out source templates — 1 unseen template per class)
    rows = make_classifier_rows()
    X = [r["text"] for r in rows]
    held_out_groups = {
        sorted({r["template_group"] for r in rows if r["category"] == cat})[-1]
        for cat in {r["category"] for r in rows}
    }
    train_idx = [i for i, row in enumerate(rows) if row["template_group"] not in held_out_groups]
    test_idx = [i for i, row in enumerate(rows) if row["template_group"] in held_out_groups]
    Xtr, Xte = [X[i] for i in train_idx], [X[i] for i in test_idx]

    cat_metrics = {}
    trained_pipes = {}
    for target, name in [("category", "category"), ("severity", "severity")]:
        y = [r[target] for r in rows]
        ytr, yte = [y[i] for i in train_idx], [y[i] for i in test_idx]
        clf = LogisticRegression(max_iter=1000, C=2.0, class_weight="balanced")
        pipe = Pipeline(
            [
                ("tfidf", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
                ("clf", clf),
            ]
        )
        pipe.fit(Xtr, ytr)
        trained_pipes[name] = pipe
        pred = pipe.predict(Xte)
        joblib.dump(pipe, f"{out_dir}/{name}_model.joblib")
        labels = sorted(set(y))
        cat_metrics[name] = {
            **classifier_metrics(yte, pred, labels),
            "majority_baseline": round(float(majority_baseline(yte)), 4),
        }

    # 2) Recall-prioritized SLA breach risk triage predictor
    df = pd.DataFrame(make_sla_rows())
    X_sla = df[SLA_FEATURES + ["category", "severity"]]
    y_sla = df["breach"]
    Xtr_s, Xte_s, ytr_s, yte_s = train_test_split(
        X_sla, y_sla, test_size=0.2, random_state=42, stratify=y_sla
    )
    pre = ColumnTransformer(
        [("cat", OneHotEncoder(handle_unknown="ignore"), ["category", "severity"])],
        remainder="passthrough",
    )
    sla = Pipeline(
        [
            ("pre", pre),
            (
                "clf",
                RandomForestClassifier(
                    n_estimators=250,
                    class_weight={0: 1, 1: 2.0},
                    min_samples_leaf=2,
                    random_state=42,
                ),
            ),
        ]
    )
    sla.fit(Xtr_s, ytr_s)
    pos_idx = list(sla.classes_).index(1)
    sla_proba = sla.predict_proba(Xte_s)[:, pos_idx]
    sla_pred = [1 if p >= SLA_TRIAGE_THRESHOLD else 0 for p in sla_proba]
    joblib.dump(sla, f"{out_dir}/sla_model.joblib")

    # 3) Billing Anomaly Detector (IsolationForest trained on normal consumption + evaluated on mixed holdout)
    bill_df = pd.DataFrame(make_billing_anomaly_rows())
    bill_tr, bill_te = train_test_split(
        bill_df, test_size=0.25, random_state=42, stratify=bill_df["is_anomaly"]
    )
    normal_tr = bill_tr[bill_tr["is_anomaly"] == 0][BILLING_ANOMALY_FEATURES]
    iso = IsolationForest(
        n_estimators=200,
        contamination=0.06,
        random_state=42,
    )
    iso.fit(normal_tr)
    raw_iso_pred = iso.predict(bill_te[BILLING_ANOMALY_FEATURES])
    iso_pred = [1 if v == -1 else 0 for v in raw_iso_pred]
    y_bill_te = list(bill_te["is_anomaly"])
    joblib.dump(iso, f"{out_dir}/billing_anomaly_model.joblib")

    # 4) 24-Hour Feeder / Transformer Load Forecaster (GradientBoostingRegressor)
    load_df = pd.DataFrame(make_load_forecast_rows())
    X_lf = load_df[LOAD_FORECAST_FEATURES]
    y_lf = load_df["load_kva"]
    Xtr_l, Xte_l, ytr_l, yte_l = train_test_split(X_lf, y_lf, test_size=0.2, random_state=42)
    gbr = GradientBoostingRegressor(
        n_estimators=220,
        max_depth=4,
        learning_rate=0.06,
        random_state=42,
    )
    gbr.fit(Xtr_l, ytr_l)
    lf_pred = gbr.predict(Xte_l)
    joblib.dump(gbr, f"{out_dir}/load_forecast_model.joblib")

    metrics = {
        "data_notice": "SYNTHETIC data only — not UGVCL real-world performance.",
        "evaluation": {
            "classifier_split": "held-out source templates; wording variants from each held-out template stay out of training",
            "sla_split": f"stratified random split of synthetic rows (cost-sensitive risk triage threshold={SLA_TRIAGE_THRESHOLD})",
            "billing_anomaly_split": "IsolationForest fit on normal synthetic bills only; evaluated on stratified 25% holdout with injected spikes, zero-reads & tariff mismatches",
            "load_forecast_split": "20% held-out hourly synthetic 11kV feeder/DTR demand rows",
        },
        "category_classifier": cat_metrics["category"],
        "severity_classifier": cat_metrics["severity"],
        "sla_breach_predictor": {
            **classifier_metrics(list(yte_s), sla_pred, [0, 1]),
            "triage_threshold": SLA_TRIAGE_THRESHOLD,
            "breach_precision": round(
                float(precision_score(yte_s, sla_pred, pos_label=1, zero_division=0)), 4
            ),
            "breach_recall": round(
                float(recall_score(yte_s, sla_pred, pos_label=1, zero_division=0)), 4
            ),
            "breach_f1": round(
                float(f1_score(yte_s, sla_pred, pos_label=1, zero_division=0)), 4
            ),
            "majority_baseline": round(float(majority_baseline(list(yte_s))), 4),
        },
        "billing_anomaly_detector": {
            **classifier_metrics(y_bill_te, iso_pred, [0, 1]),
            "anomaly_precision": round(
                float(precision_score(y_bill_te, iso_pred, pos_label=1, zero_division=0)), 4
            ),
            "anomaly_recall": round(
                float(recall_score(y_bill_te, iso_pred, pos_label=1, zero_division=0)), 4
            ),
            "anomaly_f1": round(
                float(f1_score(y_bill_te, iso_pred, pos_label=1, zero_division=0)), 4
            ),
            "majority_baseline": round(float(majority_baseline(y_bill_te)), 4),
        },
        "feeder_load_forecaster": {
            "r2_score": round(float(r2_score(yte_l, lf_pred)), 4),
            "mae_kva": round(float(mean_absolute_error(yte_l, lf_pred)), 2),
            "test_size": len(yte_l),
        },
    }
    from pathlib import Path
    from .predict import SAFETY_CRITICAL_TERMS

    bench_path = Path(__file__).resolve().parents[2] / "data" / "benchmarks" / "gerc_ugvcl_public_field_benchmark.json"
    if bench_path.exists():
        bench = json.loads(bench_path.read_text(encoding="utf-8"))
        b_samples = bench["samples"]
        synth_norm = {" ".join(r["text"].casefold().split()) for r in rows}
        overlap_cnt = sum(
            1 for s in b_samples if " ".join(s["text"].casefold().split()) in synth_norm
        )
        y_cat_b = [s["category"] for s in b_samples]
        y_sev_b = [s["severity"] for s in b_samples]
        p_cat_b, p_sev_b = [], []
        for s in b_samples:
            norm_txt = s["text"].casefold()
            if any(term in norm_txt for term in SAFETY_CRITICAL_TERMS):
                p_cat_b.append("SAFETY")
                p_sev_b.append("CRITICAL")
            else:
                p_cat_b.append(str(trained_pipes["category"].predict([s["text"]])[0]))
                p_sev_b.append(str(trained_pipes["severity"].predict([s["text"]])[0]))
        crit_tot = sum(1 for y in y_sev_b if y == "CRITICAL")
        crit_hit = sum(1 for yt, yp in zip(y_sev_b, p_sev_b) if yt == "CRITICAL" and yp == "CRITICAL")
        metrics["ood_field_benchmark"] = {
            "benchmark_id": bench["benchmark_id"],
            "sample_count": len(b_samples),
            "template_overlap_count": overlap_cnt,
            "category_accuracy": round(
                sum(1 for a, b in zip(y_cat_b, p_cat_b) if a == b) / len(b_samples), 4
            ),
            "category_macro_f1": round(
                float(f1_score(y_cat_b, p_cat_b, average="macro", zero_division=0)), 4
            ),
            "severity_accuracy": round(
                sum(1 for a, b in zip(y_sev_b, p_sev_b) if a == b) / len(b_samples), 4
            ),
            "critical_safety_recall": round(crit_hit / max(1, crit_tot), 4),
        }

    metrics_file = os.path.join(out_dir, "metrics.json")
    with open(metrics_file, "w") as fh:
        json.dump(metrics, fh, indent=2)
    return metrics


if __name__ == "__main__":
    print(json.dumps(train(), indent=2))
