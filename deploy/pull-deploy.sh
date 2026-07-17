#!/usr/bin/env bash
#
# Pull-based autodeploy — runs ON THE VPS from cron. Checks GitHub for a new
# commit on main and, if there is one, pulls and rebuilds the containers. No
# GitHub secrets or inbound SSH needed. The database is a Docker volume, so it
# is never touched; Prisma migrations + seed-live run at container start.
#
# Install (run once on the VPS):
#   chmod +x /opt/azhagu/deploy/pull-deploy.sh
#   (crontab -l 2>/dev/null; echo "*/2 * * * * /opt/azhagu/deploy/pull-deploy.sh >> /var/log/azhagu-deploy.log 2>&1") | crontab -
#
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/azhagu}"
BRANCH="${BRANCH:-main}"
cd "$REPO_DIR"

git fetch --quiet origin "$BRANCH"
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0  # up to date, nothing to do
fi

echo "==> $(date '+%Y-%m-%d %H:%M:%S') new commit ${REMOTE:0:8} — deploying"
git pull --ff-only origin "$BRANCH"
docker compose up -d --build
docker image prune -f
echo "==> $(date '+%Y-%m-%d %H:%M:%S') deploy complete"
