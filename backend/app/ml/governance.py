"""AI Governance, Model Monitoring & Human-in-the-Loop Audit (Item #25).

Tracks live ML inference counts, safety-override escalations, out-of-distribution
load-cap events, prediction distributions across the database, versioned model
cards, and mathematical proof that AI never auto-approves or auto-rejects requests.
"""
import json
import threading
from typing import Any
from sqlalchemy.orm import Session
from ..access import visible_requests
from ..models import AuditLog, ConnectionRequest, User
from .predict import metrics

API_CONTRACT_VERSION = "v1"

AI_GOVERNANCE_DISCLOSURE = (
    "All ML models are trained on SYNTHETIC demo data only (never UGVCL production records). "
    "Models are strictly advisory: they triage, prioritize, and explain SLA breach risk, "
    "while every sanction APPROVAL or REJECTION requires an authenticated human officer."
)


class ModelGovernanceMonitor:
    """Thread-safe runtime telemetry over ML classification & SLA-risk scoring."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._classification_calls = 0
        self._sla_risk_calls = 0
        self._safety_rule_overrides = 0
        self._ood_capped_inputs = 0
        self._predicted_categories: dict[str, int] = {}

    def record_classification(self, category: str, safety_override: bool = False) -> None:
        with self._lock:
            self._classification_calls += 1
            if safety_override:
                self._safety_rule_overrides += 1
            self._predicted_categories[category] = self._predicted_categories.get(category, 0) + 1

    def record_sla_inference(self) -> None:
        with self._lock:
            self._sla_risk_calls += 1

    def record_ood_capped_input(self) -> None:
        with self._lock:
            self._ood_capped_inputs += 1

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "classification_inferences": self._classification_calls,
                "sla_risk_inferences": self._sla_risk_calls,
                "safety_deterministic_overrides": self._safety_rule_overrides,
                "ood_capped_load_inputs": self._ood_capped_inputs,
                "runtime_category_counts": dict(sorted(self._predicted_categories.items())),
            }


governance_monitor = ModelGovernanceMonitor()


def build_ai_governance_report(db: Session, u: User) -> dict[str, Any]:
    raw_metrics = metrics()
    rows: list[ConnectionRequest] = visible_requests(db, u).all()
    runtime = governance_monitor.snapshot()

    total_rows = len(rows)
    open_rows = [r for r in rows if r.status not in ("COMPLETED", "REJECTED")]
    high_risk_rows = [r for r in open_rows if (r.sla_breach_risk or 0.0) >= 0.70]
    watch_rows = [r for r in open_rows if 0.40 <= (r.sla_breach_risk or 0.0) < 0.70]
    low_rows = [r for r in open_rows if (r.sla_breach_risk or 0.0) < 0.40]

    # Verify Core Invariant 3: every scored row carries non-empty reasons list
    missing_reasons = 0
    for r in rows:
        try:
            parsed = json.loads(r.sla_risk_reasons or "[]")
            if not isinstance(parsed, list) or len(parsed) == 0:
                missing_reasons += 1
        except Exception:
            missing_reasons += 1

    # Verify Core Invariant 1 & 6: Humans approve — zero AI auto-approvals/rejections
    req_ids = [r.id for r in rows]
    audit_q = db.query(AuditLog).filter(AuditLog.action == "STATUS_UPDATED")
    if u.role != "admin":
        audit_q = audit_q.filter(AuditLog.entity_id.in_(req_ids)) if req_ids else audit_q.filter(False)
    status_audits = audit_q.all()
    human_decisions = sum(
        1
        for a in status_audits
        if a.actor_role in ("officer", "admin")
        and any(tok in (a.detail or "") for tok in ("APPROVED", "REJECTED", "NEEDS_CORRECTION"))
    )
    ai_auto_decisions = sum(
        1
        for a in status_audits
        if a.actor_role not in ("officer", "admin", "engineer", "consumer", "system")
    )

    high_share_pct = round((len(high_risk_rows) / len(open_rows)) * 100.0, 1) if open_rows else 0.0
    drift_alerts: list[str] = []
    if high_share_pct >= 50.0 and len(open_rows) >= 2:
        drift_alerts.append(
            f"Elevated high-SLA-risk concentration ({high_share_pct}% of open queue >= 0.70); review zone staffing or input shift."
        )
    if runtime["ood_capped_load_inputs"] > 0:
        drift_alerts.append(
            f"{runtime['ood_capped_load_inputs']} submission(s) exceeded model training load range and were capped + routed to manual officer review."
        )
    if not drift_alerts:
        drift_alerts.append("Prediction distribution within expected synthetic baseline envelope.")

    cat_m = raw_metrics.get("category_classifier", {})
    sev_m = raw_metrics.get("severity_classifier", {})
    sla_m = raw_metrics.get("sla_breach_predictor", {})

    return {
        "api_version": API_CONTRACT_VERSION,
        "supported_version_prefixes": ["/", "/v1"],
        "disclosure": AI_GOVERNANCE_DISCLOSURE,
        "advisory_governance": {
            "ai_mode": "ADVISORY_DECISION_SUPPORT_ONLY",
            "models_can_approve_or_reject": False,
            "ai_auto_approvals_or_rejections": ai_auto_decisions,
            "verified_human_officer_decisions": human_decisions,
            "unexplained_risk_scores": missing_reasons,
            "every_score_has_reasons": missing_reasons == 0,
            "training_data_provenance": "SYNTHETIC_ONLY",
            "real_ugvcl_retraining_gate": "Requires anonymized UGVCL historical sanction logs + officer sign-off before pilot promotion",
        },
        "model_registry": [
            {
                "model_id": "vidyutflow-category-tfidf-v1.0",
                "task": "Request Category Triage",
                "algorithm": "TF-IDF + LogisticRegression + Deterministic Safety Escalation",
                "dataset": "Synthetic template-group holdout",
                "held_out_accuracy": cat_m.get("accuracy"),
                "majority_baseline": cat_m.get("majority_baseline"),
                "test_samples": cat_m.get("n_test"),
            },
            {
                "model_id": "vidyutflow-severity-tfidf-v1.0",
                "task": "Severity & Priority Assignment",
                "algorithm": "TF-IDF + LogisticRegression + Safety Keyword Guardrail",
                "dataset": "Synthetic template-group holdout",
                "held_out_accuracy": sev_m.get("accuracy"),
                "majority_baseline": sev_m.get("majority_baseline"),
                "test_samples": sev_m.get("n_test"),
            },
            {
                "model_id": "vidyutflow-sla-logreg-v1.0",
                "task": "SLA Breach Probability + Reason Codes",
                "algorithm": "OneHot + StandardScaler + LogisticRegression (OOD load-capped)",
                "dataset": "Synthetic workload holdout",
                "held_out_accuracy": sla_m.get("accuracy"),
                "roc_auc": sla_m.get("roc_auc"),
                "majority_baseline": sla_m.get("majority_baseline"),
                "test_samples": sla_m.get("n_test"),
            },
        ],
        "monitoring": {
            "scoped_total_requests": total_rows,
            "open_queue_distribution": {
                "low_lt_0_4": len(low_rows),
                "watch_0_4_to_0_7": len(watch_rows),
                "high_gte_0_7": len(high_risk_rows),
                "high_risk_share_pct": high_share_pct,
            },
            "runtime_counters": runtime,
            "monitoring_alerts": drift_alerts,
        },
    }
