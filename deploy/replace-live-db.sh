#!/usr/bin/env bash
#
# Replace the LIVE database with a fresh copy of your local dev DB.
#
#   ⚠️  ALPHA-ONLY. This WIPES all live orders, customers, coupons and settings
#       and replaces them with your local data. Autodeploy never does this —
#       run it by hand only when you intend to reset the live data.
#
# Usage:
#   deploy/replace-live-db.sh user@host [remote_dir]
#   e.g.  deploy/replace-live-db.sh root@200.97.172.90
#
# It backs up the current live DB (timestamped) before swapping, so you can roll
# back. Run from the project root (needs scripts/export-db.mjs).
set -euo pipefail

TARGET="${1:?Usage: replace-live-db.sh user@host [remote_dir]}"
REMOTE_DIR="${2:-/opt/azhagu}"
SSH_OPTS="-o StrictHostKeyChecking=accept-new"
STAMP="$(date +%Y%m%d-%H%M%S)"

echo "==> Exporting a clean single-file copy of the local DB…"
node scripts/export-db.mjs   # writes prisma/deploy.db (WAL checkpointed)

echo "==> Backing up the live DB and stopping the app on ${TARGET}…"
ssh ${SSH_OPTS} "${TARGET}" "cd '${REMOTE_DIR}' \
  && (cp -f data/store.db 'data/store.db.bak-${STAMP}' 2>/dev/null || true) \
  && docker compose stop app \
  && rm -f data/store.db-wal data/store.db-shm"

echo "==> Uploading the new DB…"
scp ${SSH_OPTS} prisma/deploy.db "${TARGET}:${REMOTE_DIR}/data/store.db"

echo "==> Fixing ownership and restarting the app…"
ssh ${SSH_OPTS} "${TARGET}" "cd '${REMOTE_DIR}' \
  && chown 1000:1000 data/store.db \
  && docker compose up -d app"

echo "==> Done. Live DB replaced."
echo "    Rollback: on the VPS, 'docker compose stop app && cp data/store.db.bak-${STAMP} data/store.db && chown 1000:1000 data/store.db && docker compose up -d app'"
