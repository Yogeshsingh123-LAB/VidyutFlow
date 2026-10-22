# Mail to UGVCL Resource Person — email draft

**To:** hmtcotech2@ugvcl.com · **Send:** after locking PS000125 on the portal — immediately (finalised 22 Oct 2026) (one mail, from the team-lead SPOC only) · **Follow-up:** one polite reminder after 7 days, then stop. Every answer received must be reflected in `REQUIREMENT_MAPPING.md` (replace assumptions with confirmed facts, citing "per UGVCL resource person, <date>").

## Why mail at all
The build currently assumes: SLA timelines (24/48/72/120 h by severity), complaint categories, a simplified org chain (officer → engineer → admin), two zones, and synthetic scale figures. A short set of answers from UGVCL retires most of that risk before the synopsis (6 Nov) and the finale defence (2 Dec).

## Ready-to-send draft (finalised 22 Oct 2026 — ready to send)

> **Subject:** Seva First Innovation Challenge — PS000125: Student team seeking brief guidance on scope & validation
>
> Respected Sir/Madam,
>
> We are a student team from Gandhinagar University, led by Yogesh Kumar Singh, participating in the Seva First Innovation Challenge. We have selected Problem Statement **PS000125** (Future-Ready, Secure and Intelligent IT Infrastructure & User-Friendly ERP/Portal Ecosystem) and are building a working prototype: a unified role-based portal for new connections and complaints with automated workflow routing, SLA tracking, an AI assistant over policy documents, and offline field-work sync for low-connectivity areas. We use **synthetic data only** and are not seeking any production access or real consumer data.
>
> To align our synopsis (due 6 Nov) with UGVCL's actual priorities, we would be grateful for brief guidance on:
>
> 1. Which of the problem areas (duplicate data entry, portal integration, offline field work, SLA follow-up, dashboards) is the highest priority for UGVCL today?
> 2. The typical steps and official timelines/SLAs for a new connection request, and the complaint categories used in your current system.
> 3. Field conditions: devices used by field staff and areas with poor connectivity, so our offline design is realistic.
> 4. Any public SOPs/circulars (e.g., new-connection procedure) we may reference, and any sample *formats* (blank forms/report layouts) you can share — structure only, no real data.
> 5. For the infrastructure part of the statement: is a phased modernization *proposal* expected, and are there hosting/security preferences (cloud/on-premise, SSO) we should design for?
> 6. Approximate scale we should design for (subdivisions, consumers, requests per day).
> 7. A set of **mock datasets** (anonymised structure is fine — field names, formats and volume patterns only, no real consumer data) so our prototype and tests mirror realistic records.
> 8. **Datasets for training and testing our SLA-breach prediction** — even aggregated/anonymised figures (e.g., request type × actual days to resolution) would help us validate the model beyond synthetic data.
> 9. The consumer-facing **complaint category options** — the exact list a consumer can choose from when raising a complaint in your current system (dropdown/menu options).
>
> Written replies to any subset, at your convenience, would help us greatly. We would also welcome the opportunity to show the prototype to your team before the Grand Finale (2 Dec) if that is feasible.
>
> Thank you for your time and for posing this problem statement.
>
> Yogesh Kumar Singh · Gandhinagar University · 9558271649 · y10805311@gmail.com

## Never ask / never do
- No real consumer data, credentials, or production access (state synthetic-only up front — done in the draft).
- No questions answerable from public sources (tariffs, company profile).
- No repeat nudges beyond one reminder; no mailing other UGVCL addresses found online.
- Don't promise features in the mail that are ◻️ roadmap in `REQUIREMENT_MAPPING.md`.

## After replies arrive
1. Update `REQUIREMENT_MAPPING.md` statuses/notes with confirmed facts + date.
2. If SLA hours/categories differ, Role 1 (backend) + Role 3 (ML) adjust `workflow.py`/taxonomy and retrain (`make train`) — this is why the contract freeze is 24 Oct.
3. Quote *one* confirmed fact in the synopsis problem section ("per UGVCL…") — judges reward validated problems.

## Plan A — if UGVCL never replies (role-wise: fully doable without their help)

The prototype already runs end-to-end on synthetic data. No role is blocked.

| Role | Can finish without UGVCL | How the assumption risk is contained |
| :--- | :--- | :--- |
| **R1 Backend & Workflow** | Entire workflow, routing, SLA clocks, audit, all APIs, seed data | Keep SLA hours, categories and zones as **config values** (`config.py`), so a late correction is a one-line change, not a refactor |
| **R2 Frontend & PWA** | All four portals, offline queue/sync, notifications, reports | Role labels stay generic ("Officer/Engineer"); an i18n-ready structure means Gujarati strings can drop in later without layout changes |
| **R3 ML & AI** | Both models trained on labelled synthetic data; assistant answers from clearly-labelled demo policy extracts | Taxonomy lives in one list — relabelling = edit + `make train` (minutes, not days) |
| **R4 DevOps/Security/QA** | Docker, Makefile, backups, tests, security defaults, audit pack | Defaults follow public best practice (JWT/RBAC/bcrypt/CORS); any UGVCL-specific policy would be config/SSO work, not redesign |
| **R5 Docs/Demo/Product** | Synopsis, deck, demo, mapping docs — complete today | Every assumption is **labelled as an assumption** in `REQUIREMENT_MAPPING.md`; honest framing scores better than silent guessing |

**Rule:** after the 24 Oct contract freeze, no role waits for the mail. The demo on 2 Dec works with zero UGVCL input.

## Plan B — after resources/replies arrive (role-wise: plug-in upgrades)

Treat every reply as a drop-in replacement for an assumption — budget ~1–2 days total, none of it structural.

| Role | Upgrade unlocked | Effort |
| :--- | :--- | :--- |
| **R1 Backend & Workflow** | Real SLA matrix + approval hierarchy (JE/DE/EE titles, circle/division tree) into config + seed roles | Config/seed edit + tests still green |
| **R2 Frontend & PWA** | Real form fields & report formats; official role names; Gujarati labels if UGVCL wants them | Label/field swaps on existing screens |
| **R3 ML & AI** | Retrain on the **official complaint taxonomy**; replace demo policy extracts with real public SOPs/circulars in the assistant (RAG source swap) | Same pipeline — `make train`, documents folder swap |
| **R4 DevOps/Security/QA** | Align to stated hosting (cloud/on-prem), SSO, DPDP/audit-retention expectations; size infra tiers with real scale numbers | Settings + `INFRASTRUCTURE_ROADMAP.md` update with confirmed figures |
| **R5 Docs/Demo/Product** | Synopsis quotes confirmed facts ("per UGVCL resource person…"); mapping rows flip from *assumption* to *validated*; if offered, schedule the pre-finale demo/visit | Doc edits + demo-script tweak; biggest marks gain per hour spent |

**Deadline logic:** replies before **24 Oct** → fold into the synopsis draft directly. Replies **after 24 Oct** → apply only config/label swaps (Plans above), nothing structural, per the freeze. No reply at all → Plan A, and the mail itself is still evidence of stakeholder outreach in the deck.
