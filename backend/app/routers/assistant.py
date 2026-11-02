import json
from collections import Counter, defaultdict
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..access import visible_requests
from ..assistant.service import policy_answer
from ..db import get_db
from ..deps import current_user, require
from ..ml.governance import build_ai_governance_report
from ..ml.predict import metrics
from ..ml.predictive_services import detect_billing_anomaly, forecast_feeder_load
from ..models import ConnectionRequest, User

router = APIRouter(prefix="/assistant", tags=["assistant"])


class Chat(BaseModel):
    question: str


class BillingAnomalyRequest(BaseModel):
    consumer_no: str = Field(default="04281-99231", min_length=3, max_length=40)
    units_kwh: float = Field(..., ge=0.0, le=500_000.0)
    historical_avg_kwh: float = Field(..., ge=1.0, le=500_000.0)
    sanctioned_load_kw: float = Field(default=3.0, ge=0.5, le=5000.0)
    billed_energy_inr: float | None = Field(default=None, ge=0.0, le=10_000_000.0)


@router.post("/chat")
def chat(body: Chat, db: Session = Depends(get_db), u: User = Depends(current_user)):
    q = body.question.lower()

    # Judge / executive query: "Which zone has highest breach risk and why?"
    if "zone" in q and ("breach" in q or "risk" in q or "highest" in q or "worst" in q):
        open_rows = [
            r
            for r in visible_requests(db, u).all()
            if r.status not in ("COMPLETED", "REJECTED")
        ]
        if not open_rows:
            return {
                "answer": "No open requests are currently pending across visible zones.",
                "data": [],
            }
        by_zone: dict[str, list[ConnectionRequest]] = defaultdict(list)
        for r in open_rows:
            by_zone[r.zone or "North"].append(r)

        zone_summaries = []
        for z_name, z_rows in by_zone.items():
            avg_risk = round(sum(float(r.sla_breach_risk or 0.0) for r in z_rows) / len(z_rows), 3)
            high_risk_cnt = sum(1 for r in z_rows if float(r.sla_breach_risk or 0.0) >= 0.7)
            reason_counts: Counter[str] = Counter()
            for r in z_rows:
                for rsn in json.loads(r.sla_risk_reasons or "[]"):
                    reason_counts[rsn] += 1
            top_reasons = [rsn for rsn, _ in reason_counts.most_common(3)] or [
                "Standard queue load"
            ]
            zone_summaries.append(
                {
                    "zone": z_name,
                    "open_requests": len(z_rows),
                    "high_risk_requests": high_risk_cnt,
                    "avg_sla_breach_risk": avg_risk,
                    "top_reasons": top_reasons,
                }
            )
        zone_summaries.sort(
            key=lambda x: (-x["avg_sla_breach_risk"], -x["high_risk_requests"], -x["open_requests"])
        )
        top = zone_summaries[0]
        return {
            "answer": (
                f"{top['zone']} zone currently has the highest SLA-breach risk "
                f"(average risk {top['avg_sla_breach_risk']}, {top['high_risk_requests']} high-risk of "
                f"{top['open_requests']} open request(s)) — top drivers: {'; '.join(top['top_reasons'])}."
            ),
            "data": zone_summaries,
        }

    if "breach" in q or ("sla" in q and "risk" in q) or "likely" in q:
        rows = [
            r
            for r in visible_requests(db, u).all()
            if r.sla_breach_risk >= 0.4 and r.status not in ("COMPLETED", "REJECTED")
        ]
        rows.sort(key=lambda r: -r.sla_breach_risk)
        if not rows:
            return {"answer": "No open requests currently have SLA-breach risk ≥ 0.4.", "data": []}
        data = [
            {
                "id": r.id,
                "applicant": r.applicant_name,
                "zone": r.zone,
                "status": r.status,
                "sla_breach_risk": r.sla_breach_risk,
                "reasons": json.loads(r.sla_risk_reasons or "[]"),
            }
            for r in rows[:10]
        ]
        return {
            "answer": f"{len(data)} open request(s) are at SLA risk. Highest: {data[0]['applicant']} (risk {data[0]['sla_breach_risk']}) — {'; '.join(data[0]['reasons'])}.",
            "data": data,
        }

    if "how many" in q or " pending" in q:
        rows = visible_requests(db, u).all()
        return {
            "answer": f"There are {sum(r.status not in ('COMPLETED','REJECTED') for r in rows)} pending of {len(rows)} total requests.",
            "data": [],
        }

    ans = policy_answer(body.question)
    ans.setdefault("data", [])
    return ans


@router.get("/ml-metrics")
def ml_metrics(u: User = Depends(current_user)):
    return metrics()


@router.get("/ai-governance")
def ai_governance(db: Session = Depends(get_db), u: User = Depends(require("officer", "admin"))):
    """Model registry, live inference/drift monitoring, API versioning, and human-approval proof."""
    return build_ai_governance_report(db, u)


@router.post("/billing-anomaly")
def billing_anomaly_check(
    body: BillingAnomalyRequest,
    u: User = Depends(current_user),
):
    """AI-assisted billing consumption & RGPU slab anomaly triage (IsolationForest + tariff rules)."""
    return detect_billing_anomaly(
        consumer_no=body.consumer_no,
        units_kwh=body.units_kwh,
        historical_avg_kwh=body.historical_avg_kwh,
        sanctioned_load_kw=body.sanctioned_load_kw,
        billed_energy_inr=body.billed_energy_inr,
    )


@router.get("/load-forecast")
def feeder_load_forecast(
    zone: str = Query("North", description="UGVCL zone code (North/South/East/West/Central)"),
    ambient_temp_c: float = Query(36.0, ge=10.0, le=52.0),
    rated_kva: float | None = Query(None, ge=25.0, le=5000.0),
    db: Session = Depends(get_db),
    u: User = Depends(require("officer", "engineer", "admin")),
):
    """24-hour 11kV feeder / DTR transformer kVA load forecast factoring live pending load in zone."""
    effective_zone = u.zone if u.role == "officer" else zone
    pending_kw = sum(
        float(r.requested_load_kw or 0.0)
        for r in visible_requests(db, u).filter(ConnectionRequest.zone == effective_zone).all()
        if r.status not in ("COMPLETED", "REJECTED")
    )
    return forecast_feeder_load(
        zone=effective_zone,
        ambient_temp_c=ambient_temp_c,
        rated_kva=rated_kva,
        pending_load_kw=pending_kw,
    )
