import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, ConnectionRequest
from ..deps import current_user
from ..access import visible_requests
from ..assistant.service import policy_answer
from ..ml.predict import metrics

router = APIRouter(prefix="/assistant", tags=["assistant"])
class Chat(BaseModel): question: str

@router.post("/chat")
def chat(body: Chat, db: Session = Depends(get_db), u: User = Depends(current_user)):
    q = body.question.lower()
    if "breach" in q or "sla" in q and "risk" in q or "likely" in q:
        rows = [r for r in visible_requests(db, u).all() if r.sla_breach_risk >= .4 and r.status not in ("COMPLETED","REJECTED")]
        rows.sort(key=lambda r: -r.sla_breach_risk)
        if not rows: return {"answer": "No open requests currently have SLA-breach risk ≥ 0.4.", "data": []}
        data = [{"id": r.id, "applicant": r.applicant_name, "zone": r.zone, "status": r.status,
                 "sla_breach_risk": r.sla_breach_risk, "reasons": json.loads(r.sla_risk_reasons or "[]")} for r in rows[:10]]
        return {"answer": f"{len(data)} open request(s) are at SLA risk. Highest: {data[0]['applicant']} (risk {data[0]['sla_breach_risk']}) — {'; '.join(data[0]['reasons'])}.", "data": data}
    if "how many" in q or " pending" in q:
        rows = visible_requests(db, u).all()
        return {"answer": f"There are {sum(r.status not in ('COMPLETED','REJECTED') for r in rows)} pending of {len(rows)} total requests.", "data": []}
    ans = policy_answer(body.question); ans.setdefault("data", []); return ans

@router.get("/ml-metrics")
def ml_metrics(u: User = Depends(current_user)): return metrics()
