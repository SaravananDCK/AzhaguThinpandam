#!/bin/sh
set -e

echo "Running database migrations…"
prisma migrate deploy --schema /app/prisma/schema.prisma

# Create-only sync of seed-level data (new coupons / missing settings). Never
# overwrites existing rows, so it's safe on every start. Non-fatal.
echo "Syncing seed-level data…"
node scripts/seed-live.mjs || echo "seed-live skipped (non-fatal)"

echo "Starting AzhaguThinpandam…"
exec node server.js
