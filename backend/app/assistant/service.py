"""AI assistant (Lite): TF-IDF RAG over policy docs + live data queries.
No external LLM — fully offline and defendable line-by-line. Fine-tuned LLM/VPC is roadmap."""
import os, glob, json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

_docs, _vec, _mat = [], None, None
def _load():
    global _docs, _vec, _mat
    if _vec is not None: return
    base = os.path.join(os.path.dirname(__file__), "..", "..", "data", "policies")
    for p in sorted(glob.glob(os.path.join(base, "*.md"))):
        text = open(p).read()
        for chunk in [c.strip() for c in text.split("\n") if c.strip()]:
            _docs.append({"source": os.path.basename(p), "text": chunk})
    if _docs:
        _vec = TfidfVectorizer(stop_words="english"); _mat = _vec.fit_transform([d["text"] for d in _docs])

def policy_answer(q: str):
    _load()
    if not _docs: return {"answer": "No policy documents loaded.", "sources": []}
    sims = cosine_similarity(_vec.transform([q]), _mat)[0]
    top = sims.argsort()[::-1][:2]
    hits = [{"source": _docs[i]["source"], "text": _docs[i]["text"]} for i in top if sims[i] > 0.03]
    if not hits: return {"answer": "I could not find that in the policy documents. Try asking about new connections, SLA or offline field work.", "sources": []}
    return {"answer": " ".join(h["text"] for h in hits), "sources": sorted({h["source"] for h in hits}), "excerpts": hits}
