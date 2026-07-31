#!/usr/bin/env bash
# Nightly backup of the SQLite database + uploaded images.
# Keeps the newest 14 archives. Schedule via cron (see DEPLOYMENT.md).
# Note: runs while the app is live; at low-traffic hours this is safe since
# SQLite writes are atomic and the whole data dir (db + journal) is captured together.
#
# Off-site copy (optional but recommended — a backup that only lives on the VPS
# dies with the VPS): set BACKUP_REMOTE in .env to an rclone remote + path, e.g.
#   BACKUP_REMOTE="gdrive:azhagu-backups"
# and every archive is uploaded there too. Unset, this script behaves exactly as
# it always has: local-only. See DEPLOYMENT.md § 9 for the one-time rclone setup.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE="backups/backup-$STAMP.tar.gz"
tar czf "$ARCHIVE" data uploads

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
