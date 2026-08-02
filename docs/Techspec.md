# Techspec — HookScope Agent Gateway Architecture

> Companion to `PRD.md`. Maps the current implementation to the Solution-2 buildout.
> Monorepo: **Turborepo + Bun workspaces**. Apps: `api` (Express 5, port 3000), `ingestion` (Fastify 5, port 3001), `web` (Next.js 16.1.6 / Turbopack / React 19 / TanStack Query). Packages: `db`, `redis`, `s3`, `ui`, `env`.

---

## 1. System overview

```
                        ┌─────────────────────────────┐
  Stripe ──────────────►│  INGESTION  (Fastify :3001) │
  GitHub ─────────────►│  raw-body → verify → enqueue │
  Other providers ────►│                             │
  GENERIC /:token ────►└──────────────┬──────────────┘
                                      │ BullMQ (Redis :6379)
                                      ▼
                        ┌─────────────────────────────┐
                        │  WORKER (BullMQ consumers)  │
                        │  S3 store → DB → Redis      │
                        │  cache → usage → forward    │
                        └──────────────┬──────────────┘
                                       │ fetch()
                                       ▼
                                  DESTINATION
                           (HTTP today; SQS/Kafka/Function P2)

  Dashboard: web (:3000) ◄── REST ──► API (Express :3000)
                                      │  endpoints/webhooks/alerts/billing
                                      └──► Postgres :5432
```

Two-server split keeps auth (API) off the hot ingestion path (see `CLAUDE.md`).

## 2. Ingestion hot path (`apps/ingestion/src`)

### Request lifecycle (per event)
1. **`raw-body.ts` plugin** — custom `application/json` parser captures `Buffer` on `request.rawBody` (HMAC needs exact bytes), then JSON-parses.
2. **Route handler** (`routes/stripe.ts`, `routes/github.ts`):
   - `hashToken(token)` (SHA-256) → `findStripeEndpoint(prisma, tokenHash)` — `tokenHash` unique lookup, `status=active`, `deletedAt=null`, `source=STRIPE`.
   - Signature gate (if `verificationMode !== NONE`): `verifyStripeSignature(rawBody, header, signingSecret)` → 400 on failure + best-effort `EventLog` write.
   - **Enqueue** `fastify.stripeQueue.add(...)` — BullMQ, ~1ms — then reply `{ received: true, queued, eventId, type }`.
   - Provider-specific payload validation: `validateStripePaymentEvent` (payment/livemode checks).

### Queue/worker (async persistence + delivery)
- **Queues** (`queues/stripe-event.queue.ts`): `attempts: 5`, custom linear backoff (15s→75s), `removeOnComplete: {count:1000}`, `removeOnFail:{count:500}`.
- **Workers** (`workers/stripe-event.worker.ts`), `concurrency: 10`, per job:
  1. **S3** `putObject` → `events/stripe/{YYYY-MM-DD}/{eventId}.json` (idempotent key; raw payload never in Postgres).
  2. **DB** `createWebhookEvent` in a `$transaction` (WebhookEvent + initial `EVENT_RECEIVED` EventLog); Prisma `P2002` → `isDuplicate: true` via `@@unique([endpointId, eventId])`.
  3. **Redis cache** `SET event:{id} ... EX 86400` (dashboard fast reads).
  4. **Usage** `usage.upsert({userId, month})` increment (duplicates skipped).
  5. **Forward** (`forwardAndPersist`): create `Delivery(PENDING)` → `assertSafeDestination` (SSRF guard) → `fetch(destinationUrl, {timeout: 10s})` → persist outcome transactionally (`Delivery` + `WebhookEvent` status/version + `EventLog`) → publish alert event on Redis `wh:alert:events` → **throw after persisting** so BullMQ retries, DB keeps the trail.
  6. **Exhaustion**: `worker.on("failed")` final attempt → `EventStatus.DEAD_LETTER` + `DELIVERY_FAILED` log + alert publish.

### Alert pipeline (cross-service)
- Workers publish JSON on Redis pub/sub channel `wh:alert:events`.
- `apps/api/src/lib/sse-manager.ts` subscribes; `apps/api/src/lib/alert-evaluator.ts` evaluates `Alert` rules → creates `AlertTrigger` → notifies UI (SSE) / chat (P2).

## 3. API surface (`apps/api/src`)

REST, repository/service/controller pattern (`*.repository.ts` → `*.service.ts` → `*.controller.ts`), response helpers in `lib/response.ts`, auth via `middleware/require-auth.ts`.

| Router | Endpoints (highlights) |
| --- | --- |
| `auth.router.ts` | register/login/refresh/logout, email verify (OTP), password reset, OAuth (Google/GitHub) |
| `project.router.ts` | CRUD projects (soft delete) |
| `endpoint.router.ts` | CRUD endpoints, regenerate token, signing secrets, event filters, custom headers |
| `webhook.router.ts` | `GET /webhooks` (page/limit/search/eventType/projectId/endpointId/status/source), `GET /:id` (+deliveries, +logs), `POST /:id/retry`, `POST /batch/replay`, `POST /batch/delete` |
| `alert.router.ts` | CRUD alert rules; SSE stream |
| `usage.router.ts` | Monthly usage + quota status |
| `billing.router.ts` | Dodo Payments: checkout, webhook sync, portal, cancel |
| `maintenance.router.ts` | cron-triggered cleanup (event expiration, dead-letter) |

