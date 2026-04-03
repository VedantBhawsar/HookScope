FROM oven/bun:1.2.21-alpine AS base

# ─── Deps stage ───────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace manifests so bun can resolve all workspace packages correctly.
# Source files are excluded here to maximise layer cache hits.
COPY package.json bun.lock ./

COPY packages/redis/package.json            ./packages/redis/
COPY packages/s3/package.json               ./packages/s3/
COPY packages/db/package.json               ./packages/db/
COPY packages/ui/package.json               ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json    ./packages/eslint-config/

COPY apps/ingestion/package.json            ./apps/ingestion/

RUN bun install --frozen-lockfile

# ─── Runner stage ─────────────────────────────────────────────────────────────
FROM base AS runner

# curl is needed for the Docker health check probe
RUN apk add --no-cache curl

WORKDIR /app

# Bring in the installed node_modules (includes workspace symlinks)
COPY --from=deps /app/node_modules ./node_modules

# Workspace package sources consumed by the ingestion app
COPY packages/redis/src  ./packages/redis/src
COPY packages/s3/src     ./packages/s3/src

# Ingestion app source
COPY apps/ingestion/src     ./apps/ingestion/src
COPY apps/ingestion/index.ts ./apps/ingestion/index.ts

EXPOSE 3001

# Bun runs TypeScript natively — no compile step needed
CMD ["bun", "run", "/app/apps/ingestion/src/server.ts"]
