# Requirement-to-Solution Mapping — PS000125 (audit trail)

Status key: ✅ **Built** (demoable) · 🟡 **Lite** (simplified but working) · ◻️ **Roadmap** (slide only, not code).
Source text: [PS000125_OFFICIAL.md](PS000125_OFFICIAL.md). Rule for the finale: **never claim a ◻️ item as built.**

## A. The 12 problem points

| # | Problem (short) | VidyutFlow answer | Status | Evidence in repo / demo step |
| :--- | :--- | :--- | :---: | :--- |
| 1 | Repetitive data entry across systems | One `ConnectionRequest` record reused by consumer/officer/engineer/admin (“Enter Once, Use Everywhere”) | ✅ | `backend/app/models.py`; invariants in README; demo step 1–2 |
| 2 | Limited ERP/portal integration, manual data movement | API-first backend — every capability is a REST endpoint; one data model for all portals | 🟡 | `backend/app/routers/`; legacy ERP adapters (billing/HR/SCADA wrappers) are ◻️ roadmap |
| 3 | Multiple interfaces & logins | Single JWT login → role-based workspace (consumer/officer/engineer/admin) + role switcher | ✅ | `routers/auth.py`, `frontend/src/components/Shell.jsx`; demo: four role logins |
| 4 | Routine work needs manual intervention | Rule workflow: validate → classify → SLA-risk → route by zone → assign, no manual re-entry | ✅ | `backend/app/workflow.py`; demo step 2 |
| 5 | Response/connectivity delays hurt productivity | Lightweight single-service API, local-first PWA queue, role-scoped queries | ✅ | **measured locally 22 Oct:** 100 mixed reads, p50 3.1 ms · p95 4.5 ms · 0 errors (`docs/verification/r4-load-check.txt`) — quote only as *local, synthetic* |
| 6 | Hardware/infrastructure modernisation & scalability | Software runs on one machine today (Compose); capacity/redundancy tiers proposed, hardware itself is procurement, not code | ◻️ | [INFRASTRUCTURE_ROADMAP.md](INFRASTRUCTURE_ROADMAP.md) — proposal specs only |
| 7 | Security **and** practical accessibility | JWT + RBAC + assignment-level checks, bcrypt, CORS allowlist — while one-click demo role-switching keeps legitimate access friction low | ✅ | `security.py`, `deps.py`, 403 tests; known gaps listed in README §Security |
| 8 | No intelligent alerts / tracking / proactive help | SLA-risk flags with reasons, **server-side notification centre** (22 Oct), assistant answers + live SLA watchlist, workflow stepper | ✅ | `routers/notifications.py`, `ml/predict.py`, LiveSlaRiskWatchlist; demo step 3 & 6 |
| 9 | Offline working + **secure** synchronisation | Edge PWA queues with UUIDv4; sync is JWT-authenticated, server accepts each UUID once (no duplicates) | ✅ | `POST /requests/field-sync`; sync-twice test; backup/tamper/restore drill PASS (`docs/verification/r4-backup-restore.txt`); demo step 4 |
| 10 | Backup, redundancy, DR, cybersecurity | Backup script + audit log + Compose today; redundancy/DR designed, not deployed | 🟡 | `backend/scripts/backup.sh` ✅; multi-AZ failover/Vault ◻️ roadmap |
| 11 | Consolidated, timely, actionable info for management & field | Fleet Management Console: KPI bento, charts, SLA-redressal (overdue-first), live system status | ✅ | `GET /requests/kpis/summary`, `GET /system/status`; demo step 3 |
| 12 | Compatible with AI, automation, APIs, analytics, future tech | ML policies + RAG assistant + documented REST contracts + analytics endpoints; event/LLM upgrades keep the same contracts | ✅/◻️ | Built: models, assistant, KPIs. Roadmap: Kafka, fine-tuned LLM, on-device inference |

## B. The 14 expected outcomes

Evidence refreshed **22 Oct 2026** after UI→API wiring (R2), security/audit hardening (R1) and QA drills (R4).

