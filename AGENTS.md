<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Stack

Next.js 16.2 (App Router, TypeScript, Turbopack, `output: "standalone"`) ·
React 19.2 · Tailwind CSS 4 + shadcn/ui (radix-nova) · Prisma 6 + SQLite ·
Auth.js v5 beta (credentials, JWT sessions, ADMIN role) · Zustand 5 (cart) ·
Zod 4 · Razorpay · sharp · Nodemailer · Docker + Caddy (deploy).

**Prisma is pinned to v6 on purpose.** Prisma 7 has breaking config changes
(no `url` in the schema datasource, requires `prisma.config.ts`). Do not
upgrade it as part of routine dependency bumps.

## Conventions

- All money values are **integer paise** (`src/lib/money.ts` for formatting).
- SQLite has no enums — order/payment statuses and roles are strings validated
  against the constants in `src/lib/constants.ts` (status transitions live in
  `NEXT_STATUSES` there).
- Admin-uploaded images live in `UPLOADS_DIR` (a Docker volume in production)
  and are served by `src/app/uploads/[...path]/route.ts` — never write to `public/`.
- Store-configurable values belong in the `Setting` table (seeded from
  `DEFAULT_SETTINGS`), not in new env vars.
- Without Razorpay keys in `.env`, checkout runs in a simulated dev mode
  (blocked in production).
- Auth: customers use phone + WhatsApp OTP (provider id `phone-otp`; first
  login creates the user — there is no register page). Admins use email +
  password (provider id `credentials`). `User.email`/`passwordHash`/`name`
  are all nullable. OTP delivery (src/lib/whatsapp.ts) supports two drivers:
  Twilio (TWILIO_*) or Meta Cloud API (WHATSAPP_*) — Twilio wins if both set.
  Without either, `/api/otp/request` returns the code as `devCode` in dev
  (503 in production).
