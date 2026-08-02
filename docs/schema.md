# Schema — HookScope Data Model

> Ground truth: `packages/db/prisma/schema.prisma` (Prisma, PostgreSQL, `prisma-client` generator).
> This doc documents the **current** model and proposes the **additions** needed for the AI-agent gateway direction.

---

## 1. Enums

| Enum | Values | Purpose |
| --- | --- | --- |
| `SourceProvider` | `STRIPE`, `GITHUB`, `SHOPIFY`, `SLACK`, `TWILIO`, `GENERIC` | Which external system sent the webhook. `GENERIC` powers the provider-agnostic intake route (F9). |
| `EventStatus` | `RECEIVED`, `PROCESSING`, `DELIVERED`, `FAILED`, `DEAD_LETTER` | Lifecycle of a received event. `DEAD_LETTER` = needs review/replay. |
| `DeliveryStatus` | `PENDING`, `SUCCESS`, `FAILED`, `RETRYING` | A single delivery attempt outcome. |
| `DeliveryErrorCode` | `SIGNATURE_INVALID`, `RATE_LIMITED`, `DESTINATION_UNREACHABLE`, `TIMEOUT`, `PAYLOAD_TOO_LARGE`, `PROCESSING_ERROR` | Machine-readable error codes for retry logic + alerts. |
| `LogStatus` | `INFO`, `WARNING`, `ERROR`, `SUCCESS` | Severity of an `EventLog` entry. |
| `LogType` | `EVENT_RECEIVED`, `SIGNATURE_VERIFIED`, `DELIVERY_ATTEMPT`, `DELIVERY_SUCCESS`, `DELIVERY_FAILED`, `RETRY_SCHEDULED` | Bounded audit-trail event kinds. |
| `PlanTier` | `FREE`, `STARTER`, `PRO` | Static tier definition. |
| `SubscriptionStatus` | `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELED`, `UNPAID`, `PAUSED`, `INCOMPLETE` | Billing lifecycle. |
| `VerificationMode` | `NONE`, `OPTIONAL`, `STRICT` | Signature check policy on an endpoint. |
| `OAuthProvider` | `GOOGLE`, `GITHUB` | Login provider. |
| `AlertType` | `DELIVERY_FAILURE_RATE`, `DELIVERY_ERROR_CODE`, `EVENT_FAILED`, `ENDPOINT_SILENCE` | Alert rule kinds. |
| `AlertSeverity` | `INFO`, `WARNING`, `CRITICAL` | Alert severity. |

## 2. Models (current)

### Identity & auth
- **`User`** (`users`): profile + onboarding fields. `passwordHash` is Argon2id (`Bun.password`); API keys live on `Endpoint`, not `User`.
- **`RefreshToken`** (`refresh_tokens`): opaque token, **SHA-256 hash stored** (`tokenHash`), token-`family` theft detection, soft-revoke via `revokedAt`.
- **`EmailVerificationToken`** / **`PasswordResetToken`**: single-use, hashed, time-limited. OTPs are 6-digit, 5-min TTL, rate-limited at API layer.
- **`OAuthAccount`**: `@@unique([provider, providerAccountId])` — one user, many providers.

### Tenancy
- **`Project`** (`projects`): owned by `User`, soft-delete via `deletedAt`, `status` boolean.

### Intake
- **`Endpoint`** (`endpoints`): the intake URL identity.
  - `tokenHash` (SHA-256 of the URL token, `@unique`) — never store the raw token.
  - `source` (`SourceProvider`), `destinationUrl` (single today → becomes `Destination[]` in P2).
  - `verificationMode` + `signingSecret`/`signatureHeader`/`signatureType`/`timestampHeader`/`toleranceSec` for provider verification.
  - `eventFilters` (JSON) and `customHeaders` (JSON) applied at forwarding.
  - `status` ("active"), soft-delete `deletedAt`.

### Events (hot path)
- **`WebhookEvent`** (`webhook_events`):
  - `@@unique([endpointId, eventId])` — **duplicate suppression** (provider event IDs).
  - `payloadUrl` = `s3://bucket/key` only; raw body never in Postgres.
  - `eventType` denormalized for filter-by-type without JSON scan.
  - `signature` (JSON) stored for re-verification/audit.
  - `lastStatusCode`, `lastError`, `version` (optimistic lock), soft `deletedAt`.
  - Indexes: `[endpointId, createdAt DESC]` (timeline), `[status, createdAt]` (failures window), `[source, eventType]` (provider filter).

