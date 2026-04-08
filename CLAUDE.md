# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# OpenWolf

@.wolf/OPENWOLF.md

This project uses OpenWolf for context management. Read and follow .wolf/OPENWOLF.md every session. Check .wolf/cerebrum.md before generating code. Check .wolf/anatomy.md before reading files.

---

## Project Overview

**webhook-observability** is a multi-tenant webhook observability platform. External providers (Stripe, GitHub, Shopify, etc.) send webhooks to the ingestion server. Events are verified, stored in S3, recorded in Postgres, cached in Redis, and forwarded to user-configured destination URLs.

## Monorepo Structure

Managed with **Turborepo** + **Bun** workspaces.

```
apps/
  api/        — Express + Bun: auth, project/endpoint CRUD (port 3000)
  ingestion/  — Fastify + Bun: high-throughput webhook intake (port 3001)
  web/        — Next.js: frontend dashboard

packages/
  db/         — Prisma schema, generated client, migrations (@workspace/db)
  redis/      — Singleton Redis client (@workspace/redis)
  s3/         — S3Client wrapper (@workspace/s3)
  ui/         — Shared shadcn/ui components (@workspace/ui)
  eslint-config/
  typescript-config/
```

## Commands

```bash
# Install
bun install

# Dev (all apps in parallel)
bun run dev

# Dev (single app)
bun run dev --filter=api
bun run dev --filter=@workspace/ingestion
bun run dev --filter=web

# Build / Lint / Typecheck
bun run build
bun run lint
bun run typecheck

# Database
bun run db:generate          # Regenerate Prisma client after schema changes
bun run db:migrate:dev       # Create + apply a migration (dev)
bun run db:migrate:deploy    # Apply pending migrations (CI/prod)
bun run db:push              # Push schema without migrations (prototyping)
bun run db:studio            # Open Prisma Studio

# Infrastructure (local dev)
docker compose up -d         # Starts postgres:5432, redis:6379, localstack:4566
```

## Architecture

### Two-server design

| Server           | Framework | Role                                                              |
| ---------------- | --------- | ----------------------------------------------------------------- |
| `apps/api`       | Express 5 | Auth (JWT + refresh tokens), project/endpoint management CRUD     |
| `apps/ingestion` | Fastify 5 | Webhook intake, signature verification, S3 storage, Redis caching |

The split keeps the hot ingestion path free from auth overhead.

### Multi-tenant routing

Every `Endpoint` row has a `tokenHash` (SHA-256 of a URL token). Webhooks are routed as:

```
POST /api/v1/webhooks/stripe/:token
  → hash token → lookup Endpoint by tokenHash
  → use Endpoint.signingSecret to verify provider signature
  → store payload in S3, persist to DB, cache in Redis
```

Signing secrets live on `Endpoint`, not on the `User` — no global provider env vars.

### Auth system (`apps/api`)

- **Access tokens**: Short-lived JWTs (via `jose`), signed with HS256, sent as `httpOnly` cookies.
- **Refresh tokens**: Opaque 64-char hex, SHA-256 hashed before storage in `refresh_tokens` table.
- **Token families**: All tokens from a login share a `family` UUID. Re-presenting a revoked token triggers full-family revocation (theft detection).
- Passwords hashed with **Argon2id** via `Bun.password` (zero external deps).

### Data flow for a webhook event

1. `rawBodyPlugin` captures the raw `Buffer` before Fastify parses JSON (required for HMAC verification).
2. Token resolved → `Endpoint` fetched → signature verified per `verificationMode` (`NONE | OPTIONAL | STRICT`).
3. Full payload written to S3 (`events/{provider}/{date}/{eventId}.json`). Only the S3 URL is stored in Postgres.
4. `WebhookEvent` created in Postgres with deduplication via `@@unique([endpointId, eventId])`.
5. Event metadata cached in Redis with 24h TTL for fast dashboard lookups.

### Database schema key points

- `WebhookEvent.payloadUrl` → S3 reference only; raw body never stored in Postgres.
- `Delivery` rows track forwarding attempts with `retryCount`, `nextRetryAt`, and optimistic locking via `version`.
- `EventLog` is an append-only audit trail keyed by `LogType` enum (not free-text strings).
- `Usage` table stores aggregated monthly counts per user to avoid expensive `COUNT(*)` on events.
- `Project` and `Endpoint` use soft deletes (`deletedAt`).

### Infrastructure (local dev via Docker Compose)

| Service       | Port | Purpose                                    |
| ------------- | ---- | ------------------------------------------ |
| PostgreSQL 17 | 5432 | Primary DB (`webhook_db`)                  |
| Redis 7       | 6379 | Event cache, session store                 |
| LocalStack    | 4566 | S3-compatible storage (bucket: `webhooks`) |

The `ingestion` Docker service definition exists in `docker-compose.yml` but is commented out — run it locally with `bun run dev`.

## Key Conventions

- **Prisma schema** is the source of truth at `packages/db/prisma/schema.prisma`. After any schema change: `bun run db:generate`.
- **Enums over strings**: `EventStatus`, `DeliveryStatus`, `LogType`, `LogStatus`, `SourceProvider` are all Prisma enums — use them, don't use raw strings.
- **Repository pattern**: DB queries are in `*.repository.ts`; business logic in `*.service.ts`; HTTP handling in `*.controller.ts`.
- **Response helpers**: `apps/api/src/lib/response.ts` exports `json`, `error`, `notFound`, `badRequest`, etc. — use these instead of raw `res.status(...).json(...)`.
- **Package imports**: Internal packages are imported as `@workspace/db`, `@workspace/redis`, `@workspace/s3`, `@workspace/ui`.
