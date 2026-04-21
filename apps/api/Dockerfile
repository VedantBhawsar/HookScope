FROM oven/bun:1.2.21-alpine AS base

# ─── Deps stage ───────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json bun.lock ./

COPY packages/redis/package.json             ./packages/redis/
COPY packages/s3/package.json                ./packages/s3/
COPY packages/db/package.json                ./packages/db/
COPY packages/ui/package.json                ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json     ./packages/eslint-config/

COPY apps/api/package.json ./apps/api/

RUN bun install --frozen-lockfile

# ─── Runner stage ─────────────────────────────────────────────────────────────
FROM base AS runner

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Workspace package sources
COPY packages/redis/src   ./packages/redis/src
COPY packages/s3/src      ./packages/s3/src
COPY packages/db/src      ./packages/db/src
COPY packages/db/generated ./packages/db/generated
COPY packages/db/prisma   ./packages/db/prisma

# API app source
COPY apps/api/src     ./apps/api/src
COPY apps/api/index.ts ./apps/api/index.ts

EXPOSE 5000

CMD ["bun", "run", "/app/apps/api/index.ts"]
