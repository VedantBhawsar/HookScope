FROM oven/bun:1.2.21-alpine AS base

# ─── Deps stage ───────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json bun.lock ./

# All workspace package.json files must be present so bun can reconcile
# the full workspace graph against the frozen lockfile.
COPY packages/db/package.json                ./packages/db/
COPY packages/redis/package.json             ./packages/redis/
COPY packages/s3/package.json                ./packages/s3/
COPY packages/ui/package.json                ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json     ./packages/eslint-config/

COPY apps/api/package.json        ./apps/api/
COPY apps/ingestion/package.json  ./apps/ingestion/
COPY apps/web/package.json        ./apps/web/

# --ignore-scripts prevents @workspace/db's postinstall (prisma generate) from
# running — the schema file isn't present in this stage.
RUN bun install --frozen-lockfile --ignore-scripts

# ─── Builder stage ────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY packages/ui               ./packages/ui
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config    ./packages/eslint-config

COPY apps/web ./apps/web

# NEXT_PUBLIC_* vars are baked in at build time — browser calls go to localhost:5000
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app/apps/web
RUN bun run build

# ─── Runner stage ─────────────────────────────────────────────────────────────
# Uses `next start` (regular production server) instead of standalone output.
# Standalone tracing hangs in monorepos with symlinked workspace packages;
# in Docker the environment is already controlled so standalone's size savings
# are not worth the complexity.
FROM base AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production

# Re-install production dependencies only (skips devDeps).
# All workspace package.json files must be present for the frozen lockfile check.
COPY package.json bun.lock ./
COPY packages/db/package.json                ./packages/db/
COPY packages/redis/package.json             ./packages/redis/
COPY packages/s3/package.json                ./packages/s3/
COPY packages/ui/package.json                ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json     ./packages/eslint-config/
COPY apps/api/package.json        ./apps/api/
COPY apps/ingestion/package.json  ./apps/ingestion/
COPY apps/web/package.json        ./apps/web/

RUN bun install --frozen-lockfile --production --ignore-scripts

# UI source must be present so the workspace symlink resolves at runtime
COPY packages/ui/src ./packages/ui/src

# next.config + public assets + compiled .next output
COPY apps/web/next.config.mjs ./apps/web/next.config.mjs
COPY apps/web/public          ./apps/web/public
COPY --from=builder /app/apps/web/.next ./apps/web/.next

WORKDIR /app/apps/web

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["bun", "run", "start"]
