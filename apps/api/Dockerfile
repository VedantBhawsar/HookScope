FROM oven/bun:1.2.21-alpine AS base

# ─── Deps stage ───────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json bun.lock ./

# All workspace package.json files must be present so bun can reconcile
# the full workspace graph against the frozen lockfile.
COPY packages/redis/package.json             ./packages/redis/
COPY packages/s3/package.json                ./packages/s3/
COPY packages/db/package.json                ./packages/db/
COPY packages/env/package.json               ./packages/env/
COPY packages/ui/package.json                ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/typescript-config/base.json    ./packages/typescript-config/
COPY packages/eslint-config/package.json     ./packages/eslint-config/

COPY apps/api/package.json        ./apps/api/
COPY apps/ingestion/package.json  ./apps/ingestion/
COPY apps/web/package.json        ./apps/web/

# --ignore-scripts prevents @workspace/db's postinstall (prisma generate) from
# running here — the schema file isn't present in this stage. The pre-generated
# client is copied from the host in the runner stage below.
RUN bun install --frozen-lockfile --ignore-scripts

# ─── Runner stage ─────────────────────────────────────────────────────────────
FROM base AS runner

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Workspace package sources
COPY packages/redis/src   ./packages/redis/src
COPY packages/s3/src      ./packages/s3/src
COPY packages/db/src      ./packages/db/src
COPY packages/env/src     ./packages/env/src
COPY packages/db/generated ./packages/db/generated
COPY packages/db/prisma   ./packages/db/prisma
COPY packages/db/tsconfig.json ./packages/db/
COPY packages/db/prisma.config.ts ./packages/db/
COPY packages/typescript-config ./packages/typescript-config

# API app source
COPY apps/api/src     ./apps/api/src
COPY apps/api/index.ts ./apps/api/index.ts

EXPOSE 5000

CMD ["bun", "run", "/app/apps/api/index.ts"]
