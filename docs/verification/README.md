# Verification evidence — 17 Oct 2026

Tested working tree: backend hardening + lifecycle safeguards + Compose fixes, based on remote `df2fe62`. The commit containing this report identifies the exact source under test. **Synthetic data only.**

## Executed results

| Check | Result | Evidence |
|---|---|---|
| Compose configuration | Passed after correcting malformed demo PostgreSQL password value | `docker-compose.yml` |
| Build/start | `docker compose up --build`; then `up -d --wait --wait-timeout 120` passed | Backend/frontend healthy, PostgreSQL healthy, Redis running |
| Proxy / PostgreSQL / four roles / flow / dedup | Passed | [compose-smoke.txt](compose-smoke.txt) |
| Actual browser offline conflict | Passed via scripted Chromium interactions, not human-manual | [browser-checks.txt](browser-checks.txt), [browser-results.json](browser-results.json) |
| Normal browser offline sync | Passed; retry returned duplicate | Same browser evidence |
| Restart persistence | PostgreSQL + backend restarted; states/meters/field and audit counts unchanged | [persistence.txt](persistence.txt) |
| Backend suite | 17 passed (SQLite unit/integration tests; warnings retained) | [backend-tests.txt](backend-tests.txt) |
| Frontend production build inside container | Passed | [frontend-build.txt](frontend-build.txt) |

Environment: Debian 13 x86_64 sandbox; Docker Engine 26.1.5+dfsg1 (vfs storage), Compose 2.26.1-4, PostgreSQL 16.15, Chromium 156.0.8078.4; backend image Python 3.12, frontend image Node 20. Docker was initially missing; installed using the sandbox's available sudo permissions and started through the process tool. Earlier statements that Docker was unavailable describe the earlier environment, not the result of this run.

## Browser sequence

1. Synthetic cases created through the consumer API. Engineer and officer logins use real browser forms in separate browser contexts.
2. Engineer opens the request and enters meter details. Chromium networking is switched offline (not merely the app's Airplane toggle). Clicking **Save inspection offline** stores the UUID in localStorage.
3. Officer rejects that same request through the browser Approval Center.
4. Engineer reconnects; automatic sync returns 409 with a visible conflict toast. The exact queued UUID/payload stays on device. Clicking **Sync now** returns 409 again. The server request is unchanged.
5. The existing **Discard** button removes that local queue item explicitly. It does not alter the rejected server request.
6. A separate normal request is saved offline and reconnects successfully. Queue empties, consumer sees COMPLETED and the correct meter, and repeat UUID returns duplicate.
7. No uncaught page JavaScript exceptions were recorded. Expected 409 responses are not treated as application crashes.

Screenshots reviewed visually:
- [Offline queued inspection](browser-offline-queued.png)
- [Rejected-request conflict retained in queue](browser-conflict-retained.png)
- [Successfully completed job](browser-completed.png)

## Failures found and corrected

- Compose POSTGRES_PASSWORD was a YAML list placeholder; changed to the same **demo-only** password used by the backend DSN.
- `pg_isready` omitted the database name and probed nonexistent database `vidyut`; now explicitly checks `vidyutos`.
- Containers reported running before API readiness, causing the first smoke attempt to fail. Added backend HTTP and frontend-proxy healthchecks and gated frontend startup on backend health. The subsequent waited smoke run passed.
- Previous lifecycle documentation incorrectly claimed no discard UI existed. Browser inspection confirmed the pre-existing local Discard control; documentation corrected. There is still no merge/rebase conflict-resolution workflow.

## Boundaries / still pending

This is **scripted real-browser acceptance testing with visual screenshot review**, not a human-operated manual sign-off. A team member should still execute the manual demo checklist on their target laptop/phone. Cold-start/reload while fully offline, mobile browser matrix, concurrent PostgreSQL load testing, production security and full hardware integrations were not verified. API response models and final team contract acceptance remain pending; no API freeze or production readiness claimed.

Reproduce after starting the Compose stack:

```sh
python scripts/verify_compose.py
python -m pip install playwright
python -m playwright install --with-deps chromium
python scripts/verify_browser_conflicts.py
```

Docker commands require Docker socket access (use sudo where appropriate). Browser fixture script requires the standard synthetic demo accounts and writes two requests per run. It does not log bearer tokens.
