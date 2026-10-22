#!/usr/bin/env python3
"""Export the two ML figures for the deck (WORK_PLAN 1.5). All titles are labelled SYNTHETIC.

Charts:
  docs/assets/ml_confusion_matrices.png  — category + SLA-breach confusion matrices (held-out)
  docs/assets/ml_risk_distribution.png   — predicted SLA-risk distribution on a synthetic batch
                                           + accuracy-vs-majority-baseline bars

Usage: cd backend && python3 scripts/export_ml_charts.py
"""
import json
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, "..", "app", "ml", "models")
ASSETS = os.path.abspath(os.path.join(HERE, "..", "..", "docs", "assets"))
SYNTH = "SYNTHETIC data — not UGVCL real-world performance"


def load_metrics():
    with open(os.path.join(MODELS, "metrics.json")) as f:
        return json.load(f)


def plot_confusion_matrices(m):
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.6))
    for ax, key, title in [
        (axes[0], "category_classifier", "Category classifier (held-out templates)"),
        (axes[1], "sla_breach_predictor", "SLA-breach predictor (held-out rows)"),
    ]:
        d = m[key]
        cm = np.array(d["confusion_matrix"])
        labels = [str(x) for x in d["labels"]]
        im = ax.imshow(cm, cmap="Blues")
        ax.set_xticks(range(len(labels)), labels, rotation=45, ha="right", fontsize=8)
        ax.set_yticks(range(len(labels)), labels, fontsize=8)
        for i in range(cm.shape[0]):
            for j in range(cm.shape[1]):
                ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                        color="white" if cm[i, j] > cm.max() / 2 else "#1f2937", fontsize=9)
        ax.set_title(f"{title}\nacc={d['accuracy']:.3f} · baseline={d['majority_baseline']:.3f} · n={d['test_size']}",
                     fontsize=9)
        ax.set_xlabel("predicted", fontsize=8)
        ax.set_ylabel("actual", fontsize=8)
        fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    fig.suptitle(f"ML results — {SYNTH}", fontsize=10, y=1.02)
    fig.tight_layout()
    out = os.path.join(ASSETS, "ml_confusion_matrices.png")
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("wrote", out)


def plot_risk_distribution(m):
    import joblib
    import pandas as pd
    from app.ml.synthetic import make_sla_rows, SLA_FEATURES

    df = pd.DataFrame(make_sla_rows(n=800, seed=7))
    model = joblib.load(os.path.join(MODELS, "sla_model.joblib"))
    X = df[SLA_FEATURES + ["category", "severity"]]
    risk = model.predict_proba(X)[:, 1]

    fig, axes = plt.subplots(1, 2, figsize=(11, 4.2))
    ax = axes[0]
    ax.hist(risk, bins=20, color="#059669", edgecolor="white")
    for x, label in [(0.2, "low <0.4"), (0.55, "watch 0.4–0.7"), (0.85, "high ≥0.7")]:
        ax.axvline(x, color="#334155", linestyle="--", linewidth=1)
    ax.set_title(f"SLA-risk predictions over a synthetic batch (n={len(risk)})", fontsize=9)
    ax.set_xlabel("predicted breach risk")
    ax.set_ylabel("requests")
    buckets = {"low <0.4": int((risk < 0.4).sum()),
               "watch": int(((risk >= 0.4) & (risk < 0.7)).sum()),
               "high ≥0.7": int((risk >= 0.7).sum())}
    ax.text(0.98, 0.95, "\n".join(f"{k}: {v}" for k, v in buckets.items()),
            transform=ax.transAxes, ha="right", va="top", fontsize=8,
            bbox=dict(boxstyle="round", facecolor="white", alpha=0.8))

    ax = axes[1]
    names = ["Category", "Severity", "SLA risk"]
    accs = [m["category_classifier"]["accuracy"], m["severity_classifier"]["accuracy"],
            m["sla_breach_predictor"]["accuracy"]]
    bases = [m["category_classifier"]["majority_baseline"], m["severity_classifier"]["majority_baseline"],
             m["sla_breach_predictor"]["majority_baseline"]]
    x = np.arange(len(names))
    ax.bar(x - 0.18, accs, 0.36, label="held-out accuracy", color="#2563eb")
    ax.bar(x + 0.18, bases, 0.36, label="majority baseline", color="#94a3b8")
    ax.set_xticks(x, names, fontsize=9)
    ax.set_ylim(0, 1.05)
    ax.legend(fontsize=8)
    ax.set_title("Model vs always-guessing-the-most-common", fontsize=9)
    for xi, v in zip(x - 0.18, accs):
        ax.text(xi, v + 0.02, f"{v:.2f}", ha="center", fontsize=8)
    for xi, v in zip(x + 0.18, bases):
        ax.text(xi, v + 0.02, f"{v:.2f}", ha="center", fontsize=8)

    fig.suptitle(f"ML results — {SYNTH}", fontsize=10, y=1.02)
    fig.tight_layout()
    out = os.path.join(ASSETS, "ml_risk_distribution.png")
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("wrote", out)


if __name__ == "__main__":
    os.makedirs(ASSETS, exist_ok=True)
    metrics = load_metrics()
    plot_confusion_matrices(metrics)
    plot_risk_distribution(metrics)
    print("done — labels preserved: SYNTHETIC only")
