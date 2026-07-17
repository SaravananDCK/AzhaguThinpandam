# Database — Reset & Admin

## The database is never touched by deploys

The live DB is a **Docker volume** (`/opt/azhagu/data/store.db`), not part of the
git repo. Autodeploy (`git pull` + rebuild) never overwrites it. On container
start the entrypoint runs `prisma migrate deploy` (applies new migrations to the
existing data — no wipe) and `scripts/seed-live.mjs` (create-only sync of new
coupons / missing settings). Resetting the DB is therefore a **separate,
deliberate action** — do it only when you mean to.

---

## Reset the LIVE database (alpha)

The production image doesn't carry the full catalog seed, so a bare wipe would
leave the store with **no products**. Use one of the two options below, which
reseed the full catalog + settings + `WELCOME18` + admin user.

> ⚠️ Both **wipe all live orders, customers, coupons and settings**. Each one
> backs up the current DB first (timestamped) so you can roll back.

### Option A — from the VPS web terminal (recommended, self-contained)

Needs nothing on your PC. Run in `/opt/azhagu` on the VPS. Set the two
`SEED_ADMIN_*` values to the admin login you want:

```bash
cd /opt/azhagu
docker compose stop app
cp -f data/store.db "data/store.db.bak-$(date +%s)" 2>/dev/null || true
rm -f data/store.db data/store.db-wal data/store.db-shm
docker run --rm -v /opt/azhagu:/work -w /work \
  -e DATABASE_URL="file:/work/data/store.db" \
  -e SEED_ADMIN_EMAIL="you@example.com" \
  -e SEED_ADMIN_PASSWORD="ChangeThisStrongPass" \
  node:22 bash -lc "npm ci && npx prisma generate && npx prisma migrate deploy && npm run db:seed"
chown 1000:1000 data/store.db
docker compose up -d app
```

A throwaway `node:22` container installs deps and runs the full seed into a
fresh DB. The `npm ci` step takes a minute or two — that's normal.

### Option B — from your PC (Git Bash, **not** PowerShell/WSL)

Pushes your local seeded DB up. Run from the project root in **Git Bash**:

```bash
bash deploy/replace-live-db.sh root@200.97.172.90
```

(PowerShell's `bash` may resolve to a broken WSL — use the Git Bash app instead.)
This exports your local DB, backs up the live one, swaps it in, and restarts.

### Rollback (either option)

```bash
cd /opt/azhagu
docker compose stop app
cp data/store.db.bak-XXXXXXXX data/store.db   # pick the backup you want
chown 1000:1000 data/store.db
docker compose up -d app
```

---

## Reset the LOCAL dev database

Stop the dev server first (it holds a SQLite lock — `Ctrl+C`, or
`npx kill-port 3000`), then:

```bash
npx prisma migrate reset        # add --force to skip the prompt
```

Drops the DB → re-applies migrations → runs `prisma/seed.ts` (catalog,
settings, `WELCOME18`, admin). To choose the admin login, prefix it:

```bash
SEED_ADMIN_EMAIL="you@example.com" SEED_ADMIN_PASSWORD="YourPass" npx prisma migrate reset --force
```

---

## Set / change the admin username & password

There are two moments you can set it:

### 1. When seeding (fresh DB)

Pass `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to the seed (shown in the reset
commands above). Defaults if unset: **`admin@azhaguthinpandam.com` / `Admin@123`**
— change these immediately.

Note: the seed only sets the password when it **creates** the admin. If that
email already exists, the seed leaves its password alone (it just ensures the
ADMIN role).

### 2. On an existing / live DB — anytime, no reseed

Use `create-admin.mjs` against the running container. It creates the admin if
missing, or **resets the password** if it already exists:

```bash
docker compose exec \
  -e ADMIN_USER_EMAIL="you@example.com" \
  -e ADMIN_USER_PASSWORD="YourStrongPass" \
  app node scripts/create-admin.mjs
```

(Password must be at least 8 characters.) This is the normal way to rotate the
admin password on the live site — log in at `/admin` with the new credentials.
