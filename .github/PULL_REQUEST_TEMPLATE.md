## What does this PR do?

<!-- One or two sentences. Link the issue if there is one: Closes #… -->

## Role / area

- [ ] Role 1 · Backend & Workflow (`backend/app/`)
- [ ] Role 2 · Frontend & PWA (`frontend/src/`)
- [ ] Role 3 · ML & AI (`backend/app/ml/`, `assistant/`)
- [ ] Role 4 · DevOps / Security / QA (Compose, Makefile, tests)
- [ ] Role 5 · Docs / Demo / Product (`README.md`, `docs/`)

## PS000125 requirement

<!-- Which problem point / expected outcome does this serve? See docs/REQUIREMENT_MAPPING.md -->

## Checks

- [ ] `make test` passes (backend)
- [ ] `make build` passes (frontend, if touched)
- [ ] No secrets, `.env`, `*.db`, or `*.joblib` committed
- [ ] Anything not backed by the real API is labelled DEMO/SIMULATED in UI/docs
- [ ] Synthetic-data results are never described as UGVCL real-world performance
- [ ] README/docs updated if behaviour changed (and `docs/QUICK_AUDIT.md` regenerated if README changed)

## Screenshots / demo notes

<!-- For UI changes: before/after or which role login + tab shows it. -->
