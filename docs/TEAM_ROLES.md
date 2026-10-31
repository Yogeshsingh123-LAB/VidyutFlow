# Team Roles — VidyutFlow in 5 Roles

**Assigned 16 Oct 2026 — all 5 roles filled. Team Leader: Yogesh (Role 1); Aakash Kumar Singh, Utsav, Sandip, Arnav: Collaborators.** GitHub IDs: **@Yogeshsingh123-LAB** (Yogesh Kumar Singh, owner),
**@utsavmandalia-01** (Utsav), **@1006coder** (Aakash Kumar Singh — ML commit `029b116`), **@SANDIP29072007**
(Kushwaha Sandip) and **@coderAJ22** (Arnav, ID confirmed by the team lead, 16 Oct).
Note: the public contributors graph only lists members who have committed so far (@Yogeshsingh123-LAB,
@1006coder) — Utsav, Sandip and Arnav will appear there after their first commits. If any invite still
shows as pending under *Settings → Collaborators*, accept it before registration closes (17 Oct).

Repo checked **15 Oct 2026** at commit `d8e7a1b` (healthy: `make setup && make test` → **3 passed**,
`make build` → clean). The work is divided below by **actual modules in this repo**, so every file
has exactly one owner. Write your name against a role by **17 Oct** (registration close) — pick by
strength, not by roll number: *like Python logic → Role 1 · like screens/design → Role 2 ·
like data/maths → Role 3 · like servers/security → Role 4 · like writing/presenting → Role 5.*

