#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 22.04/24.04 Hostinger VPS.
# Run as root: bash setup-vps.sh
set -euo pipefail

echo "==> Updating system packages…"
apt-get update && apt-get upgrade -y

echo "==> Installing basics (git, curl, fail2ban, ufw)…"
apt-get install -y git curl ufw fail2ban

echo "==> Installing Docker…"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Configuring firewall (SSH, HTTP, HTTPS only)…"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Enabling fail2ban (protects SSH from brute force)…"
systemctl enable --now fail2ban

echo "==> Creating app directory /opt/azhagu…"
mkdir -p /opt/azhagu

cat <<'EOF'

Setup complete. Next steps:

  1. Clone your repository:
       cd /opt/azhagu
       git clone <YOUR_REPO_URL> .

  2. Create the runtime folders (owned by the container's node user, uid 1000):
       mkdir -p data uploads backups
       chown -R 1000:1000 data uploads

  3. Configure environment:
       cp .env.example .env
       nano .env        # fill in AUTH_SECRET, DOMAIN, Razorpay keys, SMTP…

  4. Launch:
       docker compose up -d --build

  5. Create your admin user:
       docker compose exec -e ADMIN_USER_EMAIL=you@example.com -e ADMIN_USER_PASSWORD='StrongPass123' app node scripts/create-admin.mjs

  6. Schedule nightly backups (02:30):
       (crontab -l 2>/dev/null; echo "30 2 * * * /opt/azhagu/deploy/backup.sh >> /opt/azhagu/backups/backup.log 2>&1") | crontab -

See DEPLOYMENT.md for the full guide.
EOF
