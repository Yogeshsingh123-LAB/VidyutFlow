# Contributing to VidyutFlow

Thanks for helping build VidyutFlow (UGVCL · PS000125). This is a 5-member team repo — ownership is
split by module in [docs/TEAM_ROLES.md](docs/TEAM_ROLES.md). Work inside your role's paths; cross-role
changes need the owning role's review.

## Ground rules (non-negotiable)

1. **Live vs simulated honesty.** Anything not backed by the real API must be labelled
   `DEMO`/`SIMULATED` in the UI and README. Never present synthetic-data results as UGVCL performance.
2. **ML never decides.** Models classify/flag; officers approve/reject. Don't add auto-approval logic.
3. **No secrets, no real data.** Synthetic data only. Never commit tokens, `.env`, `*.db`, or `*.joblib`.
4. **Tests stay green.** `make test` (backend) and `make build` (frontend) must pass before merging.

## Local setup

```bash
make setup     # install backend + frontend dependencies
make backend   # API on :8000   (terminal 1)
make frontend  # app on :5173   (terminal 2) — or: make up (Docker Compose)
make test      # backend test suite
make build     # production frontend build
make train     # retrain ML models (synthetic data)
```

Demo accounts are seeded automatically — see README §Demo credentials. **Change all default
passwords and `JWT_SECRET` before any real deployment.**

## Workflow

- Branch per task: `role/<n>-<short-task>` (e.g. `role/3-sla-thresholds`), or use the GitHub labels
  `role:backend | role:frontend | role:ml-ai | role:devops | role:docs` + `demo-critical`.
- Small, focused commits with imperative messages (`Add …`, `Fix …`). Reference the PS000125
  requirement point (from [docs/REQUIREMENT_MAPPING.md](docs/REQUIREMENT_MAPPING.md)) when relevant.
- Open a PR into `main` using the PR template; the owning role for touched paths reviews.
- **Contract freeze:** API shapes (`backend/app/routers/`, response schemas) freeze **24 Oct 2026** —
  after that, frontend changes adapt to the API, not vice versa.
- After editing `README.md`, regenerate `docs/QUICK_AUDIT.md` so the audit pack stays in sync.

## Style

- Python: standard library + FastAPI/SQLAlchemy idioms already in the repo; type hints on new endpoints.
- Frontend: React function components, Tailwind utility classes, no new state libraries without a team decision.
- Match the surrounding code — consistency beats personal preference.

## Reporting issues

Use the issue templates (bug / feature). For anything security-sensitive, follow [SECURITY.md](SECURITY.md)
instead of opening a public issue.
