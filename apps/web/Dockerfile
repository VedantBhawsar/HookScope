FROM oven/bun:1.2.21-alpine AS base

# ─── Deps stage ───────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json bun.lock ./

COPY packages/ui/package.json                ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json     ./packages/eslint-config/

COPY apps/web/package.json ./apps/web/

RUN bun install --frozen-lockfile

# ─── Builder stage ────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Workspace packages needed at build time
COPY packages/ui               ./packages/ui
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config    ./packages/eslint-config

# App source
COPY apps/web ./apps/web

# NEXT_PUBLIC_* vars are baked in at build time — browser calls go to localhost:5000
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app/apps/web
RUN bun run build

# ─── Runner stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production

# Standalone output traces the full monorepo tree under outputFileTracingRoot.
# The entry point ends up at apps/web/server.js inside the standalone dir.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder /app/apps/web/public           ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
