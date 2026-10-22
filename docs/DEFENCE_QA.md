# Defence Q&A sheet — PS000125 · VidyutFlow (print for every member)

Sources: [REQUIREMENT_MAPPING.md](REQUIREMENT_MAPPING.md) · [ML_REPORT.md](ML_REPORT.md) · [SECURITY.md](../SECURITY.md) · [API_CONTRACT.md](API_CONTRACT.md).

## A. The 3 hostile ML questions (Role 3 — 2-line answers)

1. **Is this real UGVCL data?** — No; every row is synthetic, disclosed on README/report/API/charts. Real-data retrain + validation is the explicit post-pilot step.
2. **Why should we trust 79%?** — You shouldn't trust it as a verdict: +17 pts over the majority baseline (0.625), breach precision 0.79 / recall 0.62 printed openly. It buys triage order; the reasons + the officer buy the decision.
3. **Your classifier once showed 100% — isn't that fake?** — 100% was a templating artefact and we said so; the harder hold-out now shows 0.73/0.85 and we publish that. We kept the honest number.

## B. Expected PS questions

| Question | Answer (2 lines max) |
| :--- | :--- |
| Where is PS point N? | Point at `REQUIREMENT_MAPPING.md` §A row N — status ✅/🟡/◻️ with named evidence; every member can pull it up in 10 s. |
| Is this "real-time"? | Live dashboards refreshed every 45 s ("live on refresh"); streaming is roadmap. No false claims. |
| What did you measure? | Local, synthetic only: p95 4.5 ms over 100 reads; ML held-out vs baselines. Everything else is labelled target/assumption. |
| Hardware/DR? | Costed proposal (INFRASTRUCTURE_ROADMAP.md); the software runs on Compose today with checksummed backup + restore drill. |
| Legacy ERP integration? | First roadmap item; the API contract is frozen so adapters slot in without touching the workflow. |
| Why should UGVCL adopt this? | One flow is end-to-end working with audit + offline + honest ML; pilot plan = governed data → retrain → before/after timing study. |
| Who approves the connection? | The officer, always. Models triage and explain; every action is audit-logged (hash chain). |
| What if the network drops in a village? | The field PWA queues with UUIDs and syncs later; re-sync cannot duplicate (proven by test + demo). |
| Is it secure? | JWT+RBAC+zone scoping, bcrypt, CORS allowlist, login throttle, security headers, tamper-evident audit; known gaps listed with defences in SECURITY.md. |
| What if ML is wrong? | Reasons are shown, risk is a probability, guardrail escalates unknown safety phrasing, human decision is final and logged. |

## C. Rules in the room

- Never quote a number without its label (**measured/local/synthetic/target**).
- "Not built — roadmap, here's the plan" scores better than a bluff that collapses under a follow-up.
- Live demo fails → recorded video + offline DB snapshot (Role 4 kit) — say "precaution", keep moving.
