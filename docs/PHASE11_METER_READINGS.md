# Phase 11: Meter Reading and Bill Review

This document describes the Phase 11 meter reading workflow added to the VidyutFlow demo. It is a demo implementation over the repository's existing in-memory data store, not a connection to UGVCL production systems.

## Workflow

1. A consumer or assigned field engineer selects a connection, records the displayed reading and date, and may capture or choose a meter photo.
2. OCR runs in the browser with Tesseract.js. The user sees and can correct the detected digits before submission. OCR output is advisory and is not an approval.
3. The server checks meter identity, date ordering, configured meter multiplier and precision, duplicate readings, previous approved reading, rollover or replacement events, and consumption anomalies.
4. The server appends a `PENDING_REVIEW` record. It does not alter the connection snapshot, existing bill, payment, receipt, or receipt/bill identifier.
5. An employee or administrator reviews the reading and its flags, then approves, rejects, or requests a re-read. Approval is blocked when arithmetic is invalid or high-severity flags remain; flagged readings require a review note.
6. The bill checker compares existing bills with `calculateDetailedUgvclBill` and existing payment/receipt references. It is read-only and does not issue or revise a bill.

## Same-origin API

These routes are served by the frontend's Node demo runtime, not the separate FastAPI service:

| Route | Purpose | Access |
| --- | --- | --- |
| `GET /api/meter-readings` | Read permitted reading history | Connection owner, assigned field engineer, employee, administrator |
| `GET /api/meter-readings/notifications` | Read recent meter workflow notifications | Target role; consumer notices are connection scoped |
| `POST /api/meter-readings` | Append a reading for review | Connection owner, assigned field engineer |
| `PATCH /api/meter-readings/{id}/review` | Approve, reject, or request re-read | Employee, administrator |
| `GET /api/meter-readings/{id}/photo` | Fetch a private submitted photo | Owner, assigned field engineer, employee, administrator |
| `GET /api/meter-readings/metrics` | Aggregate quality counts | Management, administrator |
| `GET/PATCH /api/meter-readings/config` | Read or administer per-meter multiplier, decimal precision and rollover limit | Authenticated; update is administrator-only |
| `GET/PATCH /api/meter-readings/thresholds` | Read or version anomaly thresholds | Employee, administrator; update is administrator-only |

Mutations use the app's demo cookie session, same-origin check and CSRF header. Consumer data access is scoped to their connections. Field access is limited to assigned work orders. Photo bytes are never exposed as a public URL.

## OCR and image handling

Photos are restricted to JPEG, PNG and WebP up to 5 MiB, decoded and re-encoded in the browser to remove metadata, and only then attached to a reading. Tesseract worker/core assets are copied into the app's same-origin `/vendor/tesseract` path at build time. The English trained data file is fetched from the Tesseract project CDN the first time it is needed and cached by the browser; no meter image is sent to that CDN or to an AI service. OCR confidence is optional and an absent confidence is displayed as unavailable, not as a pass.

The demo server keeps photos and reading history in process memory. A server restart loses this demo data. The field offline queue stores reading metadata in IndexedDB and the image in a separate IndexedDB object store; sync uses a stable client UUID so retries are idempotent. A persistent deployment must replace the in-memory photo/history stores with encrypted durable storage and define retention/deletion policy before production use.

## Meter configuration and billing boundary

Demo connections are seeded with multiplier `1`, zero decimal places and no rollover limit, marked as `DEMO_DEFAULT`. These are placeholders, not verified specifications. An administrator can set the values from verified utility records; each update increments a version and writes an audit event. Rollover submission is rejected unless a limit is configured.

The existing project has a tariff calculation helper and sample bills, but no canonical invoice-generation transaction/model that can safely accept an approved reading. This implementation therefore validates existing bills without creating or changing bills. Production bill handoff requires integrating the approved reading into the project's authoritative invoice-generation contract so the current billing engine remains the only source of issued invoices.

## Validation

The focused suite is `frontend/tests/meter-reading.test.ts`, included in the frontend `npm test` command. It covers reading normalization, image validation, arithmetic and rollover/replacement, anomaly evidence, identity mismatch, append-only storage, duplicate/idempotent submissions, role permissions, review rules, bill validation and aggregate metrics.