**Replay today:** `WebhookService.retry`/`batchReplay` (in-process, async) → `createRetryDelivery` → `executeReplayDelivery`: parse `s3://bucket/key` from `payloadUrl`, `getObject`, re-POST original bytes with `x-webhook-replay: true`, persist outcome. Runs in the API process, not the queue — **migrate to the BullMQ replay queue in P2** so heavy replays don't block API event loop.

## 4. Packages

| Package | Role |
| --- | --- |
| `@hookscope/db` | Prisma client + enums (generated to `packages/db/generated/client`) |
| `@hookscope/redis` | Singleton Redis; `toConnectionOptions` for BullMQ |
| `@hookscope/s3` | `putObject`/`getObject`/`getS3Client` wrappers |
| `@hookscope/ui` | shadcn/ui primitives (e.g. `Dialog` with `hideCloseButton`) |
| `@hookscope/env` | Typed env (`IngestionEnv`, etc.) |
| `@hookscope/eslint-config`, `@hookscope/typescript-config` | Shared lint/ts |

## 5. Solution-2 build plan (gated by PRD phases)

### P1 — Generic intake (F9) + reliability hardening
1. **Provider-agnostic route** `POST /webhooks/:token`:
   - Generalize `findStripeEndpoint` → `findEndpoint(prisma, tokenHash)` (drop `source` filter; use `Endpoint.source` + `verificationMode`).
   - Add `GENERIC` to `SourceProvider` (exists), verification defaults to `NONE` unless a `signatureHeader`+`signatureType` is configured.
   - Refactor `createWebhookEvent` to take `source` param (already param-less today → generalize).
2. **Unify queue/worker** per provider into one `generic` queue + worker driven by endpoint config; keep provider queues as aliases for backward compat.
3. **Rate limiting** on ingestion routes (`apps/api/src/lib/rate-limit.ts` pattern → Fastify plugin) + abuse tarpit for GENERIC.
4. **Move replay into the queue** (BullMQ `replay` queue) to offload the API process; keep API surface identical.

### P2 — Destinations (F10–F14)
1. `Destination` model + CRUD (`endpoint.router.ts` extension); implicit default HTTP Destination on endpoint create.
2. `Delivery.destinationId` + per-destination retry policy in worker.
3. **Delivery adapters** behind one interface in ingestion:
   ```ts
   interface DeliveryAdapter {
     deliver(payload: Uint8Array, headers: Headers, target: string, opts: RetryOpts): Promise<DeliveryOutcome>
   }
   // HTTP → existing fetch path (SSRF-guarded)
   // SQS → AWS SDK SendMessage (payload as body, headers in attrs)
   // KAFKA → kafkajs producer
   // FUNCTION → POST to function endpoint
   ```
4. **Backpressure (F14):** per-destination Redis semaphore (`SETNX`-based) capping `maxConcurrency`; if `maxQueueDepth` exceeded, pause producer (`queue.pause`) and alert — never drop.
5. Fan-out: worker enqueues one job per `Destination`.

### P3 — Agent-first DX (F15–F19)
- `EndpointPortal` model + public read-only route.
- Playground: `POST /api/v1/playground/send` builds a sample provider payload from endpoint config.
- Chat alert channels in `Alert.config` (evaluator already exists).
- `@hookscope/cli`: `hookscope listen` (local tunnel → webhook URL), `hookscope replay <eventId>`, `hookscope tail`.

## 6. Reliability & correctness invariants (do not break)

- **Dedup:** `@@unique([endpointId, eventId])` + P2002 handling → workers are idempotent on retry.
- **Optimistic locking:** every `WebhookEvent`/`Delivery` status change bumps `version` with `WHERE version=N` — prevents concurrent-worker double delivery.
- **DB as truth, throw-to-retry:** worker persists state, *then* throws so BullMQ retries while the audit trail reflects reality.
- **S3 is the only raw payload store** — never persist body text in Postgres (retention + `PAYLOAD_TOO_LARGE` safety).
- **SSRF:** `assertSafeDestination` on every outbound call including replay.

## 7. Verification / commands

```bash
bun install
bun run dev --filter=@hookscope/api            # API :3000
bun run dev --filter=@hookscope/ingestion       # ingestion :3001
bun run dev --filter=web                        # dashboard
docker compose up -d                            # postgres :5432, redis :6379, localstack :4566

bun run typecheck && bun run lint               # gates before commit
bun run db:generate && bun run db:migrate:dev   # after schema edits
```

Tests live in `apps/api/src/__tests__` (supertest-based app harness in `helpers/app.ts`); run per-app.
