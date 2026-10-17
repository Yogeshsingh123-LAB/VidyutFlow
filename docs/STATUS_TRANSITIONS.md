# Request lifecycle — prototype policy

**Status:** implemented locally; pending UGVCL SOP validation and team review. This is a safety rule for the existing demo, not a new business workflow.

Authorization runs first. Officer/admin roles can use the status PATCH vocabulary; engineers can PATCH only IN_PROGRESS, FIELD_VERIFIED or COMPLETED. Field sync accepts only FIELD_VERIFIED, COMPLETED or BLOCKED. Those endpoint/role restrictions intersect with the following table; a row does not grant additional permissions.

| Current status | Permitted next statuses |
|---|---|
| SUBMITTED | NEEDS_CORRECTION, ASSIGNED, REJECTED |
| NEEDS_CORRECTION | ASSIGNED, REJECTED |
| ROUTED | ASSIGNED, APPROVED, REJECTED, NEEDS_CORRECTION |
| ASSIGNED | IN_PROGRESS, FIELD_VERIFIED, APPROVED, COMPLETED, REJECTED, NEEDS_CORRECTION, BLOCKED |
| IN_PROGRESS | FIELD_VERIFIED, APPROVED, COMPLETED, REJECTED, NEEDS_CORRECTION, BLOCKED |
| FIELD_VERIFIED | APPROVED, COMPLETED, REJECTED, NEEDS_CORRECTION, BLOCKED |
| APPROVED | IN_PROGRESS, FIELD_VERIFIED, COMPLETED, BLOCKED |
| BLOCKED | IN_PROGRESS, FIELD_VERIFIED, COMPLETED, REJECTED, NEEDS_CORRECTION |
| COMPLETED | None — terminal |
| REJECTED | None — terminal |

Non-terminal same-status updates are allowed if permitted by the endpoint/role, e.g. field notes while BLOCKED. Terminal same-status writes are also rejected (409); they must not modify notes, meters or audit state. Unknown stored states fail closed.

## Compatibility with the demonstration

ASSIGNED → COMPLETED remains permitted for the existing one-step field demo. Officer approval is **not a mandatory completion prerequisite** in this Lite simulation. This must not be presented as a validated UGVCL installation/energisation SOP. Approval and field work currently share one status field; prior approvals remain in audit history when later field status replaces APPROVED. A separate approval state and an audited reopen/reversal workflow are not implemented.

Corrections can be returned to ASSIGNED by an authorized officer/admin, but this endpoint does not edit application fields or re-run validation. It does not prove missing documents have been corrected. There is no ordinary API override to reopen terminal cases, including for admins.

## Stale offline submissions and duplicate retries

- Authorize the caller against the current request before looking up a UUID.
- An already-recorded same-actor/same-request UUID is acknowledged as a duplicate even after completion, without applying new data.
- A fresh UUID targeting a terminal request returns 409. No field update, meter change or audit event is committed.
- State changes use an atomic conditional update matching the previously read status and updated_at. A stale database snapshot returns 409 instead of overwriting a later committed decision.
- Status change, field row and audit event commit in one transaction. A duplicate uniqueness failure rolls back the tentative status/meter change before acknowledging the existing update.

The compare-and-swap protects against concurrent database writes between server read and write; it is **not** a client version/ETag protocol. An old client command that remains allowed by the current graph can still succeed. Browser offline timestamps are informational, not trusted ordering/version tokens.

The UI excludes terminal cases from field actions and does not mislabel HTTP 4xx conflicts as network outages. Existing offline queue entries remain on device after a conflict and sync pauses for review (head-of-line blocking). The existing Offline Queue Discard button can explicitly remove a local entry; there is no merge/rebase resolution workflow. Do not generate a new UUID merely to bypass a conflict.

## Evidence

`test_transitions.py` covers terminal PATCH/sync denials without side effects, valid UUID retries after completion, blocked/resume/complete flow, illegal regressions, all state-pair policy checks and a stale DB snapshot after a later committed rejection. Full suite: **17 passed locally**, frontend production build passed. The stale-snapshot test is deterministic interleaving, not a parallel PostgreSQL load test. Docker/PostgreSQL runtime and scripted Chromium offline-conflict verification passed on 17 Oct 2026; see verification/README.md. Human-manual sign-off remains pending.
