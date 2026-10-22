#!/usr/bin/env bash
# R4 backup → wipe → restore drill (SQLite path). Evidence: docs/verification/r4-backup-restore.txt
# Run from backend/:  bash scripts/restore_drill.sh
set -euo pipefail
cd "$(dirname "$0")/.."

counts() {
  python3 - "$1" <<'PY'
import sqlite3, sys
db = sqlite3.connect(sys.argv[1])
tables = ["users", "connection_requests", "notifications", "audit_logs", "field_updates"]
print("  " + "  ".join(f"{t}={db.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]}" for t in tables))
print("  integrity_check:", db.execute("PRAGMA integrity_check").fetchone()[0])
PY
}

echo "== 1. BEFORE — live DB contents =="
counts vidyutos.db

echo "== 2. backup.sh =="
./scripts/backup.sh
backup=$(ls -t backups/vidyutos-*.db | head -1)
echo "  selected: $backup"

echo "== 3. checksum verification =="
(cd backups && sha256sum -c "$(basename "$backup").sha256")

echo "== 4. tamper detection (copy + 1-byte corruption must FAIL) =="
cp "$backup" /tmp/tampered.db && printf 'X' | dd of=/tmp/tampered.db bs=1 seek=100 conv=notrunc status=none
cp "$backup.sha256" /tmp/tampered.db.sha256.orig
sed "s/$(basename "$backup")/tampered.db/" "$backup.sha256" > /tmp/tampered.db.sha256
if (cd /tmp && sha256sum -c tampered.db.sha256 >/dev/null 2>&1); then
  echo "  FAIL: tampered copy passed verification"; exit 1
else
  echo "  OK: tampered copy correctly REJECTED by sha256 verification"
fi

echo "== 5. disaster: wipe vidyutos.db =="
rm -f vidyutos.db
echo "  vidyutos.db deleted."

echo "== 6. restore.sh =="
./scripts/restore.sh "$backup"

echo "== 7. AFTER — restored DB contents =="
counts vidyutos.db

echo "== 8. drill complete — restart the API to serve the recovered database =="
