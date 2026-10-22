#!/usr/bin/env bash
# Restore a backup produced by backup.sh, verifying its checksum first.
# Usage: ./scripts/restore.sh backups/vidyutos-<stamp>.db        (SQLite)
#        ./scripts/restore.sh backups/vidyutos-<stamp>.sql       (PostgreSQL via psql)
set -euo pipefail
src="${1:?Usage: ./scripts/restore.sh <backup-file>}"
[ -f "$src" ] || { echo "No such backup: $src"; exit 1; }
if [ -f "$src.sha256" ]; then
  (cd "$(dirname "$src")" && sha256sum -c "$(basename "$src").sha256")
else
  echo "WARNING: no $src.sha256 checksum found — integrity cannot be verified." >&2
fi
case "$src" in
  *.sql)
    : "${DATABASE_URL:?Set DATABASE_URL to restore a PostgreSQL backup}"
    psql "$DATABASE_URL" < "$src"
    echo "PostgreSQL restore applied from $src"
    ;;
  *.db)
    cp -f "$src" vidyutos.db
    echo "SQLite restore: $src -> vidyutos.db (restart the API to pick it up)"
    ;;
  *)
    echo "Unknown backup type: $src (expected .db or .sql)"; exit 1
    ;;
esac
