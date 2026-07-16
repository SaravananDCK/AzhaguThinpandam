# AzhaguThinpandam — அழகு தின்பண்டம்

Ecommerce platform for traditional Kovilpatti snacks and sweets — kadalai
mittai, sev, seeval, mixture, murukku and more. Single Next.js app containing
the storefront, customer accounts, Razorpay checkout and the admin panel —
designed to run cheaply on one small VPS with zero-maintenance SQLite.

## Stack

- **Next.js 16.2** (App Router, TypeScript, Turbopack, `output: "standalone"`) — storefront + admin + API in one app
- **React 19.2**
- **Tailwind CSS 4 + shadcn/ui** (radix-nova style) — mobile-first UI; layout & effects
  ported from the MIT-licensed [BuildMart Astro theme](https://github.com/helmibamualim/Kantong-Aplikasi-Tema-Astro-Js)
  (dark mode with toggle, glow-hover cards, layered hero), in a dark-maroon +
  brass-gold palette
- **Prisma 6 + SQLite** — file database, no DB server to manage. Prisma is
  **deliberately pinned to v6**: Prisma 7 has breaking config changes (no `url`
  in the schema datasource, requires `prisma.config.ts`) — don't upgrade casually
- **Auth.js v5** (next-auth beta) — customers log in with **phone + WhatsApp OTP**
  (passwordless, account auto-created on first login); admins with email/password.
  JWT sessions, `ADMIN` role for the panel
- **WhatsApp Cloud API** — delivers login OTPs (~₹0.12/login); dev mode shows the
  code on screen when no keys are configured
- **Zustand 5** — client-side cart persisted to localStorage
- **Zod 4** — input validation for checkout, auth and admin APIs
- **Razorpay** — UPI / cards / netbanking, HMAC signature-verified callback + webhook
- **sharp** — product photos resized to WebP at upload time
- **Nodemailer** — order confirmation/status emails via any SMTP
- **Docker + Caddy** — one-command deploy with automatic HTTPS

## Local development

```bash
npm install                 # also runs prisma generate
npx prisma migrate dev      # create/refresh the local SQLite db
npm run db:seed             # real catalog (K S price list) + admin user
npm run dev                 # http://localhost:3000
```

Seeded admin: `admin@azhaguthinpandam.com` / `Admin@123` → `/admin`
(on `/login`, use "Store admin? Log in with email")

Customer login is phone + WhatsApp OTP. Without WhatsApp API keys in `.env`,
the login page shows the code on screen (dev mode only — in production it
returns 503 instead).

Without Razorpay keys in `.env`, checkout runs in a simulated mode (orders are
marked paid instantly) so the full flow is testable locally. Add test keys from
the Razorpay dashboard to exercise the real payment popup.

Emails are logged to the console unless SMTP is configured in `.env`.

## Useful scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm run lint` | ESLint |
| `npm run db:migrate` | create a migration after schema changes |
| `npm run db:seed` | seed the catalog + admin user (idempotent) |
| `npm run db:studio` | browse the database in Prisma Studio |
| `node scripts/process-images.mjs` | rebuild optimized WebP assets from `Images/` |
| `powershell -File scripts/make-publish.ps1` | build `azhagu-publish.zip` for VPS upload |

## Project layout

```
src/
  app/
    (store)/        # storefront: home, products, cart, checkout, orders, account
    admin/          # role-guarded admin: dashboard, products, categories, orders, settings
    api/            # checkout, payment verify, Razorpay webhook, register, admin CRUD, uploads
    uploads/        # serves admin-uploaded images from the uploads volume
  components/       # ui/ (shadcn), store/ (storefront pieces)
  lib/              # prisma, auth, orders, razorpay, email, cart store, money helpers
prisma/             # schema, migrations, seed
deploy/             # Caddyfile, VPS setup/deploy/backup scripts
```

Money is stored as **integer paise** everywhere. Order statuses flow
`PENDING → PAID → CONFIRMED → SHIPPED → DELIVERED` (or `CANCELLED`, which
restores stock).

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** — a step-by-step guide for a Hostinger
VPS: DNS, one-time server setup script, `docker compose up -d --build`,
Razorpay webhook and nightly backups.