| # | Role | Owns (repo paths) | Name | Demo segment (1 min each) |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Backend & Workflow** | `backend/app/` core + `routers/requests.py`, `workflow.py` | **Yogesh Kumar Singh — 👑 Team Leader** · [@Yogeshsingh123-LAB](https://github.com/Yogeshsingh123-LAB) (repo owner) | Submit → auto-route |
| 2 | **Frontend & PWA** | `frontend/src/`, `frontend/public/` | **Utsav** · [@utsavmandalia-01](https://github.com/utsavmandalia-01) (Collaborator ✓ · VidyutOne author) | Portal tour + wizard |
| 3 | **ML & AI** | `backend/app/ml/`, `backend/app/assistant/`, `backend/data/policies/` | **Aakash Kumar Singh — Collaborator** · [@1006coder](https://github.com/1006coder) (Collaborator ✓ · contributor) | SLA-risk + assistant Q&A |
| 4 | **DevOps, Security & QA** | `docker-compose.yml`, `Makefile`, Dockerfiles, `security.py`, `deps.py`, tests | **Sandip** · [@SANDIP29072007](https://github.com/SANDIP29072007) (Collaborator ✓) | Offline sync + security |
| 5 | **Docs, Demo & Product** | `README.md`, `docs/`, deck, video, synopsis | **Arnav** · [@coderAJ22](https://github.com/coderAJ22) (Collaborator ✓) | Problem framing + roadmap close |

---

## Role 1 — Backend & Workflow Lead (Python / FastAPI)

**Mission:** the request must flow submit → validate → classify → route → assign → decide with no manual re-entry, and never lose or duplicate a record.

**Owns:** `backend/app/main.py` · `models.py` · `db.py` · `workflow.py` · `routers/requests.py` ·
`routers/auth.py` (with Role 4) · `routers/system.py` · `backend/data/` schema concerns

**Deliverables**
- [x] Workflow engine, zone routing, SLA clocks, audit writes *(in repo)*
- [x] Field-sync de-duplication (`client_uuid` UNIQUE) *(in repo)*
- [ ] Freeze the API contract (endpoints in README §REST API) by **24 Oct** — frontend codes against it
- [ ] Before Nov 6: only bug fixes on the demo path; no new endpoints after **1 Nov**
- [ ] Before Dec 2: seed-data polish (realistic North/South cases), DB backup/restore rehearsed with Role 4

**Hands off to:** Role 2 (API responses), Role 3 (calls `classify_text()` / `sla_risk()` from `workflow.py` — signature changes need Role 3's OK)

## Role 2 — Frontend & PWA Lead (React)

**Mission:** a judge must be able to run the whole demo from the UI without touching a terminal.

**Owns:** `frontend/src/App.tsx` · `components/` (`layout/`, `common/`, `consumer/`, `employee/`, `field/`, `management/`, `admin/`) ·
`context/AppContext.tsx` · `utils/` · `frontend/public/sw.js` + manifest · `index.html`

**Deliverables**
- [x] Role portals, wizard, case drawer, command palette, dark mode, offline queue *(in repo)*
- [ ] Before Nov 6: demo-path polish only — labels, empty states, projector-readable fonts; test at 125% zoom
- [ ] Offline rehearsal: airplane-mode → queue → sync twice (no duplicates) on the **actual demo laptop**
- [ ] Before Dec 2: screenshots of every demo step (deck + backup if live demo fails)

**Hands off from:** Role 1 (API shapes — never mock around a missing field, raise it), Role 5 (wording for labels/toasts)

## Role 3 — ML & AI Lead (Python / scikit-learn)

**Mission:** two small, honest models the team can defend line by line — and the numbers to prove they beat guessing.

**Owns:** `backend/app/ml/` (`synthetic.py`, `train.py`, `predict.py`, `models/metrics.json`) ·
`backend/app/assistant/` (RAG) · `backend/data/policies/` · `docs/ML_REPORT.md`

**Deliverables**
- [x] Category+severity classifier, SLA-breach predictor, TF-IDF policy assistant *(in repo)*
- [x] Keep `metrics.json` reproducible: any data change ⇒ `make train` and commit the new metrics — verified byte-identical (22 Oct)
- [x] Own the **honesty script** for judges: synthetic data, baselines, why 100% classifier accuracy is a templating artefact — `docs/ML_REPORT.md` §Honesty script (22 Oct; README stale 1.000 table corrected the same day)
- [x] Before Dec 2: prepare 3 hostile questions (“Is this real UGVCL data?”, “Why should we trust 79%?”) with 2-line answers — `docs/ML_REPORT.md` §Hostile questions + `docs/DEFENCE_QA.md` (22 Oct)
- [ ] Grow policy corpus from 3 extracts toward the real procedure set (if provided) — retrieval only, no fine-tuning promises

**Hands off to:** Role 1 (predict-function signatures), Role 5 (the exact accuracy wording used in deck/abstract — never unlabelled)

## Role 4 — DevOps, Security & QA Lead

**Mission:** it runs anywhere, it is safe to show, and “it worked on my laptop” is never heard after Oct 24.

**Owns:** `docker-compose.yml` · both `Dockerfile`s · `Makefile` · `backend/app/config.py` ·
`security.py` · `deps.py` (with Role 1) · `.env.example` · `backend/tests/` · `scripts/`, `backend/scripts/`

**Deliverables**
- [x] Compose stack, Makefile targets, backup/demo-reset scripts, CORS allowlist, bcrypt/JWT *(in repo)*
- [x] Test suite green from a clean machine (`make setup && make test`) — re-verify **weekly**
- [ ] Before Nov 6: one full `make up` rehearsal on a clean checkout; change every demo password if the deck shows them publicly
- [x] Own defense-in-depth security controls (`HttpOnly; SameSite=Strict` cookies, Redis-ready login throttle, `VFENC1` HKDF-SHA256 + AES-256-GCM upload & field encryption, SHA-256 hash-chained `AuditLog`, ArcSight/Wazuh `CEF:0` SIEM export, and `<60s` Primary → Hot-Standby DR failover drill) — [`docs/SECURITY.md`](SECURITY.md) & [`docs/DISASTER_RECOVERY.md`](DISASTER_RECOVERY.md)
- [ ] Before Dec 2: offline fallback kit — pre-trained models, local DB backup, recorded demo (with Role 5) if Wi-Fi fails

**Reviews:** every PR touching `security.py` / `deps.py` / CORS needs this role's approval.

## Role 5 — Documentation, Demo & Product Lead

**Mission:** what gets submitted (synopsis, deck ≤ 20 MB, video) and what gets said in the room. This role guards scope and the calendar.

**Owns:** `README.md` · `docs/` (esp. `DEMO_SCRIPT.md`, `ROADMAP.md`, `SYNOPSIS_ABSTRACT.md`, `DECK_OUTLINE.md`) ·
deck file · demo video · portal submission · this file

**Deliverables**
- [ ] **16–17 Oct:** team registered, PS000125 locked against the full portal text, names filled in above
- [ ] **1–3 Nov:** full demo run start-to-finish, timed (3–5 min); freeze scope — *not in the demo script ⇒ not built*
- [ ] **4–5 Nov:** video recorded, deck exported (PDF ≤ 20 MB), **submit a day early** (synopsis cannot be edited after submission)
- [ ] Keep every figure labelled assumption/target vs measured; synthetic-data disclaimers present in deck + video voiceover
- [ ] **24 Nov–1 Dec:** two timed defence rehearsals; print the Q&A sheet (Role 3's hostile questions)

**Authority:** this role can veto feature additions after 1 Nov, and owns the final submit button (with Role 4 verifying links/files).

---

## Who approves what (RACI, short form)

| Decision / artefact | R1 Backend | R2 Frontend | R3 ML/AI | R4 DevOps/Sec | R5 Docs/Demo |
| :--- | :---: | :---: | :---: | :---: | :---: |
| API contract change | **A/R** | C | C | C | I |
| UI/demo-path change | C | **A/R** | I | C | C |
| Model data or metrics | C | I | **A/R** | C | C (wording) |
| Deploy, secrets, passwords | C | I | I | **A/R** | I |
| Synopsis/deck/video submission | C | C | C | C (verify) | **A/R** |
| Scope addition after 1 Nov | C | C | C | C | **A (veto)** |

<sub>R = does it · A = accountable · C = consulted · I = informed</sub>

## Shared working rules (all 5 roles)

1. **Branches:** `role/<n>-<short-task>` (e.g. `role/3-sla-reasons`), PR into `main`; the interface partner reviews (R1↔R2 on API, R3↔R5 on numbers/wording).
2. **Never commit:** `.env`, real secrets/passwords, `*.db`, `*.joblib`, tokens. (`.gitignore` already blocks them — keep it that way.)
3. **Contracts are sacred after 24 Oct:** endpoint shapes, `metrics.json` keys, and the offline-sync payload (`client_uuid`, `request_id`, `task_status`, `notes`, `meter_serial`) change only with both owners' OK.
4. **Labels travel with numbers:** synthetic/simulated/assumption tags from code → UI → deck → video, unchanged.
5. **Weekly green check:** Role 4 runs `make test && make build` every Friday; red build = stop and fix before new features.

## If the team is smaller than 5

| Team size | Merge like this |
| :--- | :--- |
| **4** | Role 5 absorbs weekly QA checklist from Role 4 (Role 4 keeps deploy/security) |
| **3** | R1+R4 (backend/devops) · R2 (frontend) · R3+R5 (ML/docs) |
| **2** | Person A: R1+R3+R4 (all Python/deploy) · Person B: R2+R5 (UI/demo/docs) |
| **1 (solo)** | Order matters: R1 → R2 → R4 (get it running) → R3 → R5; cut scope to the demo script only |

## GitHub setup (5 minutes, Role 5 + Role 4)

- Labels: `role:backend` `role:frontend` `role:ml-ai` `role:devops` `role:docs` + `demo-critical`
- One issue per unchecked box above, assigned to the role owner; milestone **“Synopsis – Nov 6”** and **“Finale – Dec 2”**
- Fill in the name column in this file in the same PR that creates the first issue
**Remaining work, task-by-task with deadlines:** [WORK_PLAN.md](WORK_PLAN.md) (Phases 0–3: registration lock → freeze → synopsis → finale).

---

## Live Judge Viva Deep-Dive Cheat Sheet (Every Member Must Defend Their Module)

1. **Role 1 — Yogesh Kumar Singh (Backend, Workflow & Heterogeneous ERP Gateway)**:
   - **Files**: `backend/app/workflow.py`, `backend/app/routers/{requests,erp,workflows,staff}.py`.
   - **Key Defense**: Explains the 7 configurable `WorkflowTemplate` definitions, least-loaded active zone auto-routing (`0` manual handoffs), and how `POST /v1/erp/gateway/propagate/{id}` + `GET /v1/erp/reconcile` synchronize **SAP S/4HANA FI-CA/IS-U OData v4 (`AUFNR` + `VKONT`)**, **e-Urja CIS Billing**, and **GUVNL 1912 CRM** without replacing legacy ERP systems (`0` re-typed fields).
2. **Role 2 — Utsav (React 19 Frontend, Multilingual UX & Offline Field PWA)**:
   - **Files**: `frontend/src/components/{consumer,employee,field,management,admin,common}/`, `frontend/src/utils/{backendSession,offlineQueue}.ts`.
   - **Key Defense**: Explains 5 role-isolated portals, 4-language parity (`en`/`gu`/`hi`/`mr`) split into lazy chunks (`index-*.js < 230 kB`), `HttpOnly` cookie + tab-memory session verification (`BroadcastChannel` fail-closed), and IndexedDB `client_uuid` offline field sync.
3. **Role 3 — Aakash Kumar Singh (5-Model `scikit-learn` Suite & Hybrid RAG)**:
   - **Files**: `backend/app/ml/{synthetic,train,predict,predictive_services,governance}.py`, `backend/app/assistant/rag.py`.
   - **Key Defense**: Explains unseen template-group holdout (`tpl_id == 8` held out per class to prevent vocabulary leakage), Category `TF-IDF + LogisticRegression` (`0.8824`), Severity balanced classifier + life-safety rule guardrail (`100%` `CRITICAL` recall), Cost-Sensitive `RandomForest` at `triage_threshold = 0.38` lifting SLA breach recall from `0.617 → 0.8913`, `IsolationForest` + GERC RGPU slab billing anomaly audit (`0.9511` acc / `1.00` recall), `GradientBoostingRegressor` 24h feeder kVA load forecast (`R² = 0.9790`), and offline `TF-IDF` policy RAG + optional `3.5s`-bounded server `Gemini`.
4. **Role 4 — Sandip (Cybersecurity, AES-256-GCM, SIEM & Live DR Failover)**:
   - **Files**: `backend/app/{security,uploads,audit}.py`, `backend/routers/system.py`, `backend/scripts/{offsite_replicate.sh,restore_drill.sh,dr_failover_drill.py}`.
   - **Key Defense**: Explains HKDF-SHA256 + AES-256-GCM field & `VFENC1` KYC upload vault encryption, serialized `AuditChainHead` SHA-256 hash chain, ArcSight/Wazuh `CEF:0` SIEM export (`/v1/system/siem-events`), and the `<1s` (`<60s` SLA) Primary Kill → Hot-Standby promotion failover drill (`0` records lost).
5. **Role 5 — Arnav (PS000125 Coverage, Cloud-to-Edge IT BOM & Live Demo Flow)**:
   - **Files**: `README.md`, `docs/{REQUIREMENT_MAPPING,INFRASTRUCTURE,INFRASTRUCTURE_ROADMAP,SECURITY,DEMO_SCRIPT,DEFENCE_QA}.md`.
   - **Key Defense**: Explains all 12 official `PS000125` requirement areas, the **500× Substation Raspberry Pi 4 + Dual-SIM 4G LTE concentrator (`₹8,000/unit = ₹40L`)** edge layer, BSNL/GFGNL MPLS + SD-WAN failover, and the 3-tier `₹14.80L / ₹1.18Cr / ₹7.45Cr` UGVCL rollout plan.

