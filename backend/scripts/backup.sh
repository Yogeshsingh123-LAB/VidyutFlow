#!/usr/bin/env bash
# Lite backup with integrity checksum (roadmap: managed snapshots / multi-AZ).
# Usage: ./scripts/backup.sh   -> writes backups/vidyutos-<stamp>.<sql|db> + .sha256
# Verify any backup later with:  sha256sum -c backups/<file>.sha256
set -euo pipefail
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M%S)
if [ -n "${DATABASE_URL:-}" ] && command -v pg_dump >/dev/null; then
  out="backups/vidyutos-$stamp.sql"
  pg_dump "$DATABASE_URL" > "$out"
else
  out="backups/vidyutos-$stamp.db"
  cp -f vidyutos.db "$out" 2>/dev/null || { echo "No local vidyutos.db yet — start the app first."; exit 1; }
fi
sha256sum "$out" > "$out.sha256"
echo "Backup: $out"
echo "Checksum: $out.sha256 (verify with: sha256sum -c $out.sha256)"
ls -lh "$out" "$out.sha256"
