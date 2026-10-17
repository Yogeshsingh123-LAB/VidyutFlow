# Docker Compose verification — R4 execution pack

**Status: runtime verification PASSED on 17 Oct 2026.** Docker was installed and the stack built and exercised against PostgreSQL. Scripted real-Chromium offline/conflict checks and restart persistence also passed. See [dated evidence](verification/README.md). Human-manual sign-off is still pending; API freeze has other review gates.

## Prerequisites

- Docker Engine/Desktop running, Docker Compose v2, Git and Python 3 on the host.
- Use the commit containing the dated verification report, including its security changes and verification scripts.
- Ports 8000 and 5173 available. Stop local development servers on those ports first.
- Demo only: Compose contains known demo credentials and seeds synthetic users. Do not expose this stack publicly or use real consumer data.

## Build, start and check (from repository root)

```sh
docker version
docker compose version
docker compose config --quiet
docker compose up --build --wait --wait-timeout 300
# Healthchecks now gate readiness. Inspect logs and confirm the proxy:
docker compose logs --tail=100 backend frontend
curl --fail http://127.0.0.1:5173/api/health
python scripts/verify_compose.py
```

If the readiness curl fails during model training/startup, inspect logs and retry after startup completes. Do not repeatedly rebuild to conceal an error. The script fails if PostgreSQL is not the backend's actual database.

The script verifies frontend API proxy, all four seeded logins, PostgreSQL connectivity, synthetic request creation/routing, engineer approval denial, field sync, UUID retry deduplication, consumer completion visibility and consumer admin-directory denial. It leaves one clearly labelled synthetic request per successful run and does not print tokens or passwords. Avoid rapid repeated runs: login throttling counts all four login attempts.

## Browser and persistence checks (required separately)

1. Open `http://localhost:5173`. Check each portal and the console/network panel for failed API requests.
2. Execute `DEMO_SCRIPT.md`, including the browser's actual offline queue → reconnect → retry sequence. The Python script tests sync semantics, **not** service-worker behavior or airplane mode.
3. Record the synthetic request ID printed by the script. Run `docker compose restart backend`; after readiness, log in as the consumer and verify the same ID/status/meter is still present.
4. Check officer North/South isolation with the seeded accounts. Capture evidence without bearer tokens or real personal data.
5. Record frontend production build and backend test results separately: `make build`, `make test` (host dependencies required).

## Evidence to record

Create a dated entry in `CODE_REVIEW.md`: tested commit/worktree, host OS/architecture, Docker and Compose versions, command exit codes, PostgreSQL dialect check, synthetic request ID, restart/persistence result, browser offline-sync result, and any failures/fixes. Record the actual date; never backfill an unexecuted test as passed.

When every check passes, R4 marks Phase 1.1 verified. R1 still resolves `API_CONTRACT.md` review gates before approving Phase 1.3 freeze.

## Packaging fixes made during readiness review

Added backend/frontend `.dockerignore` files. Host `node_modules`, build output, local database files, Python caches, `.env` secrets and generated joblib models no longer enter Docker build contexts. This prevents `COPY . .` from overwriting container-installed frontend dependencies with host dependencies. Backend model artifacts are trained/loaded at runtime; the existing Compose model bind mount is unchanged.

## Cleanup

```sh
docker compose down
```

This preserves PostgreSQL's named volume. **Do not add `-v` unless deliberately deleting all local demo database data.** Redis is reserved/unused in this prototype; a running Redis container does not prove queue integration.

## Known deployment limits

This is a development/demo stack: Vite dev server, known seeded passwords, placeholder JWT secret, local model bind mount, no TLS, no production proxy trust policy and process-local login throttling. A successful smoke test does not make it production-ready.
