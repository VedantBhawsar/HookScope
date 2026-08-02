# Target — Delivery Destinations for HookScope

> Companion to `PRD.md` (F10–F14), `schema.md` (§3.1 `Destination`), `Techspec.md` (§5 P2).
> Defines the **Target** system: where a webhook is delivered and how HookScope guarantees it arrives.
> Today only one target exists (HTTP via `Endpoint.destinationUrl`); this doc is the P2 blueprint.

---

## 1. What is a Target?

A **Target** (aka Destination) is an abstract recipient of a delivered webhook. The endpoint (intake URL) is *where events enter*; a target is *where events go*. One endpoint → many targets (fan-out).

```
POST /api/v1/webhooks/stripe/:token        ← Endpoint (intake, verified)
        │
        ├──► Target: HTTP   https://agent-runtime.example.com/hooks
        ├──► Target: SQS    arn:aws:sqs:us-east-1:123:agent-events
        └──► Target: Kafka  topic: agent-events (broker: ...)
```

## 2. Target types (P2)

| Type | Connector | Use case |
| --- | --- | --- |
| `HTTP` | `fetch()` (exists, SSRF-guarded) | Any URL today: agent runtime, function endpoint, middleware |
| `SQS` | AWS SDK `SendMessage` | Agent pipelines that drain a queue; async, durable |
| `KAFKA` | kafkajs producer | Streaming agent consumers, event-sourced agents |
| `FUNCTION` | POST to function endpoint (wraps HTTP) | Serverless targets with native retry semantics |

**P1 reality:** HTTP only, one destination per endpoint. P2 generalizes to a `Destination` model + adapter interface.

## 3. Adapter interface (ingestion)

```ts
// apps/ingestion/src/adapters/
interface DeliveryAdapter {
  type: DestinationType
  deliver(p: {
    payload: Uint8Array                 // exact bytes from S3 (or live body)
    headers: Record<string, string>     // x-webhook-* + custom headers
    target: string                      // URL / ARN / topic / function name
    opts: { timeoutMs: number; maxAttempts: number }
  }): Promise<DeliveryOutcome>
}

type DeliveryOutcome = {
  status: DeliveryStatus                // SUCCESS | FAILED
  responseCode?: number
  latencyMs: number
  errorCode?: DeliveryErrorCode         // RATE_LIMITED | TIMEOUT | DESTINATION_UNREACHABLE | PROCESSING_ERROR
  responseBody?: string                 // first 300 chars
}
```

Each adapter persists its outcome through the same `Delivery` row + `EventLog` + optimistic-lock path the HTTP worker uses today (`Techspec.md` §2). **The only new code is the adapter + routing; retries, dead-letter, alerts, and replay are already generic.**

## 4. Delivery guarantees per target

Per-target overrides live on `Destination` (`maxAttempts`, `backoffMs`, `timeoutMs`, `maxConcurrency`, `maxQueueDepth`):

| Guarantee | Mechanism |
| --- | --- |
| Retries | BullMQ `attempts` per job, custom linear backoff (n × `backoffMs`) |
| No double-delivery | `Delivery.version` optimistic lock (`UPDATE ... WHERE version=N`) |
| No silent drop | Exhausted attempts → `EventStatus.DEAD_LETTER` + alert |
| Replay | `isReplay` delivery re-POSTs original S3 payload (`x-webhook-replay: true`) |
| Dedup | `@@unique([endpointId, eventId])`, P2002 handled |
| SSRF | `assertSafeDestination` before every outbound call (HTTP + FUNCTION) |
| Burst safety (F14) | Redis semaphore caps `maxConcurrency`; queue depth > `maxQueueDepth` → pause + alert |

## 5. Fan-out semantics

- One ingested event → **one BullMQ job per target** (`destinationId` on the job + `Delivery`).
- Event `status` reflects the **worst** child outcome (any target failed → retrying; all succeed → `DELIVERED`).
- `Delivery.destinationId` (nullable for P1 back-compat) scopes dashboards per target.

## 6. Backpressure (F14) — the "never drop, never OOM" rule

```
Worker picks job for target T
  ─ concurrency cap via Redis semaphore (INCR if < maxConcurrency else retry-wait)
  ─ track queue depth per target (ZADD score = enqueue time)
  if depth > maxQueueDepth:
      alert (ENDPOINT_SILENCE / DELIVERY_FAILURE_RATE style)
      pause producer for that target (queue.pause)   ← never drop, just buffer
      resume when depth drains below threshold
```

## 7. API & UI surface (P2)

- **API:** extend `endpoint.router.ts` → `POST/PATCH/DELETE /endpoints/:id/destinations`, `GET /endpoints/:id/destinations`, plus `POST /destinations/:id/test` (send probe event).
- **UI:** "Destinations" section under the endpoint (`Design.md` §5.1) — create, per-target retry policy, live health (success %, queue depth, last event at).
- **Back-compat:** creating an endpoint implicitly creates an HTTP `Destination` mirroring `destinationUrl`; old reads keep working.

## 8. Rollout order

1. `Destination` + `DestinationType` migration, implicit HTTP destination, `Delivery.destinationId` (`schema.md` §3.1).
2. Adapter interface + refactor `forwardAndPersist` behind it (no behavior change, HTTP-only).
3. SQS adapter + per-target retry policy + fan-out.
4. Backpressure semaphore + per-target dashboard health.
5. Kafka adapter (validate demand with design partners first — SQS covers most agent pipelines).

## 9. Pricing mapping

| Plan | Targets |
| --- | --- |
| Free | HTTP only |
| Starter | HTTP + SQS |
| Pro / Scale | All targets |
