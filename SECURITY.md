# Security Policy

## Scope

VidyutFlow is a **hackathon prototype** (Seva First Innovation Challenge, PS000125) running on
synthetic data. It is not connected to any UGVCL production system and holds no real consumer data.

## Reporting a vulnerability

Do **not** open a public issue for a suspected vulnerability. Email the team leader
(**@Yogeshsingh123-LAB** via GitHub) with:

- a description of the issue and affected endpoint/component,
- steps to reproduce (demo accounts from the README are fine),
- the impact you believe it has.

We aim to acknowledge within 3 working days. Because this is a prototype, fixes land on `main`
directly; there are no supported release branches.

## Current posture (honest)

Implemented: bcrypt password hashing, JWT auth with RBAC + assignment-level checks, restricted CORS,
zone-scoped officer access, login throttling, audit logging of officer actions, and no password hashes
exposed via the API. Registration rejects passwords exceeding bcrypt's 72-byte UTF-8 limit rather
than silently truncating them.

Known prototype limitations (documented in README §Security Posture — do not deploy as-is):
JWT in `localStorage`, process-local login throttling, document uploads store metadata only, and
demo credentials are intentionally seeded in development mode. Production mode requires a
non-placeholder `SECRET_KEY`, does not seed demo users or requests, and refuses to start if
the database already contains those demo accounts. Production hardening (SSO,
secret vault, shared rate limiting, multi-AZ, WAF) is roadmap — see `docs/ROADMAP.md` and
`docs/INFRASTRUCTURE_ROADMAP.md`.

## Team auth story (say this, exactly)

> *"One credential set signs you into the portal workspace and the backend API. The portal keeps
> its server session (HttpOnly cookie); live panels also hold a role-scoped backend JWT
> (`vidyutos_token`). Every business operation is authorized server-side — the browser state
> grants nothing."*

## Known-gaps one-liners (for the defence Q&A)

| Gap | One-line defence |
| :-- | :--------------- |
| JWT in `localStorage` | Prototype trade-off for the PWA; production moves to HttpOnly cookies + refresh rotation (roadmap) |
| Process-local login throttle | Bounded 20/min/IP per process; shared gateway rate-limiting is the production answer (documented, not hidden) |
| Document uploads store filename only | Deliberate: no file content at rest to leak; object storage + scanning is roadmap |
| Seeded demo credentials | Development only; `APP_ENV=production` refuses to start against a DB containing them and rejects placeholder secrets |
| Single-node SQLite fallback | Compose runs PostgreSQL; backups are checksummed (`scripts/backup.sh`) and restorable (`scripts/restore.sh`) — drill evidence below |
| Officer zone scope is a prototype assumption | Enforced fail-closed across requests/KPIs/assistant/audit; pending UGVCL confirmation of real org tree |

## Evidence (Role 4 drills, all local/synthetic)

- Load check (`scripts/load_check.py`, 100 mixed reads): **p50 3.1 ms · p95 4.5 ms · 0 errors** —
  `docs/verification/r4-load-check.txt`. Quote only as "measured locally on synthetic demo data".
- Backup → tamper-reject → wipe → restore → live-serve drill: **PASS** —
  `docs/verification/r4-backup-restore.txt` (`scripts/restore_drill.sh` reproduces it).
- CI: `.github/workflows/ci.yml` runs the backend suite and frontend tests/type-check/build on
  every push and PR.

## Secrets

Never commit API tokens, `.env` files, databases, or model binaries. If a secret is accidentally
committed, rotate it immediately and tell the team leader — removing the commit alone is not enough.
