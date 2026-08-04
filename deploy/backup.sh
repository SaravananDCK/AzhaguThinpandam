#!/usr/bin/env bash
# Nightly backup of the SQLite database + uploaded images.
# Keeps the newest 14 archives. Schedule via cron (see DEPLOYMENT.md).
# Runs while the app is live. The database is captured with SQLite's online
# backup (a point-in-time snapshot), NOT by tarring the live files — see the
# comment at the snapshot step for why that distinction matters.
#
# Off-site copy (optional but recommended — a backup that only lives on the VPS
# dies with the VPS): set BACKUP_REMOTE in .env to an rclone remote + path, e.g.
#   BACKUP_REMOTE="gdrive:azhagu-backups"
# and every archive is uploaded there too. Unset, this script behaves exactly as
# it always has: local-only. See DEPLOYMENT.md § 9 for the one-time rclone setup.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
ROOT="$(pwd)"
STAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE="backups/backup-$STAMP.tar.gz"
STAGE="backups/.stage-$STAMP"

# --- consistent database snapshot -------------------------------------------
# The database must NOT be copied with plain tar/cp while the app is running.
# In WAL mode SQLite is three files (store.db, -wal, -shm) and tar reads them at
# slightly different moments; a write landing in between yields an archive that
# looks fine and fails to restore with "database disk image is malformed".
#
# Both methods below use SQLite's online backup, which takes a point-in-time
# snapshot of a live database into a single self-contained file.
mkdir -p "$STAGE/data"
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$ROOT/data/store.db" ".backup '$ROOT/$STAGE/data/store.db'"
elif [ -n "$(docker compose ps -q app 2>/dev/null)" ]; then
  # No sqlite3 on the host — VACUUM INTO from inside the app container gives the
  # same guarantee. /app/data is the same volume as ./data here.
  docker compose exec -T app node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.\$executeRawUnsafe(\"VACUUM INTO '/app/data/.snapshot-$STAMP.db'\")
      .then(() => p.\$disconnect())
      .catch((e) => { console.error(e); process.exit(1); });
  "
  mv "data/.snapshot-$STAMP.db" "$STAGE/data/store.db"
else
  echo "ERROR: need sqlite3 on the host or a running app container to snapshot" >&2
  echo "       the database safely. Install with: apt-get install -y sqlite3" >&2
  rm -rf "$STAGE"
  exit 1
fi

# Same archive layout as before (data/store.db + uploads/) so replace-live-db.sh
# and the DB-RESET runbook keep working unchanged.
tar czf "$ARCHIVE" -C "$ROOT/$STAGE" data -C "$ROOT" uploads
rm -rf "$STAGE"

# prune: keep newest 14
ls -1t backups/backup-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm --

echo "$(date -Is) backup written: $ARCHIVE"

# --- off-site copy ----------------------------------------------------------
# Env wins; otherwise read the key straight out of .env (not sourced — .env is
# the app's env_file and may contain values that aren't safe to eval).
REMOTE="${BACKUP_REMOTE:-$(sed -n 's/^BACKUP_REMOTE=//p' .env 2>/dev/null | tr -d '"'"'"'\r')}"
KEEP_DAYS="${BACKUP_REMOTE_KEEP_DAYS:-60}"

[ -n "$REMOTE" ] || exit 0

if ! command -v rclone >/dev/null 2>&1; then
  echo "$(date -Is) BACKUP_REMOTE is set but rclone is not installed — archive is local-only" >&2
  exit 1
fi

# --no-traverse: don't list the whole remote folder just to copy one new file.
rclone copy "$ARCHIVE" "$REMOTE" --no-traverse
rclone delete "$REMOTE" --include "backup-*.tar.gz" --min-age "${KEEP_DAYS}d"

echo "$(date -Is) uploaded to $REMOTE (remote retention: ${KEEP_DAYS} days)"
