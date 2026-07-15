#!/bin/sh
set -e

echo "Running database migrations…"
prisma migrate deploy --schema /app/prisma/schema.prisma

echo "Starting AzhaguThinpandam…"
exec node server.js
