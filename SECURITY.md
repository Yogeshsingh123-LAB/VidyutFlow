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

Implemented: bcrypt + scrypt password hashing, unified `HttpOnly; SameSite=Lax` session cookies across
both the Node runtime (`vidyutflow_sid`) and FastAPI (`vidyutflow_access_token`) plus Bearer JWT
support for CLI/API clients, RBAC + assignment-level checks, authenticated `/api/ai-chat` proxy with
server-derived ERP grounding, centralized Redis-backed login throttling (`REDIS_URL` with bounded
in-memory fallback), serialized tamper-evident SHA-256 `AuditLog` hash chain (`AuditChainHead` +
`chain_seq`), HKDF-SHA256 + AES-256-GCM upload encryption-at-rest helper (`app/uploads.py`),
simulated OIDC / Gujarat Parichay SSO (`403` disabled in `APP_ENV=production`), restricted CORS,
zone-scoped officer access, and zero password hashes exposed via the API.

See also:
- Penetration Test & CERT-In VAPT Plan: `docs/PENETRATION_TEST_PLAN.md`
- Disaster Recovery, Offsite Replication (`backend/scripts/offsite_replicate.sh`) & RPO/RTO Runbook: `docs/DISASTER_RECOVERY.md`
- Production Infrastructure Architecture: `docs/INFRASTRUCTURE_ROADMAP.md`

## Team auth story (say this, exactly)

> *"Portal authentication uses an HttpOnly SameSite cookie; live FastAPI panels separately verify
> exact credentials against FastAPI (`/auth/me` email + RBAC role) and hold the backend JWT in tab
> memory only (never in `localStorage` or `sessionStorage`). Every business operation is authorized
> server-side — browser state grants nothing."*

## Known-gaps one-liners (for the defence Q&A)

| Gap | One-line defence |
| :-- | :--------------- |
| Dual-store prototype auth (Node cookie + in-memory FastAPI JWT) | Tab-memory bridge verifies exact identity/role and never falls back to shared demo accounts; unified server-side SSO + refresh rotation is roadmap |
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