| # | Expected outcome | Delivered by | Status |
| :--- | :--- | :--- | :---: |
| 1 | Integrated, user-friendly ERP/portal access | One login (portal + API, same credentials), role workspaces, Ctrl-K palette | ✅ |
| 2 | Maximum automation of routine work | Workflow engine (routing/assignment/SLA clocks automatic) — visible live via wizard toast + Live Request Queue | ✅ |
| 3 | Enter once, use everywhere | Single `ConnectionRequest` record; wizard submit shows the same row in officer queue, engineer task, admin KPIs | ✅ |
| 4 | Intelligent workflows, alerts, validations, tracking | Workflow + SLA-risk reasons + **server-side notifications** + live SLA watchlist + stepper | ✅ |
| 5 | Fast response, minimum waiting | Instant auto-routing on submit; **measured locally: p50 3.1 ms · p95 4.5 ms (100 reads, 0 errors)** — "no manual waiting in the demo flow" | ✅ |
| 6 | Less manual entry, duplicates, follow-up | No re-entry; UUID de-dup; live status visible to consumer | ✅ |
| 7 | Secure API-based integration, common data exchange | REST + JWT everywhere; one schema; **UI consumes it live** (KPIs, queue, submit, notifications) · legacy ERP adapters ◻️ roadmap | ✅ internal |
| 8 | Modern scalable hardware/storage/backup | Compose deployment + **checksummed backup & restore drill PASS**; hardware tiers proposed | ◻️ hardware [INFRASTRUCTURE_ROADMAP.md](INFRASTRUCTURE_ROADMAP.md) |
| 9 | Cybersecurity, access control, monitoring, DR | RBAC/audit **hash chain + tamper check**/CORS/bcrypt/security headers + live system status | ✅ controls · 🟡 monitoring · ◻️ DR |
| 10 | Future compatibility (AI, cloud/hybrid, emerging) | Contract-shaped APIs; roadmap keeps contracts while swapping engines | ✅ design · ◻️ execution |
| 11 | Offline/low-connectivity + secure sync | Edge PWA + authenticated idempotent sync | ✅ |
| 12 | Real-time dashboards, actionable info | Live KPI/queue/watchlist panels with 45s auto-refresh ("live on refresh"; streaming is roadmap) | ✅ |
| 13 | Reduced workload / productivity | Automation of the demo flow end-to-end (**design goal**, not a measured %; measurement plan on pilot) | 🟡 |
| 14 | Faster, transparent consumer service | Wizard + live status + correction reasons + ML feedback (category/severity/risk) on submit | ✅ |

## C. Users coverage

| PS000125 user group | In this build | Notes |
| :--- | :--- | :--- |
| Corporate/circle/division/subdivision employees | Officer + Admin roles (zone = subdivision proxy: North/South) | Circle/division hierarchy ◻️ (org tree in roadmap) |
| Engineers / technical / field staff & supervisors | Engineer role; officer as supervisor view | ✅ |
| IT/system administrators | Admin: users, RBAC matrix, system status, settings | ✅ |
| Management / decision authorities | Admin **Fleet Management Console** + officer dashboards | ✅ |
| Consumers & applicants (secondary) | Consumer portal (wizard, tracking, complaints, bills-demo) | ✅ |
| Contractors / authorized agencies (secondary) | ◻️ Roadmap: scoped agency login (submit/track assigned works only) | Say “planned”, never show a fake contractor login |
| Government departments / stakeholders (secondary) | ◻️ Roadmap: read-only reporting access | Same as above |

## D. Claims discipline for synopsis, deck and defence

- Say **“live on refresh”**, not real-time streaming (no WebSockets yet). Say **“no manual waiting in the demo flow”**, not response-time numbers (unbenchmarked).
- Efficiency percentages from the design document are **targets/assumptions** — present as goals with the measurement plan (before/after timing on the pilot), never as results.
- Hardware (problem #6 / outcome #8) is answered as a **proposal** (specs, tiers, redundancy design). Software cannot “build” PCs/servers — claiming otherwise loses marks.
- The cloud-to-edge framing is an **orchestration lens** on this ERP/portal solution (control plane + edge field clients). The problem statement's own words — ERP/portal ecosystem, click-and-get-work-done — stay primary in the synopsis.

## E. Words grid for synopsis, deck & defence (R5 — say exactly this)

| Never say | Say instead | Why |
| :--- | :--- | :--- |
| "real-time dashboards/streaming" | **"live dashboards, refreshed every 45 seconds (live on refresh)"** | No WebSockets yet |
| "response time is X ms (UGVCL)" | **"measured locally on synthetic demo data: p95 4.5 ms over 100 reads"** | Benchmark is local, not production |
| "70% / 85% productivity improvement" | **"design target with a before/after timing plan on the pilot"** | Never measured — targets are assumptions |
| "AI approves/rejects connections" | **"models triage and explain; the officer decides"** | Core product invariant |
| "100% ML accuracy" | **"0.73/0.85 held-out vs 0.18/0.33 baseline on synthetic data"** | Honest current numbers (README fixed 22 Oct) |
| "we built the hardware/DR tier" | **"hardware and multi-AZ DR are a costed proposal; software runs on Compose today"** | Software cannot build servers |
| "integrated with UGVCL ERP" | **"API-first with documented contracts; legacy ERP adapters are the first roadmap item"** | No legacy adapters yet |
| "tamper-proof audit log" | **"tamper-evident audit log (hash chain, admin verify)"** | Detectable, not impossible to tamper |

## F. Numbers audit checklist (WORK_PLAN 2.3)

- [x] ML figures: synthetic labels attached wherever they appear (README, ML_REPORT, charts, `/assistant/ml-metrics`)
- [x] Latency figure: labelled *local, synthetic* in every citation
- [x] Efficiency percentages: kept out of results sections; roadmap/targets only
- [x] Baseline figures (4–8 h routing, ₹/connection): labelled planning assumptions in README footnote
- [x] Old 1.000 accuracy claim removed/replaced everywhere it mattered (README) — ML_REPORT §Hostile questions keeps the story on purpose
