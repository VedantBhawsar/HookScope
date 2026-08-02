# PRD — HookScope as the Inbound Gateway for AI Agents

> **Status:** Draft v1
> **Product direction:** Solution 2 — "The gateway between AI agents and the world."
> **Companion docs:** `Design.md` (UX), `schema.md` (data model), `Techspec.md` (architecture), `appflow.md` (user flows).

---

## 1. Problem

AI agents (coding agents, support bots, trading agents, automation platforms) depend on external events to act: a payment succeeds, a repo is pushed, a lead is created, an alert fires. But the webhooks that carry those events are unreliable and hostile:

- **Missed events are silent.** If Stripe retries 2× in 4 days and your agent's endpoint is down, the payment confirmation is lost forever and nobody knows.
- **Verification is a trap.** Every provider has its own signature scheme (Stripe, GitHub, Shopify, Slack, Twilio). Agent builders either skip verification (security hole) or burn a day wiring it per provider.
- **No delivery guarantee.** Most builders forward webhooks straight into a queue/function with no retry, no backpressure, no audit trail, no replay.
- **No observability.** When an agent misfires on stale data, there's no way to answer "what did the webhook actually say, and when?"

Today's webhook platforms (Svix, Hookdeck, webhook.site) are built for **human developers and human destination URLs**. None are built for the realities of an **agent runtime**: high burst volume, fan-out to multiple agents/tools, replay-on-demand, and a consumer that is often a queue or a function, not a website.

## 2. Target users & personas

| Persona | Pain | HookScope value |
| --- | --- | --- |
| **AI platform / agent framework** (builds agents that call tools) | Every agent needs the same webhook plumbing; verification per provider is duplicated; dropped events break agent state | One verified intake URL per provider, guaranteed delivery to the agent's runtime |
| **Indie / solo agent builder** | No time for per-provider signature code; needs a dead-simple "send me events" URL | Copy-paste endpoint URL + provider preset; done in 2 minutes |
| **SaaS that feeds an AI copilot** (support bot, auto-tagging, lead enrichment) | Needs reliable event stream into their LLM pipeline; wants replay when the model misses a turn | Guaranteed queueing + replay-by-event-ID |
| **Trading / quant team** | Bursts of market events; cannot afford dropped events; needs millisecond visibility | Burst buffering, backpressure, full audit trail |

### Non-target (for now)
- Pure **outbound** delivery webhooks (making an API call to a customer) — that's a sending platform, different problem.
- **Pub/sub event bus** used as a general message broker (Kafka replacement). We are a webhook intake + delivery guarantee layer.

## 3. Positioning

> **HookScope is the inbound gateway between AI agents and the world — receive, verify, and reliably deliver the thousands of webhooks your agents depend on.**

- **One URL per provider, verified for you.** Copy a `POST /api/v1/webhooks/stripe/:token` URL; signature verification is built in. No signing-secret engineering.
- **Guaranteed delivery, not "hopefully it arrives."** Retries, dead-letter, replay-by-event-ID.
- **Deliver to agent runtimes, not just websites.** HTTP endpoints today; SQS / Kafka / function targets next.
- **Built for bursts.** Agents get 1000 events in a second; we buffer, you breathe.

## 4. Goals

### Product goals
1. A new developer can have a verified webhook endpoint delivering to their agent runtime in **< 5 minutes**.
2. **100% of received events** are either delivered, retried, or dead-lettered with a one-click replay — zero silent drops.
3. Replay any event (or batch) to its destination in **one click / one API call**, using the original payload from S3.
4. Self-serve onboarding: no sales call to start paying.

### Success metrics (targets)
| Metric | Target |
| --- | --- |
| Time-to-first-delivered-webhook | < 5 min |
| Delivery success rate (first attempt) | ≥ 95% |
| Delivery success rate (with retries) | ≥ 99.9% |
| Silent-drop rate | 0% |
| P95 event visibility (ingest → dashboard) | < 2 s |
| Free → paid conversion | ≥ 5% |
| Paid churn (monthly) | < 3% |

## 5. Non-goals (this phase)

- No outbound/sending product.
- No self-hosted / on-prem distribution.
- No custom event-schema transformation engine (only header/body passthrough + filters).
- No multi-region ingestion (single region; horizon = US + EU failover).

## 6. Functional requirements

