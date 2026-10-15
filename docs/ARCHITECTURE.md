# Architecture (Lite — as built)
```
Consumer / Officer / Engineer / Admin  (React PWA, Tailwind)
        │  /api  (Vite proxy — browser code never calls a backend host directly)
        ▼
FastAPI (single Python service)
 ├─ JWT auth + RBAC · bcrypt hashing · audit log
 ├─ Rule-based workflow: validate → ML classify → SLA-risk → route by zone → assign
 ├─ ML (scikit-learn, SYNTHETIC data): category+severity classifier · SLA-breach predictor (+ reasons)
 ├─ Assistant: TF-IDF RAG over backend/data/policies/ + live DB queries (no external LLM)
 └─ Field sync: POST /requests/field-sync — client_uuid is UNIQUE, re-syncs are ignored
        ▼
PostgreSQL (Docker Compose) / SQLite (local fallback) · Redis service reserved in Compose (roadmap wiring)
```
Design choices a small team can defend: one backend service (no micro-service sprawl), models retrained
from `backend/app/ml/synthetic.py` on first start, and every non-built item lives in `ROADMAP.md`, not in code.
