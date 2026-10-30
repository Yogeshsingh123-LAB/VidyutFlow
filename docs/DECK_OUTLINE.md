# Deck outline — 12 slides (PDF ≤ 20 MB) — VidyutFlow PS000125

Rules: every figure labelled measured/synthetic/target · synthetic ML disclaimers on slides 7 & 9 ·
wording exactly per [REQUIREMENT_MAPPING.md](REQUIREMENT_MAPPING.md) §E. Assets: `docs/assets/architecture.svg` (slide 4),
`docs/assets/ml_confusion_matrices.png` + `ml_risk_distribution.png` (slide 9), demo screenshots (slide 5, Utsav).

| # | Slide | Key content (speaker notes in italics) |
| :--- | :--- | :--- |
| 1 | **Title** | VidyutFlow — Cloud-to-Edge Orchestration for Power Utilities · "Enter Once, Use Everywhere" · PS000125 · UGVCL · team + institute. *30-second opener: one sentence on the PS.* |
| 2 | **The problem** | The 12 PS pain points compressed to 4 rows: re-entry across systems · manual routing (4–8 h, **planning assumption**) · no offline field capture · SLA breaches found after deadline. *Name the PS points verbally (1,2,4,8,9,11).* |
| 3 | **VidyutFlow: one flow** | Submit → validate → classify (ML) → SLA-risk (ML) → route/assign → field (offline) → decide. "Click-and-get-work-done". *Emphasise: ML triages; the officer decides.* |
| 4 | **Architecture** | `architecture.svg` — built (colored) vs roadmap (grey dashed). Control plane + edge PWA + one data model. *Point at the grey box first: "everything grey is honestly roadmap".* |
| 5 | **Workflow demo** | Screenshots: wizard → live ML toast (category/severity/risk) → officer Live Request Queue → case drawer + SLA reasons. *This is where the live API is visible; say "this is the real backend, not mockups".* |
| 6 | **Offline sync & de-dup** | UUIDv4 queue → JWT-authenticated sync → each UUID accepted once (sync-twice demo) + backup/tamper/restore drill PASS. *Demo step 4 script; mention the restore drill evidence.* |
| 7 | **AI — honest by design** | Two small models + TF-IDF policy assistant + SLA watchlist. Banner: **SYNTHETIC data · triage, not verdict · officer decides**. *Say the 30-second honesty script from ML_REPORT verbatim.* |
| 8 | **Security** | JWT + RBAC + zone scoping · bcrypt · CORS allowlist · **tamper-evident audit chain + admin verify** · login throttle · security headers · production guards. *Known-gaps one-liners ready in SECURITY.md if asked.* |
| 9 | **Results (synthetic)** | `ml_confusion_matrices.png` + `ml_risk_distribution.png`; table: 0.733/0.846/0.794 vs baselines 0.185/0.328/0.625. Performance: composite DB indexes, epoch-invalidated KPI caching, and live `/system/performance` rolling p50/p95 telemetry (concurrent local load check in `r4-load-check.txt`). *Never claim UGVCL production accuracy or ms figures.* |
| 10 | **Requirements map** | 12 PS points → status (✅ 7 · 🟡 4 · ◻️ 1) + 14 outcomes → ✅ 11 · 🟡 1 · ◻️ hardware/DR. Point to REQUIREMENT_MAPPING.md as the audit trail. *This slide pre-empts "did you cover our PS?"* |
| 11 | **Roadmap & scale-up** | Legacy ERP adapters (first!) · Kafka/Temporal · WebSockets · Flutter edge · fine-tuned LLM in VPC · multi-AZ/DR · hardware tiers (proposal) — **contracts stay stable**. *Answer to outcome 8/10 lives here.* |
| 12 | **Team & next steps** | 5 roles · pilot plan: real UGVCL data → retrain → re-baseline → before/after timing study (outcome 13 measurement) · ask: approval for a scoped pilot. *Close on the measurement plan, not on claims.* |