### Phase 1 — "Reliable agent intake" (build on current codebase)
| ID | Requirement | Maps to existing code |
| --- | --- | --- |
| F1 | Verified intake URLs per provider (`stripe`, `github`, …) with `STRICT`/`OPTIONAL`/`NONE` verification modes | `apps/ingestion/src/routes/*.ts`, `VerificationMode` enum |
| F2 | Raw-body capture for signature verification | `apps/ingestion/src/plugins/raw-body.ts` |
| F3 | Duplicate suppression per `(endpoint, eventId)` | `WebhookEvent.@@unique([endpointId, eventId])` |
| F4 | Payload persisted to S3, only the URL in Postgres | worker `putObject` + `payloadUrl` |
| F5 | Background delivery with retries (5 attempts, linear backoff) | BullMQ queue + `stripe-event.worker.ts` |
| F6 | Dead-letter with manual review + replay | `EventStatus.DEAD_LETTER`, `retry`/`batchReplay` |
| F7 | Per-event audit trail | `EventLog` (append-only) |
| F8 | Live event search + filtering | `GET /webhooks` (page/status/source/eventType/endpointId) |
| F9 | **Generic intake route** so any provider works: `POST /webhooks/:token` (defaults to `GENERIC` source, no verification unless configured) | New; generalize `findStripeEndpoint` → provider-agnostic lookup |

### Phase 2 — "Agent destination types" (the Hookdeck-like moat)
| ID | Requirement | Notes |
| --- | --- | --- |
| F10 | **Destination** abstraction decoupled from a single `destinationUrl` | New `Destination` model, `Endpoint` → many `Destinations` |
| F11 | Deliver to HTTP URLs (exists), plus **SQS**, **Kafka**, and **Serverless function** targets | New delivery adapters in ingestion |
| F12 | Fan-out: one webhook delivered to N destinations | Delivery-per-destination rows |
| F13 | Per-destination retry policy + dead-letter | Reuse `Delivery` + `DeliveryErrorCode` |
| F14 | **Burst buffering + backpressure**: if a destination is slow, buffer and rate-limit rather than drop or OOM | Redis-backed semaphore / per-destination concurrency control |

### Phase 3 — "Agent-first DX"
| ID | Requirement | Notes |
| --- | --- | --- |
| F15 | **Consumer-style endpoint portal** — a public "inspect this webhook" page shareable with a link | New `EndpointPortal` (public read-only view) |
| F16 | Webhook **playground / mock send** — send a sample provider payload from the dashboard to test your agent | New API + UI |
| F17 | **Replay by event ID from the dashboard** | Exists (`retry`, `batchReplay`); surface in UI |
| F18 | Alerts to Slack/Discord when delivery failure rate spikes or an endpoint goes silent | `Alert` model exists; add webhook/chat notification channels |
| F19 | SDK/cli (`@hookscope/cli`) for `hookscope listen` and `hookscope replay` | New package |

## 7. Pricing

Anchor **$39–$99/mo by event volume** — matches Hookdeck, undercuts Svix (~15× cheaper at the low end). Free tier is a **funnel**, not a permanent freebie.

| Plan | Price | Events/mo | Retention | Endpoints | Destinations | Targets |
| --- | --- | --- | --- | --- | --- | --- |
| **Free** | $0 | 10k | 3 days | 2 | HTTP only | Try-it funnel |
| **Starter** | $39 | 500k | 30 days | 10 | HTTP + SQS | Indie agent builders |
| **Pro** | $99 | 5M | 90 days | 50 | All targets | AI platforms, SaaS copilots |
| **Scale** | Custom | 50M+ | 180 days | ∞ | All | Enterprises |

Metering already supported via `Usage` table + `Plan.eventsPerMonth` (see `schema.md`); billing runs on Dodo Payments (`billing.module` in `apps/api`).

## 8. Open questions / risks

- **Trademark:** "Hooksbase/Hookbase" vs "HookScope" — run a clearance check before public launch.
- **Kafka/SQS adapters** are real engineering; confirm with 3 design-partner customers that HTTP+SQS covers their need first.
- **Abuse surface:** public GENERIC intake URLs can be spam-hammered — need rate limiting + tarpit (`apps/api/src/lib/rate-limit.ts` exists; extend to ingestion).
- **SSRF** on arbitrary `destinationUrl` already mitigated (`apps/ingestion/src/lib/ssrf.ts`, `assertSafeDestination`) — keep hard for generic endpoints.
- **Retention job** (`event-expiration.service.ts`) must be extended to prune S3 + dead-letter replays.
