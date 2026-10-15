"""Train both models on synthetic data; write models + metrics.json (held-out test)."""
import json, os
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
import joblib, pandas as pd
from .synthetic import make_classifier_rows, make_sla_rows, SLA_FEATURES

def majority_baseline(y): return Counter(y).most_common(1)[0][1] / len(y)

def train(out_dir="app/ml/models"):
    os.makedirs(out_dir, exist_ok=True)
    # 1) Category + severity classifiers (shared TF-IDF text pipeline)
    rows = make_classifier_rows(); X = [r["text"] for r in rows]
    for target, name in [("category","category"), ("severity","severity")]:
        y = [r[target] for r in rows]
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=.2, random_state=42, stratify=y)
        pipe = Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1,2))), ("clf", LogisticRegression(max_iter=1000))])
        pipe.fit(Xtr, ytr); acc = accuracy_score(yte, pipe.predict(Xte))
        joblib.dump(pipe, f"{out_dir}/{name}_model.joblib")
        globals()[f"_{name}"] = {"accuracy": round(float(acc),4), "majority_baseline": round(float(majority_baseline(yte)),4), "test_size": len(yte)}
    # 2) SLA breach risk
    df = pd.DataFrame(make_sla_rows())
    X = df[SLA_FEATURES + ["category","severity"]]; y = df["breach"]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=.2, random_state=42, stratify=y)
    pre = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), ["category","severity"])], remainder="passthrough")
    sla = Pipeline([("pre", pre), ("clf", RandomForestClassifier(n_estimators=200, random_state=42))])
    sla.fit(Xtr, ytr); sla_acc = accuracy_score(yte, sla.predict(Xte))
    joblib.dump(sla, f"{out_dir}/sla_model.joblib")
    metrics = {"data_notice": "SYNTHETIC data only — not UGVCL real-world performance.",
      "category_classifier": globals()["_category"], "severity_classifier": globals()["_severity"],
      "sla_breach_predictor": {"accuracy": round(float(sla_acc),4), "majority_baseline": round(float(majority_baseline(yte)),4), "test_size": int(len(yte))}}
    json.dump(metrics, open(f"{out_dir}/metrics.json","w"), indent=2); return metrics

if __name__ == "__main__":
    print(json.dumps(train(), indent=2))
