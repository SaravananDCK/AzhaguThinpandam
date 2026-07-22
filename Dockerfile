# ---- Dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- Build ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build against a throwaway empty database (all store pages render at request
# time; only the sitemap touches the DB during build)
ENV DATABASE_URL="file:/tmp/build.db"
# Browser-facing config must be present at BUILD time — Next.js inlines
# NEXT_PUBLIC_* into the client bundle. docker-compose passes these as build
# args from .env (see docker-compose.yml). Missing values break the Razorpay
# checkout popup and show the DevExtreme trial watermark.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ARG NEXT_PUBLIC_DEVEXTREME_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID \
    NEXT_PUBLIC_DEVEXTREME_KEY=$NEXT_PUBLIC_DEVEXTREME_KEY
RUN npx prisma generate \
  && npx prisma migrate deploy \
  && npm run build

# ---- Runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Prisma CLI for running migrations at container start
RUN npm install -g prisma@6

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY deploy/docker-entrypoint.sh ./docker-entrypoint.sh
COPY scripts/create-admin.mjs ./scripts/create-admin.mjs
COPY scripts/seed-live.mjs ./scripts/seed-live.mjs
COPY scripts/base-variants-only.mjs ./scripts/base-variants-only.mjs
# bcryptjs is bundled into the server build, but create-admin.mjs needs it as a
# resolvable module (it's pure JS with zero dependencies)
COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs

RUN chmod +x docker-entrypoint.sh \
  && mkdir -p /app/data /app/uploads \
  && chown -R node:node /app

USER node
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
