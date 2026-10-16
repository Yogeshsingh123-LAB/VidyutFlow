# Security Policy

## Scope

VidyutOS Lite is a **hackathon prototype** (Seva First Innovation Challenge, PS000125) running on
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
audit logging of officer actions, no password hashes exposed via the API.

Known prototype limitations (documented in README §Security Posture — do not deploy as-is):
JWT in `localStorage`, no login rate limiting, document uploads store metadata only, officer actions
not yet zone-scoped, default seeded credentials. Production hardening (SSO, secret vault, multi-AZ,
WAF) is roadmap — see `docs/ROADMAP.md` and `docs/INFRASTRUCTURE_ROADMAP.md`.

## Secrets

Never commit API tokens, `.env` files, databases, or model binaries. If a secret is accidentally
committed, rotate it immediately and tell the team leader — removing the commit alone is not enough.
