# Requirement-to-Solution Mapping — PS000125 (audit trail)

Status key: ✅ **Built** (demoable) · 🟡 **Lite** (simplified but working) · ◻️ **Roadmap** (slide only, not code).
Source text: [PS000125_OFFICIAL.md](PS000125_OFFICIAL.md). Rule for the finale: **never claim a ◻️ item as built.**

## A. The 12 problem points

| # | Problem (short) | VidyutFlow answer | Status | Evidence in repo / demo step |
| :--- | :--- | :--- | :---: | :--- |
| 1 | Repetitive data entry across systems | One `ConnectionRequest` record reused by consumer/officer/engineer/admin (“Enter Once, Use Everywhere”) | ✅ | `backend/app/models.py`; invariants in README; demo step 1–2 |
| 2 | Limited ERP/portal integration, manual data movement | API-first backend + simulated outbound ERP webhook adapter (`/erp/mappings`, `/erp/logs`, failed-sync queue, retry) | ✅ simulated adapter | `backend/app/erp_adapter.py`, `backend/app/routers/erp.py`; live UGVCL SAP/billing link is ◻️ roadmap |
| 3 | Multiple interfaces & logins | Role-based portals (`consumer`, `employee`, `field`, `management`, `admin`) + authenticated role switcher | ✅ | `routers/auth.py`, `frontend/src/components/layout/TopNav.tsx`, `VidyutFlowAuthModal.tsx` |
| 4 | Routine work needs manual intervention | Configurable workflow templates (`new_connection`, `load_extension`, `meter_replacement`, `billing_dispute`, `outage_safety`, + custom admin templates) driving validate → classify → SLA-risk → route by zone → assign | ✅ | `backend/app/workflow_templates.py`, `routers/workflows.py`, `LiveWorkflowTemplatesPanel.tsx`; demo step 2 |
| 5 | Response/connectivity delays hurt productivity | Composite DB indexes, epoch-invalidated KPI/template caching, `X-Response-Time-Ms` live telemetry (`/system/performance`), and local-first PWA queue | ✅ | `backend/app/perf.py`, `backend/scripts/load_check.py` (`docs/verification/r4-load-check.txt` — local synthetic check only, never quoted as a UGVCL benchmark) |
| 6 | Hardware/infrastructure modernisation & scalability | Software runs on one machine today (Compose); costed Small (₹14.80 L) / Medium (₹1.18 Cr) / Large (₹7.45 Cr) CAPEX+OPEX procurement tiers proposed | ◻️ | [INFRASTRUCTURE_ROADMAP.md](INFRASTRUCTURE_ROADMAP.md) — costed 3-tier budgetary proposal |
| 7 | Security **and** practical accessibility | JWT + RBAC + assignment-level checks, bcrypt, CORS allowlist — while one-click demo role-switching keeps legitimate access friction low | ✅ | `security.py`, `deps.py`, 403 tests; known gaps listed in README §Security |
| 8 | No intelligent alerts / tracking / proactive help | Operational alert engine (`SLA_BREACH_RISK`, `UNASSIGNED_STALE`, `REPEATED_ZONE_FAILURES`) with simulated SMS/Email outbox + hash-chained audit logs, **server-side notification centre**, assistant answers + live SLA watchlist, workflow stepper | ✅ (`IN_APP` live; SMS/Email simulated) | `backend/app/alerts.py`, `routers/notifications.py`, `LiveAlertEnginePanel.tsx`, `LiveSlaRiskWatchlist.tsx`; demo step 3 & 6 |
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
| 5 | Fast response, minimum waiting | Instant auto-routing on submit + composite DB indexes + epoch-invalidated KPI caching + live `/system/performance` telemetry — "no manual waiting in the demo flow" (never claim a UGVCL production ms figure) | ✅ |
| 6 | Less manual entry, duplicates, follow-up | No re-entry; UUID de-dup; live status visible to consumer | ✅ |
| 7 | Secure API-based integration, common data exchange | REST + JWT everywhere; one schema; **UI consumes it live** (KPIs, queue, submit, notifications) · legacy ERP adapters ◻️ roadmap | ✅ internal |
| 8 | Modern scalable hardware/storage/backup | Compose deployment + **checksummed backup & restore drill PASS**; costed Small/Medium/Large hardware & DR tiers proposed | ✅ backup · ◻️ hardware [INFRASTRUCTURE_ROADMAP.md](INFRASTRUCTURE_ROADMAP.md) |
| 9 | Cybersecurity, access control, monitoring, DR | RBAC/audit **hash chain + tamper check**/CORS/bcrypt/security headers + live system status | ✅ controls · 🟡 monitoring · ◻️ DR |
| 10 | Future compatibility (AI, cloud/hybrid, emerging) | Versioned `/v1/*` API (`X-API-Version: v1`), live ML governance & drift monitor (`/v1/assistant/ai-governance`, `LiveAiGovernancePanel.tsx`), advisory-only human-approval audit; real-data retraining gated on pilot | ✅ governance & `/v1` contract · ◻️ pilot retraining |
| 11 | Offline/low-connectivity + secure sync | Edge PWA + authenticated idempotent sync | ✅ |
| 12 | Real-time dashboards, actionable info | Live DB-backed Executive Analytics (`/requests/kpis/executive-analytics`, `LiveExecutiveAnalyticsSection.tsx`), KPIs, queue & SLA watchlist with 45s auto-refresh ("live on refresh"; SCADA/billing curves labelled simulated) | ✅ |
| 13 | Reduced workload / productivity | Measured real-flow counts (`12` fields entered once, `0` staff applicant re-entries, `0` manual routing handoffs, `3` staff transitions, `10` ERP fields auto-mapped — [WORKLOAD_MEASUREMENT.md](WORKLOAD_MEASUREMENT.md), `docs/verification/r5-workload-measurement.txt`); wall-clock % gated on Tier 1 pilot | ✅ field/click counts · ◻️ pilot stopwatch % |
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
| "response time is X ms (UGVCL)" | **"live rolling latency telemetry is exposed in `/system/performance` and `backend/scripts/load_check.py` verifies concurrent local reads; we do not claim a UGVCL production latency number"** | Local loopback != UGVCL production |
| "70% / 85% productivity improvement" | **"design target with a before/after timing plan on the pilot"** | Never measured — targets are assumptions |
| "AI approves/rejects connections" | **"models triage and explain; the officer decides"** | Core product invariant |
| "100% ML accuracy" | **"0.73/0.85 held-out vs 0.18/0.33 baseline on synthetic data"** | Honest current numbers (README fixed 22 Oct) |
| "we built the hardware/DR tier" | **"hardware and multi-AZ DR are a costed proposal; software runs on Compose today"** | Software cannot build servers |
| "integrated with UGVCL ERP" | **"API-first with a simulated SAP IS-U-style ERP webhook adapter (field mapping table, sync log, failed queue & retry); live UGVCL SAP/billing connectivity is roadmap"** | Simulated adapter only (no live UGVCL link) |
| "live SMS / email alerts" | **"operational alert engine writes in-app alerts, masked simulated SMS/email outbox dispatches, and hash-chained `ALERT_DISPATCHED` audit logs; no external telecom/SMTP gateway is called"** | Simulated SMS/email channel only |
| "tamper-proof audit log" | **"tamper-evident audit log (hash chain, admin verify)"** | Detectable, not impossible to tamper |

## F. Numbers audit checklist (WORK_PLAN 2.3)

- [x] ML figures: synthetic labels attached wherever they appear (README, ML_REPORT, charts, `/assistant/ml-metrics`)
- [x] Latency figure: labelled *local, synthetic* in every citation
- [x] Efficiency percentages: kept out of results sections; roadmap/targets only
- [x] Baseline figures (4–8 h routing, ₹/connection): labelled planning assumptions in README footnote
- [x] Old 1.000 accuracy claim removed/replaced everywhere it mattered (README) — ML_REPORT §Hostile questions keeps the story on purpose
