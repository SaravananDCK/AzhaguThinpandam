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

echo "==> Cleaning up old images and build cache…"
docker image prune -f
# BuildKit's cache is NOT covered by `image prune` — without this it grows by
# ~1.5GB per deploy and quietly fills the disk. Keep the last week so a quick
# redeploy still gets cache hits.
docker builder prune -f --filter until=168h

echo "==> Done. Recent app logs:"
docker compose logs --tail 20 app
