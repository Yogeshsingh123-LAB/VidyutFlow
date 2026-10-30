# Demo requested-load review rule

The new-connection backend uses a **demo-only** review threshold, not an official
UGVCL load limit. `DEMO_LOAD_REVIEW_THRESHOLD_KW` defaults to `100` kW and can
be configured as a positive finite number in the backend environment. Replace
this demo policy after the relevant utility/category-specific rules are verified.

Both JSON and multipart request submissions apply the same rule:

- Non-finite loads are rejected with HTTP 422 before the database write.
- Zero or negative loads are saved as `NEEDS_CORRECTION`, as before.
- A positive load up to and including the threshold follows the normal workflow.
- A load above the threshold is saved as `NEEDS_CORRECTION`, with an explicit
  demo-threshold and manual-review note. The original value is retained.

`NEEDS_CORRECTION` is reused because this prototype does not have a separate
manual-review status or a completed dedicated review workflow. It should not be
represented as proof that the load is prohibited. The SLA model's input is capped
at the demo threshold for above-threshold loads (and floored at zero for negative
loads) to avoid feeding it extreme values. The risk reasons disclose the cap;
the score is not an estimate for the original out-of-range load.

The consumer portal provides a numeric load input alongside the 1–50 kW quick
slider. It fetches `GET /system/demo-load-policy` and shows the configured demo
threshold or an unavailable message with retry; there is no hard-coded fallback.
The backend remains authoritative, including if the configuration changes after
it was fetched. Creation responses include structured validation issue codes and
a threshold value, allowing the frontend to translate known reasons into English,
Gujarati, Hindi and Marathi. Unknown issues fall back to the English server message.
Structured issues are saved as a submission-time snapshot and returned on later
request reads. They are not current decision notes; older records return null
where the original structured reasons are unknown.

In the consumer portal (`LiveConsumerRequests`), live backend requests and their
historical submission-time validation snapshots are displayed separately from
local demo applications whenever an active, verified backend session exists for
the signed-in portal user. Backend tokens are kept in tab memory only (never in
`localStorage` or `sessionStorage`) and no longer fall back to shared role-mapped
demo accounts, so reloading the browser tab intentionally requires signing in
again before live backend records are loaded. Because the portal's Node auth
service and FastAPI still maintain separate user stores and include shared public
`*.vidyutflow.demo` accounts, this remains a prototype environment—do not enter
real customer PII until unified server-side authentication is in place. Do not
use the default threshold as an operational limit.

## Deployment and migration

Startup adds the nullable `validation_issues_json` column for existing SQLite or
PostgreSQL databases. Back up the database before deployment and review the
prototype startup migration with the backend owner; DDL privileges are required.
The SQLite migration is tested against an old database and is idempotent. The
PostgreSQL migration has not been tested against a running PostgreSQL instance.
Existing English `validation_notes` are retained; old records are not backfilled
from today's configurable threshold.
