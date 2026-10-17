# VidyutOne-inspired upgrade (Oct 15, 2026)
Reference reviewed: https://github.com/utsavmandalia-01/vidyutone (frontend-only demo, all data in-browser mock data, no backend/auth/tests).
This repo keeps its real FastAPI + PostgreSQL/SQLite backend, JWT/RBAC, trained ML models, RAG assistant and server-side UUID de-duplication — and adopts the reference's **UX ideas** (re-implemented in this codebase, not its mock-data layer):

| VidyutOne idea | VidyutFlow implementation (real data) |
|---|---|
| Welcome screen with role cards | Login hero with 4 role cards that autofill the seeded demo accounts |
| AppShell: sidebar + top nav + mobile nav | `frontend/src/components/Shell.jsx` — role-aware sidebar, sticky top bar, mobile drawer |
| Separate role portals | Role-aware tabs: consumer wizard, officer queue, engineer field console, admin executive dashboard |
| Command palette / notifications / toasts | Ctrl-K palette (`Shell.jsx`), alerts derived live from SLA-risk/needs-correction/queue, toast system |
| Case detail drawer + workflow visualizer | `RequestDrawer.jsx` + 6-step `WorkflowStepper` driven by real request status |
| Multi-step new-connection wizard, tariff/phase types | 3-step wizard; `tariff_category`, `phase`, `premises_type` are now real DB/API fields |
| Executive cockpit charts & feeder panel | SVG bars from `GET /requests/kpis/summary` (now by zone/category/severity + risk buckets); feeder panel kept **SIMULATED-labelled** only |
| Dark mode, design tokens, field inspection form | Class-based dark mode persisted on device; meter-serial + remarks form posts through the real field-sync API |

Deliberately **not** adopted: in-browser mock datasets, fake payment/billing flows, and any simulated figure
presented as live — every number in this app comes from the API except the clearly-labelled feeder panel.

## Feature-parity pass (all VidyutOne features)
Every feature found in the reference repo is now present. Where the reference used in-browser mock
data, the feature here is either wired to the real API or explicitly labelled DEMO/SIMULATED in the UI:
cinematic intro (skippable, once/session, replay) · welcome role cards · role-welcome + role-switch
modals (real re-login) · app shell/sidebar/mobile nav · dark mode · command palette (Ctrl-K) ·
notification drawer + notifications page with read state · case drawer · 5-step workflow visualizer ·
AI-assistant drawer · deep links (`#/tab`) · consumer dashboard/connections/bills(slab, pay, receipt —
demo estimate)/payments/complaint desk (real)/requests/notifications/profile · employee ERP overview,
application queue, consumer ledger, complaint queue, approval center, dept coordination, CSV reports ·
field console, work orders, detailed site inspection, feeder patrol, offline queue manager, completed
history · management executive cockpit, SLA redressal, feeder radar (SIMULATED), AI insights, exports ·
admin system overview (live `/system/status`), users & roles (live `/auth/users`), RBAC matrix,
integrations, audit trail, settings. Not ported as-is: the reference's invented financial/persona
datasets — replaced by live request data or labelled demo estimates.
