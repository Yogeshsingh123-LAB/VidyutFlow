#!/usr/bin/env bash
# Lite backup (roadmap: managed snapshots / multi-AZ). Usage: ./scripts/backup.sh
set -euo pipefail
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M%S)
if [ -n "${DATABASE_URL:-}" ] && command -v pg_dump >/dev/null; then
  pg_dump "$DATABASE_URL" > "backups/vidyutos-$stamp.sql"; echo "PostgreSQL backup: backups/vidyutos-$stamp.sql"
else
  cp -f vidyutos.db "backups/vidyutos-$stamp.db" 2>/dev/null || echo "No local vidyutos.db yet — start the app first."
  echo "SQLite backup done (if file existed)."
fi
