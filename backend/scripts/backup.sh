#!/usr/bin/env bash
# Lite backup with integrity checksum (roadmap: managed snapshots / multi-AZ).
# Usage: ./scripts/backup.sh   -> writes backups/vidyutflow-<stamp>.<sql|db> + .sha256
# Verify any backup later with:  sha256sum -c backups/<file>.sha256
set -euo pipefail
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M%S)
if [ -n "${DATABASE_URL:-}" ] && command -v pg_dump >/dev/null; then
  out="backups/vidyutflow-$stamp.sql"
  pg_dump "$DATABASE_URL" > "$out"
else
  out="backups/vidyutflow-$stamp.db"
  cp -f vidyutflow.db "$out" 2>/dev/null || { echo "No local vidyutflow.db yet — start the app first."; exit 1; }
fi
# Checksum records the file by basename so restore.sh can verify from inside the backups/ dir.
(cd "$(dirname "$out")" && sha256sum "$(basename "$out")" > "$(basename "$out").sha256")
echo "Backup: $out"
echo "Checksum: $out.sha256 (verify with: (cd backups && sha256sum -c $(basename "$out").sha256))"
ls -lh "$out" "$out.sha256"
