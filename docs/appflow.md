# Appflow — HookScope User & System Flows

> Companion to `PRD.md`/`Techspec.md`. Describes how a user moves through HookScope and how the system behaves at each step.
> Grounded in: `app-shell.tsx` auth-gate/project-redirect/endpoint-resolution, `apps/ingestion` pipeline, `apps/api` controllers.

---

## Flow 1 — Signup & onboarding (new user)

```
Landing → /register
  → email+password (Argon2id via Bun.password) OR OAuth (Google/GitHub)
  → email OTP verification (6-digit, 5-min, single-use)   [required unless OAuth]
  → RefreshToken issued (SHA-256 hashed, family-flagged)
  → AccessToken cookie (short-lived JWT)
  → Onboarding: company name/size/role/useCase  → marks onboardingCompletedAt
  → AppShell redirects:  no project?  → /projects (empty state)
                         has project? → /dashboard/{projectId}
```

**System:** `apps/api` `auth.controller` ↔ `auth.service` ↔ `auth.repository`; token families enable server-side revocation.

## Flow 2 — Create a project + endpoint (intake URL)

```
Projects page → "New project"  → name/description
Dashboard → Endpoint Nav → "New endpoint"
  → pick provider preset: Stripe | GitHub | Shopify | Slack | Twilio | Any (GENERIC)
  → set verification mode: STRICT / OPTIONAL / NONE
  → paste signing secret (provider-specific) for STRICT
  → set destination URL (today) → destination(s) (P2)
  → create → HookScope returns:  POST /api/v1/webhooks/{provider}/{token}
  → "Copy URL" (one click) + "Send me a test event"
```

**System:** `endpoint.controller` → SHA-256 `tokenHash` stored unique; signing secret on `Endpoint` (never global env). URL token is the only thing the provider sees.

## Flow 3 — Receive + deliver a webhook (end-to-end)

```
Provider ──POST──► /api/v1/webhooks/stripe/:token
 1. raw-body plugin captures exact bytes (for HMAC)
 2. hashToken → find Endpoint by tokenHash (active, matching source)
 3. if STRICT/OPTIONAL: verify Stripe-Signature against signingSecret
      ✗ invalid → 400 {received:false} + EventLog(ERROR, SIGNATURE_VERIFIED)
 4. validate payload (Stripe: payment/livemode checks)
 5. BullMQ enqueue (≈1ms) → 200 {received:true, queued:true}

Worker (concurrency 10, 5 attempts, 15→75s linear backoff):
 6. S3 putObject → events/stripe/{date}/{eventId}.json   (idempotent key)
 7. DB tx: WebhookEvent(RECEIVED) + EventLog(EVENT_RECEIVED)
      P2002 → duplicate → isDuplicate:true (skips cache/usage/delivery)
 8. Redis cache event:{id} (24h TTL)  →  dashboard sees it in <2s
 9. Usage upsert {userId, month}++   (billing metering)
10. Delivery(PENDING) → assertSafeDestination (SSRF guard) → fetch dest
      success → Delivery(SUCCESS) + Event(DELIVERED) + Log(DELIVERY_SUCCESS)
      failure → Delivery(FAILED) + Event(FAILED) + Log(DELIVERY_FAILED)
                → publish alert event → throw → BullMQ retries
11. 5th attempt fails → Event(DEAD_LETTER) + alert → appears in dead-letter UI
```

Dashboard shows the event live with status badges (RECEIVED → PROCESSING → DELIVERED / FAILED / DEAD_LETTER).

## Flow 4 — Failure → retry → replay (the "nothing lost" promise)

```
Dead-letter queue / Event detail shows FAILED/DEAD_LETTER rows
  └─ "Retry"        → POST /webhooks/:id/retry
                      createRetryDelivery → executeReplayDelivery
                      re-fetch payload from S3, POST with x-webhook-replay:true
  └─ "Replay batch" → POST /webhooks/batch/replay {eventIds:[…≤100]}
                      each: createRetryDelivery → async replay → outcome persisted
  └─ "Delete"       → POST /webhooks/batch/delete (soft delete, deferred purge)
```

**Guarantee:** no event is ever dropped silently — it is delivered, retrying, or dead-lettered with a replay affordance. `isReplay: true` marks replay deliveries so you can tell "first attempt" from "replay" in the UI.

## Flow 5 — Alerting & silence detection

```
User creates Alert rule (type: DELIVERY_FAILURE_RATE | DELIVERY_ERROR_CODE |
                         EVENT_FAILED | ENDPOINT_SILENCE; severity; config)
Worker publishes outcome on Redis pub/sub  wh:alert:events
API: sse-manager subscribes → alert-evaluator matches rules → AlertTrigger row
  → SSE push to dashboard (bell/badge) → P2: Slack/Discord/webhook channel
```

## Flow 6 — Billing (Dodo Payments)

```
Dashboard → Settings → Billing → "Upgrade"
  → subscription.create → Dodo checkout (Plan tier: FREE/STARTER/PRO)
  → Dodo webhook syncs status → Subscription row (dodoCustomerId, period)
  → lastSyncedAt staleness monitored (treat stale status as non-paying)
  → Usage metering enforced on ingest: eventCount vs Plan.eventsPerMonth
  → cancelAtPeriodEnd → downgrade at period end; PAST_DUE → suspend endpoints
```

## Flow 7 — (P2) Destination fan-out & backpressure

```
Endpoint → 2 destinations (HTTP webhook + SQS queue ARN)
Webhook arrives → worker enqueues ONE job per destination
  each job → Delivery{destinationId, retryPolicy from Destination}
  Redis semaphore caps per-destination concurrency (maxConcurrency)
  queue depth > maxQueueDepth → pause producer + alert (never drop)
SQS adapter: SendMessage(payload, headers-as-attributes)
Kafka adapter: kafkajs producer → topic
Delivery/Event status computed from each destination's outcome
```

## Flow 8 — (P3) Endpoint portal & CLI

```
Agent team wants visibility without an account
  → "Share portal" on endpoint → EndpointPortal token → public read-only URL
CLI:
  hookscope listen    → local tunnel → public URL → register as endpoint
  hookscope tail      → stream events live (SSE)
  hookscope replay <id> --batch   → replay one or many
```

---

## Sequence summary (single event, happy path)

```
Provider        Ingestion        Worker           S3/Redis/DB          Destination      Dashboard
   │  POST ──────► │
   │               │ hash→verify→enqueue
   │ 200 received ─┘
   │               │ (BullMQ job) ──► store S3 ─► tx(Event+Log)
   │               │                 │ cache Redis ────────► live card <2s
   │               │                 │ usage++
   │               │                 └─ Delivery ─► fetch ──► 200 OK
   │               │                                    │
   │               │                 success tx (Delivery+Event+Log)
   │               │                 publish alert event
```

All timings inline in `Techspec.md` §2.
