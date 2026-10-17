# VidyutFlow branding

The current product, repository and display name is **VidyutFlow**. Documentation, community files, UI, API labels, package metadata, PWA metadata, exported CSV names and mail PDF use that name.

Compatibility exceptions (deliberately not renamed):
- Existing SQLite/PostgreSQL database names and backup/reset references: renaming without migration would hide or disconnect existing data.
- Browser localStorage/sessionStorage keys for login, offline queue and preferences: retained so pending field work is not lost.
- The old service-worker cache key appears only for targeted cache cleanup; the new cache is `vidyutflow-v2`.
- Dated verification logs/screenshots: preserved as original evidence of the earlier build, not rewritten to imply a new test run.
- Historical Git commits and the local checkout directory: not rewritten or moved. Existing Compose resources retain their project identity.

These are internal compatibility identifiers or historical records, not the visible product brand. No database migration, queue reset or GitHub repository rename is part of this branding change.
