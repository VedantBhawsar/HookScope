# ============================================
# Stage 1: Dependencies Installation Stage
# ============================================

FROM oven/bun:1 AS dependencies

WORKDIR /app

# Copy root workspace manifest and lockfile
COPY package.json bun.lock* ./

# Copy every workspace package.json so Bun can resolve workspace:* deps
# (source files not needed yet — just the manifests)
COPY packages/eslint-config/package.json     ./packages/eslint-config/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/ui/package.json                ./packages/ui/package.json
COPY apps/web/package.json                   ./apps/web/package.json

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install

# ============================================
# Stage 2: Build Next.js application
# ============================================

FROM oven/bun:1 AS builder

WORKDIR /app

# Bring installed node_modules from the previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy full monorepo source (workspace packages + app)
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
COPY package.json ./

ENV NODE_ENV=production
# ENV NEXT_TELEMETRY_DISABLED=1

RUN cd apps/web && bun run build

# ============================================
# Stage 3: Production runner
# ============================================

FROM oven/bun:1 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=bun:bun /app/apps/web/public ./public

RUN mkdir .next && chown bun:bun .next

# Requires output: 'standalone' in next.config.ts
COPY --from=builder --chown=bun:bun /app/apps/web/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/apps/web/.next/static     ./.next/static

USER bun

EXPOSE 3000

CMD ["bun", "server.js"]
