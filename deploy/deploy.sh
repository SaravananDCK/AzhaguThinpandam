#!/usr/bin/env bash
# Deploy the latest code. Run from anywhere: /opt/azhagu/deploy/deploy.sh
# Migrations run automatically when the app container starts.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Pulling latest code…"
git pull --ff-only

echo "==> Building and restarting containers…"
docker compose build app
docker compose up -d

echo "==> Cleaning up old images…"
docker image prune -f

echo "==> Done. Recent app logs:"
docker compose logs --tail 20 app
