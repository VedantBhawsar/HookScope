FROM oven/bun:1.2.21-alpine AS base

# ─── Deps stage ───────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace manifests so bun can resolve all workspace packages correctly.
# Source files are excluded here to maximise layer cache hits.
COPY package.json bun.lock ./

# All workspace package.json files must be present so bun can reconcile
# the full workspace graph against the frozen lockfile.
COPY packages/redis/package.json             ./packages/redis/
COPY packages/s3/package.json                ./packages/s3/
COPY packages/db/package.json                ./packages/db/
COPY packages/ui/package.json                ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/typescript-config/base.json    ./packages/typescript-config/
COPY packages/eslint-config/package.json    ./packages/eslint-config/

COPY apps/api/package.json        ./apps/api/
COPY apps/ingestion/package.json  ./apps/ingestion/
COPY apps/web/package.json        ./apps/web/

# --ignore-scripts prevents @workspace/db's postinstall (prisma generate) from
# running here — the schema file isn't present in this stage. The pre-generated
# client is copied from the host in the runner stage below.
RUN bun install --frozen-lockfile --ignore-scripts

# ─── Runner stage ─────────────────────────────────────────────────────────────
FROM base AS runner

# curl is needed for the Docker health check probe
RUN apk add --no-cache curl

WORKDIR /app

# Bring in the installed node_modules (includes workspace symlinks)
COPY --from=deps /app/node_modules ./node_modules

# Workspace package sources consumed by the ingestion app
COPY packages/redis/src    ./packages/redis/src
COPY packages/s3/src       ./packages/s3/src
COPY packages/db/src       ./packages/db/src
COPY packages/db/generated ./packages/db/generated
COPY packages/db/tsconfig.json ./packages/db/
COPY packages/db/prisma.config.ts ./packages/db/
COPY packages/typescript-config ./packages/typescript-config

# Ingestion app source
COPY apps/ingestion/src     ./apps/ingestion/src
COPY apps/ingestion/index.ts ./apps/ingestion/index.ts

EXPOSE 5001

# Bun runs TypeScript natively — no compile step needed
CMD ["bun", "run", "/app/apps/ingestion/src/server.ts"]
