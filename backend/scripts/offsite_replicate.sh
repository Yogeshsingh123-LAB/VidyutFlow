#!/usr/bin/env bash
# Disaster Recovery Offsite Replication & Integrity Verification (Item #23).
# Creates (or takes) a checksummed backup, replicates it to an isolated offsite target
# directory (and optional S3_OFFSITE_URI), verifies SHA-256 at destination, writes an
# auditable JSON DR manifest with RPO/RTO targets, and prunes expired snapshots.
#
# Usage:
#   OFFSITE_BACKUP_DIR=/var/backups/vidyutflow-offsite ./scripts/offsite_replicate.sh [existing-backup-file]
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_DIR"

OFFSITE_DIR="${OFFSITE_BACKUP_DIR:-$BACKEND_DIR/backups/offsite_vault}"
RETENTION_COUNT="${BACKUP_RETENTION_COUNT:-14}"
RPO_TARGET_MINUTES="${DR_RPO_TARGET_MINUTES:-60}"
RTO_TARGET_MINUTES="${DR_RTO_TARGET_MINUTES:-120}"

if [ "${1:-}" != "" ]; then
  SRC_BACKUP="$1"
else
  "$SCRIPT_DIR/backup.sh" >/dev/null
  SRC_BACKUP="$(ls -t backups/vidyutflow-*.db backups/vidyutflow-*.sql 2>/dev/null | head -n 1)"
fi

[ -n "$SRC_BACKUP" ] && [ -f "$SRC_BACKUP" ] || { echo "ERROR: backup file not found: ${SRC_BACKUP:-none}" >&2; exit 1; }
[ -f "$SRC_BACKUP.sha256" ] || { echo "ERROR: checksum missing: $SRC_BACKUP.sha256" >&2; exit 1; }

mkdir -p "$OFFSITE_DIR"
BASENAME="$(basename "$SRC_BACKUP")"
cp -f "$SRC_BACKUP" "$OFFSITE_DIR/$BASENAME"
cp -f "$SRC_BACKUP.sha256" "$OFFSITE_DIR/$BASENAME.sha256"

# Verify replicated copy inside offsite vault to detect any transit corruption
(cd "$OFFSITE_DIR" && sha256sum -c "$BASENAME.sha256" >/dev/null)
SHA_HEX="$(awk '{print $1}' "$OFFSITE_DIR/$BASENAME.sha256")"
SIZE_BYTES="$(wc -c < "$OFFSITE_DIR/$BASENAME" | tr -d ' ')"
NOW_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

S3_STATUS="NOT_CONFIGURED"
if [ -n "${S3_OFFSITE_URI:-}" ]; then
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "$OFFSITE_DIR/$BASENAME" "${S3_OFFSITE_URI%/}/$BASENAME" --checksum-algorithm SHA256
    aws s3 cp "$OFFSITE_DIR/$BASENAME.sha256" "${S3_OFFSITE_URI%/}/$BASENAME.sha256"
    S3_STATUS="SYNCED"
  else
    echo "WARNING: S3_OFFSITE_URI set but aws CLI not installed; local offsite vault verified." >&2
    S3_STATUS="CLI_MISSING"
  fi
fi

# Retention pruning in offsite vault (keep newest RETENTION_COUNT dumps)
python3 - "$OFFSITE_DIR" "$RETENTION_COUNT" "$BASENAME" "$SHA_HEX" "$SIZE_BYTES" "$NOW_UTC" "$RPO_TARGET_MINUTES" "$RTO_TARGET_MINUTES" "$S3_STATUS" <<'PY'
import glob, json, os, sys

offsite_dir, keep_s, basename, sha_hex, size_s, now_utc, rpo_s, rto_s, s3_status = sys.argv[1:]
keep = max(1, int(keep_s))

candidates = sorted(
    [p for p in glob.glob(os.path.join(offsite_dir, "vidyutflow-*")) if not p.endswith(".sha256") and not p.endswith(".json")],
    key=os.path.getmtime,
    reverse=True,
)
pruned = []
for stale in candidates[keep:]:
    os.remove(stale)
    if os.path.exists(stale + ".sha256"):
        os.remove(stale + ".sha256")
    pruned.append(os.path.basename(stale))

manifest = {
    "latest_snapshot": basename,
    "sha256": sha_hex,
    "size_bytes": int(size_s),
    "replicated_at_utc": now_utc,
    "offsite_verified": True,
    "offsite_directory": os.path.abspath(offsite_dir),
    "s3_replication_status": s3_status,
    "rpo_target_minutes": int(rpo_s),
    "rto_target_minutes": int(rto_s),
    "retained_snapshots": min(len(candidates), keep),
    "pruned_snapshots": pruned,
}
manifest_path = os.path.join(offsite_dir, "dr_manifest.json")
with open(manifest_path, "w", encoding="utf-8") as fh:
    json.dump(manifest, fh, indent=2)
print(json.dumps(manifest))
PY
