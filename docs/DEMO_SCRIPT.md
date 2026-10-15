# Demo script (3–5 min) — same flow for synopsis video & live defence (Dec 2)
0. Start: `docker compose up --build` (or backend `uvicorn app.main:app` + frontend `npm run dev`). Open the frontend.
1. **Consumer** (`consumer@vidyut.local` / `Consumer@123`) submits a new-connection request + uploads a document.
2. Show it is auto-validated/routed — no manual re-entry (status ASSIGNED, category/severity/priority set by ML).
3. **Officer** (`officer@vidyut.local` / `Officer@123`): dashboard updated (KPI bento + by-status/zone/risk charts); press **Ctrl-K** and jump to the queue; open the case drawer, point at the workflow stepper + SLA-risk reasons. Toggle dark mode if the projector is bright.
4. **Engineer** (`engineer@vidyut.local` / `Engineer@123`): turn **Airplane mode** ON (top bar) → enter meter serial + inspection remarks → save offline (queued on device with UUID) → turn it OFF → **Sync queue**. Sync again — server says duplicate ignored, no second record.
5. Back as **Consumer**: status now COMPLETED.
6. Assistant: ask “Which requests are likely to breach SLA?” and “What is the procedure for a new connection?”
Say out loud: “Both ML models are trained on **synthetic data only**; accuracies are vs a majority-class baseline on a held-out test set.”
