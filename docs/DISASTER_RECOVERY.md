# Disaster Recovery, Offsite Replication & RTO/RPO Runbook (Item #23 — PS000125 Points 8, 9 & 10)

> **Honesty Boundary:** Multi-AZ cloud standby requires cloud procurement (costed in [INFRASTRUCTURE_ROADMAP.md](INFRASTRUCTURE_ROADMAP.md)). Today in code, VidyutFlow ships **automated checksummed backups, isolated offsite replication with post-copy SHA-256 verification, retention pruning, tamper-rejection drills, and explicit tier-bound RPO/RTO targets**.

---

## 1. Defined RPO & RTO Targets by Deployment Tier

| Tier | Architecture | Recovery Point Objective (RPO) | Recovery Time Objective (RTO) | Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1 — Subdivision Pilot** | Hourly `offsite_replicate.sh` cron to separate NAS / MeitY S3 bucket | **≤ 60 minutes** (`DR_RPO_TARGET_MINUTES=60`) | **≤ 120 minutes** (`DR_RTO_TARGET_MINUTES=120`) | Checksummed `pg_dump` / SQLite snapshot + `restore.sh` |
| **Tier 2 — Circle HA** | PostgreSQL 16 streaming standby + WAL archive to offsite S3 | **≤ 15–60 minutes** | **≤ 60–120 minutes** | Standby promotion + S3 WAL replay |
| **Tier 3 — Full UGVCL DISCOM** | Multi-AZ Active-Active + Secondary-Region Hot Standby | **≤ 15 minutes** | **≤ 30 minutes** | Automated failover + quarterly restore drills |

---

## 2. Executable Scripts in `backend/scripts/`

1. **`./scripts/backup.sh`**
   - Produces `backups/vidyutflow-<timestamp>.<sql|db>` + `.sha256` digest.
2. **`./scripts/offsite_replicate.sh`**
   - Copies the latest snapshot + `.sha256` to `OFFSITE_BACKUP_DIR` (defaults to `backups/offsite_vault`, or external mount / `S3_OFFSITE_URI` via `aws s3 cp --checksum-algorithm SHA256`).
   - Re-verifies `sha256sum -c` **inside** the offsite vault to catch silent transit corruption.
   - Emits `dr_manifest.json` recording `sha256`, `offsite_verified: true`, `rpo_target_minutes`, `rto_target_minutes`, and prunes snapshots older than `BACKUP_RETENTION_COUNT` (default `14`).
3. **`./scripts/restore.sh <backup-file>`**
   - Verifies `.sha256` before touching the target database; aborts immediately on 1-byte corruption.
4. **`./scripts/restore_drill.sh`**
   - End-to-end automated backup → SHA-256 verify → 1-byte tamper rejection → DB wipe → clean restore verification (`docs/verification/r4-backup-restore.txt`).
