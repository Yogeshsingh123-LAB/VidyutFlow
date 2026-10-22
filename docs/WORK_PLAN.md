# Work Plan — Remaining Work, Divided Role-Wise

**Team:** R1 Yogesh Kumar Singh 👑 Leader · R2 Utsav · R3 Aakash Kumar Singh · R4 Sandip Kumar · R5 Arnav (details: [TEAM_ROLES.md](TEAM_ROLES.md))
**Milestones:** 🔴 **17 Oct** registration lock · 🟠 **24 Oct** API contract freeze · 🟡 **6 Nov** synopsis due · 🟢 **2 Dec** Grand Finale
**Rule:** a task is done when its *evidence* exists (file, green test, screenshot, or link) — not when it's "almost ready". Tick boxes here; the leader reviews every Friday.

---

## Phase 0 — Registration lock (by 17 Oct) 🔴

| # | Task | Owner | Evidence when done |
| :--- | :--- | :--- | :--- |
| 0.1 | Accept GitHub invite (if pending) & make first small commit (e.g. fix a typo in own doc) so he appears on contributors | **Arnav** (@coderAJ22) | Username on contributors graph |
| 0.2 | Utsav & Sandip Kumar: first commit each in own module (README touch/label fix is fine) | **Utsav, Sandip Kumar** | Contributors graph shows all 5 |
| 0.3 | **Lock PS000125 on the portal** (permanent — double-check ID before confirming) + set GitHub About/topics (repo Settings ⚙️; text ready in the "professional repo" commit notes) | **Yogesh Kumar Singh** (only owner can) | Portal confirmation screenshot in team chat |
| 0.4 | Fill team/institute details into the synopsis + mail drafts (replace `[brackets]`) | **Arnav** | No `[ ]` placeholders left in `docs/SYNOPSIS_ABSTRACT.md`, `docs/MAIL_TO_UGVCL.md` |
| 0.5 | Send the UGVCL mail (optional but recommended; one mail, leader's name) | **Yogesh Kumar Singh** sends, Arnav drafts | Sent-mail screenshot; replies → `REQUIREMENT_MAPPING.md` per Plan B |

## Phase 1 — Freeze-ready build (by 24 Oct) 🟠

| # | Task | Owner | Depends on | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| 1.1 | Run `docker compose up --build` end-to-end; fix whatever breaks; note it in README QA table | **Sandip Kumar** | — | ✅ **17 Oct** — Compose/PostgreSQL + restart persistence + scripted Chromium checks; `docs/verification/compose-smoke.txt`, `docs/COMPOSE_VERIFICATION.md`. Agent re-verify of Compose is blocked (no Docker in agent sandbox) — CI runs the equivalent on GitHub runners |
| 1.2 | Add CI via GitHub web UI (`.github/workflows/ci.yml`: `make test` + `make build`) — token can't push workflows, owner adds it | **Yogesh Kumar Singh** (adds), Sandip Kumar (writes YAML) | — | ✅ **22 Oct** — `ci.yml` written (backend pytest + frontend tests/tsc/build). Owner pushes workflow file if the token refuses it, then confirm the first green Actions run |
| 1.3 | API contract freeze: final review of endpoints/response shapes; no breaking changes after this date | **Yogesh Kumar Singh** | 1.1 | Freeze note in `CHANGELOG.md` |
| 1.4 | Frontend polish pass: loading/empty states, Gujarati label readiness (i18n structure only), accessibility (labels/contrast) | **Utsav** | 1.3 (shapes frozen) | Build green; screenshots for deck |
| 1.5 | ML final pack: retrain (`make train`), export metrics + 2 charts (confusion matrix, risk distribution) for the deck; keep SYNTHETIC labels | **Aakash Kumar Singh** | — | `docs/ML_REPORT.md` updated; chart images in `docs/assets/` |
| 1.6 | If UGVCL replied: apply Plan B swaps (SLA hours/taxonomy/role names) — config/label changes only | R1+R3 (data), R2 (labels) | 0.5 | `REQUIREMENT_MAPPING.md` rows marked *validated* |
| 1.7 | Security quick wins within freeze: login rate-limit note or simple throttle; officer zone-scoping **decision** (build or defer to roadmap — record it) | **Sandip Kumar** + Yogesh Kumar Singh | 1.3 | ✅ **22 Oct** — throttle built (`login_limit.py`, 20/min/IP, tested) · zone-scoping **built & fail-closed** (prototype assumption pending UGVCL org tree) · known-gaps one-liners recorded in `SECURITY.md` §Known-gaps |

## Phase 2 — Synopsis (by 6 Nov) 🟡

| # | Task | Owner | Depends on | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| 2.1 | Final synopsis text (problem → architecture → impact, assumptions labelled) and portal submission | **Arnav** (writes), Yogesh Kumar Singh (approves) | 0.4, 1.5, 1.6 | Submitted confirmation |
| 2.2 | One architecture diagram (built vs roadmap visually distinct) for synopsis + deck | **Yogesh Kumar Singh** | 1.3 | Image in `docs/assets/` |
| 2.3 | Synopsis numbers audit: every figure labelled measured/synthetic/target — no orphan percentages | **Aakash Kumar Singh** (ML figs), Arnav (rest) | 1.5 | Checklist signed in `docs/REQUIREMENT_MAPPING.md` §D |

## Phase 3 — Finale pack (by 2 Dec) 🟢

| # | Task | Owner | Depends on | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| 3.1 | Build the actual 12-slide deck (`.pptx`, from `docs/DECK_OUTLINE.md`) | **Arnav** | 1.4 screenshots, 1.5 charts, 2.2 diagram | `docs/deck/VidyutFlow_PS000125.pptx` (≤20 MB) |
| 3.2 | Demo screenshots pack (one per role view + offline-sync sequence) | **Utsav** | 1.4 | Images in `docs/assets/` |
| 3.3 | Record 3–5 min demo video following `docs/DEMO_SCRIPT.md` (each role narrates own segment) | **All** (Arnav edits) | 3.2 | Video file/link in README |
| 3.4 | Full rehearsal ×3 with timing; backup plan: recorded video + offline DB snapshot if venue Wi-Fi fails | **Yogesh Kumar Singh** (runs), all attend | 3.1, 3.3 | Rehearsal log in team chat |
| 3.5 | Defence Q&A drill: every member can answer "where is PS point N?" from `REQUIREMENT_MAPPING.md` + the 7 invariants | **All** (Sandip Kumar quizzes) | — | Drill done ×2 |
| 3.6 | Freeze code 30 Nov; only demo-critical fixes after (label issues `demo-critical`) | **Yogesh Kumar Singh** | 3.4 | Tag `v1.0-finale` on `main` |

## Backlog (only if time remains — never before Phase 1–2)

| Task | Owner | Note |
| :--- | :--- | :--- |
| Frontend smoke tests (login + one flow per role) | Utsav + Sandip Kumar | ✅ Now 7 suites green incl. `tests/live-api-wiring.test.ts` (18 checks) — keep green in CI |
| Simple load check (100 req) to replace "unbenchmarked" with a measured local figure | Sandip Kumar | ✅ **22 Oct** — `backend/scripts/load_check.py`: 100 mixed reads, **p50 3.1 ms · p95 4.5 ms · 0 errors** (local, synthetic) · `docs/verification/r4-load-check.txt` |
| Backup→wipe→restore drill (R1 handoff to R4) | Sandip Kumar + Yogesh | ✅ **22 Oct** — `scripts/restore_drill.sh`: checksum verify ✓ tamper rejected ✓ restore identical ✓ live-serve ✓ · `docs/verification/r4-backup-restore.txt` |
| Gujarati UI strings | Utsav | Only if UGVCL asks (Plan B) |
| Contractor/govt read-only role | Yogesh Kumar Singh + Utsav | Only if UGVCL confirms it's in scope |

## Critical path (what actually blocks the finale)

`0.3 registration lock` → `1.1 Compose verify` → `1.3 freeze` → `1.4/1.5 screenshots & ML pack` → `2.1 synopsis` → `3.1 deck` → `3.3 video` → `3.4 rehearsal`.
Everything else can slip; these cannot. If a role is stuck >24 h, the leader reassigns — silence is the only real blocker.

## R1 progress — 17 Oct 2026

- Backend step 1 implemented locally: engineer permission review and sync duplicate authorization; `make test`: **6 passed**. Details: `CODE_REVIEW.md`.
- Phase 1.3 is **not frozen**; Compose verification and remaining security decisions are pending.

- Backend step 2 implemented locally: officer zone-scoping built (prototype policy), shared visibility rules, assistant leak fixed, same-zone active routing. `make test`: **7 passed**. Phase 1.7 is only partially complete: login throttle remains pending. Next: login protection, then API contracts and Compose verification.

- Backend step 3 implemented locally: configurable process-local login throttle, consumer-only public registration, inactive-login denial. `make test`: **10 passed**. Phase 1.7 implementation and decision evidence now recorded in `CODE_REVIEW.md`; production distributed limits remain roadmap. API contract review and Compose verification still block Phase 1.3 freeze.

- Backend step 4 implemented locally: `API_CONTRACT.md`, generated `api/openapi.json`, export script and schema drift test. **11 tests passed**. Inventory correction: 16 HTTP operations across 15 paths. Freeze remains pending; see contract review gates. Docker executable is absent from this sandbox, so Compose runtime verification remains blocked here (not passed).

- Compose readiness pack prepared locally: `COMPOSE_VERIFICATION.md`, `scripts/verify_compose.py`, backend/frontend `.dockerignore`. Script syntax/help checks passed. Docker/Podman/socket absent here; full runtime, browser offline and persistence verification remain **pending**, so Phase 1.1 is not complete.

- API review decisions implemented locally: admin-only system status; consumer-only creation (both forms); consistent pending KPI/assistant semantics; frontend aligned. **12 backend tests passed**, frontend build passed. Remaining freeze gates are listed in `API_CONTRACT.md`; Docker runtime still unavailable here.

- Lifecycle protection implemented locally: state graph, terminal-state guards and status/timestamp conditional writes; field retry semantics preserved. **17 backend tests passed**, frontend build passed. See `STATUS_TRANSITIONS.md`. Next coding task: typed response contracts; Docker runtime and final team acceptance remain freeze gates.

- **17 Oct verification update:** Phase 1.1 technical runtime evidence now exists: Docker stack built/started after configuration/readiness fixes, PostgreSQL smoke + restart persistence passed. Real Chromium scripted offline conflict and normal sync passed; 17 backend tests + container frontend build passed. `verification/README.md` supersedes earlier sandbox-blocked notes. R4/team manual sign-off and remaining API freeze gates still pending.
