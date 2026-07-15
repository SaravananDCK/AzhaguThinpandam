# Deploying AzhaguThinpandam to a Hostinger VPS

The whole stack runs on a single cheap VPS with Docker: the Next.js app (with an
embedded SQLite database) plus Caddy, which terminates HTTPS with automatic
Let's Encrypt certificates. No managed database, no extra services to pay for.

## What you need

1. **Hostinger VPS** — the cheapest plan (KVM 1: 1 vCPU / 4 GB RAM) is plenty.
   Choose **Ubuntu 24.04** as the OS when creating it.
2. **A domain** — e.g. `azhaguthinpandam.com` (Hostinger sells these too).
3. **Razorpay account** — with KYC completed for live payments
   (<https://dashboard.razorpay.com>).
4. **WhatsApp Business Platform access** — customer login sends OTPs over
   WhatsApp (see step 4b). Without it, customer login is disabled in
   production (admin email login still works).
5. This repository pushed to GitHub/GitLab (private is fine).

## 1. Point your domain at the VPS

In your DNS panel (Hostinger → Domains → DNS):

| Type | Name | Value |
|------|------|----------------|
| A | `@` | your VPS IP |
| A | `www` | your VPS IP |

Wait a few minutes for DNS to propagate (check with `ping yourdomain.com`).

## 2. Prepare the server (one time)

SSH in as root (Hostinger shows the IP and password in the VPS panel):

```bash
ssh root@YOUR_VPS_IP
```

Fetch and run the setup script (installs Docker, firewall, fail2ban):

```bash
curl -fsSL https://raw.githubusercontent.com/SaravananDCK/AzhaguThinpandam/main/deploy/setup-vps.sh -o setup-vps.sh
bash setup-vps.sh
```

(Or clone the repo first and run `bash deploy/setup-vps.sh`.)

## 3. Get the code onto the server

**Option A — git clone (best for updates):**

```bash
cd /opt/azhagu
git clone https://github.com/SaravananDCK/AzhaguThinpandam.git .
mkdir -p data uploads backups
chown -R 1000:1000 data uploads   # the app container runs as uid 1000
```

**Option B — upload the publish zip (no GitHub needed):**

On your PC, build the package (creates `azhagu-publish.zip`, ~4 MB, contains
no secrets or database):

```powershell
powershell -File scripts/make-publish.ps1
```

Upload it to the VPS with the `scp` command (or any SFTP client — WinSCP,
FileZilla — using the same SSH login):

```powershell
scp azhagu-publish.zip root@YOUR_VPS_IP:/opt/azhagu/
```

Then on the VPS:

```bash
cd /opt/azhagu
apt-get install -y unzip && unzip -o azhagu-publish.zip && rm azhagu-publish.zip
mkdir -p data uploads backups
chown -R 1000:1000 data uploads
```

To ship an update later, re-run the script, upload again and repeat the unzip,
then `docker compose up -d --build`. (`unzip -o` overwrites code but leaves
your `.env`, `data/` and `uploads/` untouched.)

## 4. Configure environment

```bash
cp .env.example .env
nano .env
```

Fill in:

| Variable | Value |
|----------|-------|
| `DOMAIN` | `azhaguthinpandam.com` (your domain — used by Caddy for HTTPS) |
| `AUTH_SECRET` | output of `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | from Razorpay dashboard → Settings → API Keys (start with **test** keys) |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you choose in step 7 |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | from step 4b — required for customer login |
| `WHATSAPP_OTP_TEMPLATE` / `WHATSAPP_OTP_LANGUAGE` | your approved template's name and language code |
| `SMTP_HOST` etc. | e.g. Hostinger email: `smtp.hostinger.com`, port 587, your mailbox login |
| `ADMIN_EMAIL` | where new-order notifications go |
| `NEXT_PUBLIC_APP_URL` | `https://azhaguthinpandam.com` |

`DATABASE_URL` and `UPLOADS_DIR` are set by docker-compose — leave them as-is.

Add the `DOMAIN` line (it's used by Caddy, not the app):

```
DOMAIN="azhaguthinpandam.com"
```

## 4b. WhatsApp Business API (customer login OTPs)

Customers log in with their mobile number: the site WhatsApps them a 6-digit
code. Two supported providers — set the env vars for ONE of them:

**Option A — Twilio (quickest if you already have a Twilio account):**

1. Twilio Console → Messaging → try WhatsApp. For testing, the **sandbox**
   number works immediately (each test phone must first send the "join …"
   code to the sandbox number). Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
   and `TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"`.
2. For production, register a **WhatsApp sender** through Twilio (they walk
   you through Meta business verification), create an **authentication
   content template** with one variable for the code, and put its `HX…` SID
   in `TWILIO_CONTENT_SID`.
3. Cost in India: Meta's auth fee plus Twilio's per-message fee ≈ **₹0.5–0.6
   per login**.

**Option B — Meta Cloud API directly (cheapest, ~₹0.13/login):**

1. Go to <https://developers.facebook.com> → create an app → add the
   **WhatsApp** product. Meta gives you a **test number** immediately — fine
   for trying things out (it can only message up to 5 verified numbers).
2. For production: complete **Meta Business verification** (business
   documents; takes a few days) and register a **dedicated phone number** —
   this number cannot simultaneously use the normal WhatsApp app, so don't
   use your personal/shop number unless you're ready to move it.
3. Create a message template of category **Authentication** (Meta provides a
   ready-made OTP layout with a copy-code button). Note its **name** and
   **language** — they go into `WHATSAPP_OTP_TEMPLATE` / `WHATSAPP_OTP_LANGUAGE`.
4. Generate a **permanent access token** (Business settings → System user →
   token with `whatsapp_business_messaging` permission) and copy the
   **Phone number ID** from the WhatsApp API Setup page into `.env`.

Pricing (India): authentication messages cost about **₹0.12 per login**.
There is no monthly fee. Alternatively, resellers like Gupshup/AiSensy/MSG91
wrap the same API with easier onboarding — any of them work as long as you
end up with a Cloud API token + phone number ID.

## 5. Launch 🚀

```bash
docker compose up -d --build
```

First build takes a few minutes. Then:

- `https://yourdomain.com` — the store (HTTPS is automatic)
- Database migrations run automatically on every container start.

Create your admin login:

```bash
docker compose exec \
  -e ADMIN_USER_EMAIL=you@example.com \
  -e ADMIN_USER_PASSWORD='PickAStrongPassword' \
  app node scripts/create-admin.mjs
```

Log in at `https://yourdomain.com/login`, then open `/admin` to add your real
categories and products (with photos — they're resized automatically).

**Start with your local catalog (recommended):** your development database
already contains the full product catalog with photos. Copy it up once,
before or right after the first launch:

```powershell
scp prisma/dev.db root@YOUR_VPS_IP:/opt/azhagu/data/store.db
```

Then restart (`docker compose restart app`) and log in — everything is there.
Afterwards, in `/admin`: delete any test orders, and change the seeded admin
password (or create your own admin with the command above and delete the
seeded `admin@azhaguthinpandam.in` user via Prisma Studio locally first).

## 6. Verify the shop end-to-end (test mode)

With Razorpay **test keys** in `.env`:

1. Browse → add to cart → checkout.
2. Pay with a test method (e.g. card `4111 1111 1111 1111`, any future expiry/CVV,
   or `success@razorpay` UPI).
3. Confirm the order shows as **Paid** in `/admin/orders` and the stock dropped.
4. Update the status to Confirmed/Shipped — customer gets an email each time.

## 7. Razorpay webhook (important for reliability)

The webhook marks orders paid even if the buyer closes the tab mid-payment.

Razorpay Dashboard → Settings → **Webhooks** → Add:

- URL: `https://yourdomain.com/api/webhooks/razorpay`
- Secret: any strong string — put the same value in `.env` as `RAZORPAY_WEBHOOK_SECRET`
- Events: `payment.captured`, `payment.failed`

Then restart: `docker compose up -d`.

## 8. Go live

1. Complete Razorpay KYC and generate **live keys**.
2. Swap the keys in `.env`, restart: `docker compose up -d`.
3. Place one small real order to confirm, then refund it from the Razorpay dashboard.

## 9. Backups (set and forget)

Nightly at 02:30, keeps 14 days of archives in `/opt/azhagu/backups`:

```bash
(crontab -l 2>/dev/null; echo "30 2 * * * /opt/azhagu/deploy/backup.sh >> /opt/azhagu/backups/backup.log 2>&1") | crontab -
```

Each archive contains the whole SQLite database + all uploaded images.
**Also download a backup off the server periodically** (`scp` it to your PC) —
a backup that lives only on the VPS won't survive the VPS dying:

```powershell
scp root@YOUR_VPS_IP:/opt/azhagu/backups/backup-*.tar.gz .
```

To restore: stop (`docker compose down`), extract the archive over `data/` and
`uploads/`, start (`docker compose up -d`).

## Updating the site later

```bash
/opt/azhagu/deploy/deploy.sh
```

That's `git pull` → rebuild → restart (with automatic migrations). Total
downtime is a few seconds.

## Maintenance cheat-sheet

| Task | Command |
|------|---------|
| View logs | `docker compose logs -f app` |
| Restart | `docker compose restart app` |
| Update OS packages (monthly) | `apt update && apt upgrade -y` |
| Check disk space | `df -h` |
| Reset admin password | re-run the `create-admin.mjs` command above |

## Troubleshooting

- **HTTPS not working** — DNS not propagated yet, or port 80/443 blocked.
  Check `docker compose logs caddy`.
- **Payments failing** — key mismatch (test vs live) or webhook secret mismatch.
  Check `docker compose logs app` right after an attempt.
- **Emails not sending** — verify SMTP credentials; Hostinger email uses
  `smtp.hostinger.com`, port 465 (set `SMTP_PORT=465`) or 587.
- **"database is locked"** under heavy load — extremely unlikely at this scale,
  but the escape hatch is moving to Postgres: it's a Prisma datasource change
  plus a container in docker-compose.