### Delivery
- **`Delivery`** (`deliveries`): one row per attempt (and per destination in P2).
  - `responseCode`, `responseBody` (first 300 chars), `latencyMs`, `retryCount`, `isReplay`.
  - `errorCode` (`DeliveryErrorCode`) — structured, replaces free-text.
  - `nextRetryAt` — polled by retry scheduler (`@@index([status, nextRetryAt])`).
  - `ackedAt`/`ackStatus` — manual-ack for providers like Stripe replay.
  - `version` optimistic lock prevents double-delivery by concurrent workers.
  - Idempotency index `[webhookEventId, retryCount]`.

### Audit & telemetry
- **`EventLog`** (`event_logs`): append-only per event; optional `deliveryId`; `status`+`type` enums; `@@index([createdAt])` for pruning.
- **`Usage`**: `@@unique([userId, month])`, `eventCount` incremented on ingest (duplicates skipped) — avoids `COUNT(*)` for quotas.

### Billing
- **`Plan`**: static tiers (`tier` unique, `eventsPerMonth`, `retentionDays`, `endpointLimit`, `priceCents`).
- **`Subscription`**: one-per-user; Dodo Payments refs (`dodoCustomerId`, `dodoSubscriptionId`), `currentPeriodStart/End`, `cancelAtPeriodEnd`, `lastSyncedAt` staleness check.

### Alerting
- **`Alert`**: user rule, optional `endpointId` (null = all), `type` + JSON `config` (Zod-validated in API), `severity`, `isActive`.
- **`AlertTrigger`**: append-only firing record (`message`, `metadata` JSON).

## 3. Proposed additions (AI-agent gateway)

### 3.1 `Destination` (P2 — decouple target from endpoint)
```prisma
model Destination {
  id           String   @id @default(uuid())
  endpointId   String   @map("endpoint_id")
  endpoint     Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  name     String
  type     DestinationType // HTTP | SQS | KAFKA | FUNCTION
  /// HTTP url, SQS ARN, kafka topic, function name — kept opaque to the router
  target   String

  // Retry policy (overrides endpoint defaults)
  maxAttempts Int     @default(5)
  backoffMs   Int     @default(15000)   // linear: n * backoffMs
  timeoutMs   Int     @default(10000)

  // Burst / backpressure (F14)
  maxConcurrency Int @default(10)
  maxQueueDepth  Int @default(1000)

  status  String    @default("active")
  deletedAt DateTime? @map("deleted_at")
  createdAt DateTime  @default(now()) @map("created_at")

  deliveries Delivery[]

  @@index([endpointId])
  @@map("destinations")
}

enum DestinationType { HTTP SQS KAFKA FUNCTION }
```
- `Delivery` gains `destinationId String? @map("destination_id")` + relation (nullable for backwards compat with P1).
- `Endpoint.destinationUrl` becomes deprecated-but-kept (single-destination fast path) OR is replaced by a default `Destination`. Prefer: create an implicit HTTP `Destination` on endpoint creation, keep `destinationUrl` for P1 back-compat, migrate reads through `Destination`.

### 3.2 Endpoint portal (P3)
```prisma
model EndpointPortal {
  id         String   @id @default(uuid())
  endpointId String   @unique @map("endpoint_id")
  endpoint   Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)
  token      String   @unique   // unguessable, read-only share token
  createdAt  DateTime @default(now()) @map("created_at")
  @@map("endpoint_portals")
}
```

### 3.3 Chat alert channels (F18)
Add to `Alert.config` (JSON, no migration): `{ "channel": "slack" | "discord" | "webhook", "url": "..." }`. Evaluated by `apps/api/src/lib/alert-evaluator.ts`; no schema change required.

## 4. Migration notes

- After any schema change: `bun run db:generate` then `bun run db:migrate:dev`.
- `Delivery.destinationId` backfill: existing `Delivery` rows keep `destinationId = NULL` → treat NULL as "the endpoint's default destination."
- Retention (`event-expiration.service.ts`) must prune: soft-deleted events, their S3 objects, and expired dead-letter replays.
- `Usage`/`Plan` already support volume metering for the $39/$99 pricing — no schema work needed for billing.
