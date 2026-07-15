#!/usr/bin/env bash
# Nightly backup of the SQLite database + uploaded images.
# Keeps the newest 14 archives. Schedule via cron (see DEPLOYMENT.md).
# Note: runs while the app is live; at low-traffic hours this is safe since
# SQLite writes are atomic and the whole data dir (db + journal) is captured together.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)
tar czf "backups/backup-$STAMP.tar.gz" data uploads

# prune: keep newest 14
ls -1t backups/backup-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm --

echo "$(date -Is) backup written: backups/backup-$STAMP.tar.gz"
