"""Train both models on synthetic data; write models + metrics.json (held-out test)."""
import json, os
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import (accuracy_score, balanced_accuracy_score, confusion_matrix,
                             f1_score, precision_score, recall_score)
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
import joblib, pandas as pd
from .synthetic import make_classifier_rows, make_sla_rows, SLA_FEATURES

def majority_baseline(y): return Counter(y).most_common(1)[0][1] / len(y)

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
    # 1) Category + severity classifiers (shared TF-IDF text pipeline)
    rows = make_classifier_rows(); X = [r["text"] for r in rows]
    # Hold out complete source templates, so wording variants of a template cannot
    # appear on both sides of the evaluation split.
    held_out_groups = {sorted({r["template_group"] for r in rows if r["category"] == cat})[-1]
                       for cat in {r["category"] for r in rows}}
    train_idx = [i for i, row in enumerate(rows) if row["template_group"] not in held_out_groups]
    test_idx = [i for i, row in enumerate(rows) if row["template_group"] in held_out_groups]
    Xtr, Xte = [X[i] for i in train_idx], [X[i] for i in test_idx]
    for target, name in [("category","category"), ("severity","severity")]:
        y = [r[target] for r in rows]
        ytr, yte = [y[i] for i in train_idx], [y[i] for i in test_idx]
        clf = LogisticRegression(max_iter=1000, class_weight="balanced" if target == "severity" else None)
        pipe = Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1,2))), ("clf", clf)])
        pipe.fit(Xtr, ytr); pred = pipe.predict(Xte)
        joblib.dump(pipe, f"{out_dir}/{name}_model.joblib")
        labels = sorted(set(y))
        globals()[f"_{name}"] = {**classifier_metrics(yte, pred, labels),
                                 "majority_baseline": round(float(majority_baseline(yte)),4)}
    # 2) SLA breach risk
    df = pd.DataFrame(make_sla_rows())
    X = df[SLA_FEATURES + ["category","severity"]]; y = df["breach"]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=.2, random_state=42, stratify=y)
    pre = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), ["category","severity"])], remainder="passthrough")
    sla = Pipeline([("pre", pre), ("clf", RandomForestClassifier(n_estimators=200, random_state=42))])
    sla.fit(Xtr, ytr); sla_pred = sla.predict(Xte)
    joblib.dump(sla, f"{out_dir}/sla_model.joblib")
    metrics = {"data_notice": "SYNTHETIC data only — not UGVCL real-world performance.",
      "evaluation": {"classifier_split": "held-out source templates; wording variants from each held-out template stay out of training",
                     "sla_split": "stratified random split of synthetic rows"},
      "category_classifier": globals()["_category"], "severity_classifier": globals()["_severity"],
      "sla_breach_predictor": {**classifier_metrics(yte, sla_pred, [0, 1]),
                               "breach_precision": round(float(precision_score(yte, sla_pred, pos_label=1, zero_division=0)), 4),
                               "breach_recall": round(float(recall_score(yte, sla_pred, pos_label=1, zero_division=0)), 4),
                               "breach_f1": round(float(f1_score(yte, sla_pred, pos_label=1, zero_division=0)), 4),
                               "majority_baseline": round(float(majority_baseline(yte)),4)}}
    json.dump(metrics, open(f"{out_dir}/metrics.json","w"), indent=2); return metrics

if __name__ == "__main__":
    print(json.dumps(train(), indent=2))
