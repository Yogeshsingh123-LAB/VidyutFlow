# Architecture (Lite — as built)
**Cloud-to-edge reading:** the React PWA on field devices is the **edge client** (offline queue = edge
autonomy), FastAPI is the **control plane** (workflow, monitoring, policy validation), and the ML
models are the **AI policies** validated centrally today — on-device inference/policy push is roadmap.
```
Consumer / Officer / Engineer / Admin  (React 19 + TS PWA, Tailwind CSS 4, Vite 8)
        │
        ├── /api/ai-chat (Vite/Node server middleware)
        │     └─ Vidyut Mitra role co-pilots: optional server-side Gemini (3.5s deadline,
        │        read-only grounded tools) → automatic deterministic Role-Grounded Fallback
        │
        └── /api/* (Vite proxy — browser code never calls a backend host directly)
              ▼
FastAPI (single Python service)
 ├─ JWT auth + RBAC · bcrypt hashing · hash-chained audit log
 ├─ Rule-based workflow: validate → ML classify → SLA-risk → route by zone → assign
 ├─ ML (scikit-learn, SYNTHETIC data): category+severity classifier · SLA-breach predictor (+ reasons)
 ├─ Assistant (`POST /assistant/chat`): local TF-IDF RAG over `backend/data/policies/` + scoped live DB queries (no external LLM)
 └─ Field sync: POST /requests/field-sync — client_uuid is UNIQUE, re-syncs are ignored
              ▼
PostgreSQL (Docker Compose) / SQLite (`vidyutflow.db` fallback) · Redis service reserved in Compose (roadmap wiring)
```
Design choices a small team can defend: one backend service (no micro-service sprawl), models retrained
from `backend/app/ml/synthetic.py` on first start, and every non-built item lives in `ROADMAP.md`, not in code.
