# syntax=docker/dockerfile:1
# PearTree admin (Next.js 16 + Payload + SQLite) for Fly.io.
#
# SQLite lives on a Fly volume mounted at /data, NOT in the image — the image
# is replaced on every deploy, the volume is not. See fly.toml [mounts].

FROM node:22-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
# node:22-slim bundles npm 10, but package-lock.json is written by npm 11 and
# npm 10 reads it as out-of-sync. Pin the image's npm to match the lockfile.
RUN npm install -g npm@11.7.0

# ---- deps: needs a toolchain because better-sqlite3 is a native module ----
FROM base AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholders so any eager env validation passes at build time. The real
# values arrive at runtime via `fly secrets`, which override these.
ENV PAYLOAD_SECRET=build_time_placeholder_value_ignored_at_runtime_0000
ENV WORKOS_COOKIE_PASSWORD=build_time_placeholder_value_ignored_at_runtime_0000
ENV WORKOS_API_KEY=build_placeholder
ENV WORKOS_CLIENT_ID=build_placeholder
ENV WORKOS_REDIRECT_URI=https://example.invalid/auth/callback
ENV PUBLIC_SITE_BASE_URL=https://example.invalid
ENV ADMIN_BASE_URL=https://example.invalid
ENV DATABASE_URI=file:/tmp/build.sqlite
RUN npm run build

# ---- runner ----
FROM base AS runner
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
EXPOSE 3000
CMD ["npm", "run", "start"]
