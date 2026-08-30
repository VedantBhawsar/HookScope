/**
 * Demo-data seeder — populates a realistic-looking slice of webhook traffic
 * (projects, endpoints, events, deliveries, logs, usage, alerts) for a single
 * user, so the dashboard has something worth showing on camera.
 *
 * Usage (from packages/db):
 *   bun run prisma/seed-demo.ts <userId> [options]
 *   bun run db:seed:demo <userId> [options]
 *
 * Options:
 *   --project=<name>   Demo project name to create/reuse (default: "Demo Workspace")
 *   --days=<n>          Days of history to spread events across (default: 30)
 *   --events=<n>        Total events to generate across all endpoints (default: 5000)
 *   --reset             Delete any existing project with the same name first, then rebuild it clean
 *   --no-s3             Skip uploading fake payload JSON to S3 (payload viewer will 404, everything else works)
 *
 * Example:
 *   bun run prisma/seed-demo.ts 3f2a1b4c-9e21-4d3a-8b0e-6b1a2c3d4e5f --days=21 --events=6000 --reset
 *
 * Safe to re-run: without --reset it just adds more traffic on top of what's
 * there; alerts and the monthly usage counter are always re-derived, not
 * duplicated.
 */

import { randomBytes, createHash, randomUUID } from "node:crypto"
import {
  prisma,
  SourceProvider,
  VerificationMode,
  EventStatus,
  DeliveryStatus,
  DeliveryErrorCode,
  LogStatus,
  LogType,
  PlanTier,
  SubscriptionStatus,
  AlertType,
  AlertSeverity,
} from "../src/index.js"

// Optional — best-effort payload upload. Never blocks the seed if S3/LocalStack is down.
let s3: typeof import("@hookscope/s3") | null = null
try {
  s3 = await import("@hookscope/s3")
} catch {
  // @hookscope/s3 not resolvable in this context — payload upload will be skipped.
}

// ─── CLI args ───────────────────────────────────────────────────────────────

function parseArgs(argv: string[]) {
  const positional = argv.filter((a) => !a.startsWith("--"))
  const flags = new Map<string, string>()
  for (const a of argv) {
    if (!a.startsWith("--")) continue
    const [key, ...rest] = a.slice(2).split("=")
    flags.set(key!, rest.join("=") || "true")
  }

  const userId = positional[0]
  if (!userId) {
    console.error("Usage: bun run prisma/seed-demo.ts <userId> [--project=name] [--days=30] [--events=5000] [--reset] [--no-s3]")
    process.exit(1)
  }

  return {
    userId,
    project: flags.get("project") ?? "Demo Workspace",
    days: Number(flags.get("days") ?? 30),
    totalEvents: Number(flags.get("events") ?? 5000),
    reset: flags.has("reset"),
    uploadPayloads: !flags.has("no-s3"),
  }
}

// ─── Small random helpers ────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)]!
}

function weightedPick<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let roll = Math.random() * total
  for (const [value, weight] of entries) {
    roll -= weight
    if (roll <= 0) return value
  }
  return entries[entries.length - 1]![0]
}

function hex(bytes: number): string {
  return randomBytes(bytes).toString("hex")
}

// ─── Provider fixtures ────────────────────────────────────────────────────────

interface ProviderFixture {
  source: SourceProvider
  name: string
  destinationPath: string
  signatureHeader: string
  signatureType: string
  timestampHeader: string | null
  eventTypes: readonly (readonly [string, number])[] // [type, weight]
  eventIdPrefix: string
  weight: number // share of total event volume
}

const PROVIDERS: ProviderFixture[] = [
  {
    source: SourceProvider.STRIPE,
    name: "Stripe — Payments",
    destinationPath: "stripe",
    signatureHeader: "Stripe-Signature",
    signatureType: "hmac-sha256",
    timestampHeader: "Stripe-Timestamp",
    eventIdPrefix: "evt",
    weight: 0.35,
    eventTypes: [
      ["payment_intent.succeeded", 40],
      ["invoice.paid", 18],
      ["customer.subscription.created", 10],
      ["customer.subscription.updated", 10],
      ["charge.refunded", 8],
      ["payment_intent.payment_failed", 8],
      ["invoice.payment_failed", 6],
    ],
  },
  {
    source: SourceProvider.GITHUB,
    name: "GitHub — CI Events",
    destinationPath: "github",
    signatureHeader: "X-Hub-Signature-256",
    signatureType: "hmac-sha256",
    timestampHeader: null,
    eventIdPrefix: "gh",
    weight: 0.25,
    eventTypes: [
      ["push", 35],
      ["pull_request", 25],
      ["workflow_run", 20],
      ["issues", 10],
      ["release", 6],
      ["star", 4],
    ],
  },
  {
    source: SourceProvider.SHOPIFY,
    name: "Shopify — Orders",
    destinationPath: "shopify",
    signatureHeader: "X-Shopify-Hmac-Sha256",
    signatureType: "hmac-sha256",
    timestampHeader: null,
    eventIdPrefix: "shop",
    weight: 0.2,
    eventTypes: [
      ["orders/create", 40],
      ["orders/paid", 30],
      ["carts/update", 15],
      ["products/update", 10],
      ["orders/cancelled", 5],
    ],
  },
  {
    source: SourceProvider.SLACK,
    name: "Slack — Workspace Events",
    destinationPath: "slack",
    signatureHeader: "X-Slack-Signature",
    signatureType: "hmac-sha256",
    timestampHeader: "X-Slack-Request-Timestamp",
    eventIdPrefix: "slk",
    weight: 0.1,
    eventTypes: [
      ["message.channels", 50],
      ["app_mention", 25],
      ["reaction_added", 15],
      ["channel_created", 10],
    ],
  },
  {
    source: SourceProvider.TWILIO,
    name: "Twilio — SMS Delivery",
    destinationPath: "twilio",
    signatureHeader: "X-Twilio-Signature",
    signatureType: "hmac-sha1",
    timestampHeader: null,
    eventIdPrefix: "sms",
    weight: 0.1,
    eventTypes: [
      ["message.delivered", 55],
      ["message.sent", 25],
      ["message.failed", 12],
      ["call.completed", 8],
    ],
  },
]

const ERROR_CODES = [
  DeliveryErrorCode.DESTINATION_UNREACHABLE,
  DeliveryErrorCode.TIMEOUT,
  DeliveryErrorCode.RATE_LIMITED,
  DeliveryErrorCode.PROCESSING_ERROR,
  DeliveryErrorCode.SIGNATURE_INVALID,
  DeliveryErrorCode.PAYLOAD_TOO_LARGE,
]

const IP_POOL = ["34.194.12.4", "35.71.98.201", "18.209.44.15", "52.4.199.31", "3.101.55.9", "185.71.204.18"]

// ─── Timing ───────────────────────────────────────────────────────────────────

/** Picks a createdAt within the last `days`, weighted toward recent days (ramping traffic). */
function randomTimestamp(days: number): Date {
  const dayIndex = weightedPick(
    Array.from({ length: days }, (_, i) => [i, 1 + (days - i) * 0.12] as const)
  )
  const now = Date.now()
  const dayStart = now - (dayIndex + 1) * 86_400_000
  // Bias toward business hours (9am–9pm) for a realistic-looking hourly chart.
  const hour = Math.random() < 0.75 ? randomInt(9, 21) : randomInt(0, 23)
  const minute = randomInt(0, 59)
  const second = randomInt(0, 59)
  const offsetMs = hour * 3_600_000 + minute * 60_000 + second * 1_000
  return new Date(dayStart + offsetMs)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const user = await prisma.user.findUnique({ where: { id: args.userId }, select: { id: true, email: true, name: true } })
  if (!user) {
    console.error(`✗ No user found with id "${args.userId}". Check the id and try again.`)
    process.exit(1)
  }
  console.log(`→ Seeding demo data for ${user.name} <${user.email}>`)

  // ── Plans + subscription (so usage/quota widgets have something to render) ──
  await ensurePlansAndSubscription(args.userId)

  // ── Project ─────────────────────────────────────────────────────────────────
  let project = await prisma.project.findFirst({
    where: { userId: args.userId, name: args.project, deletedAt: null },
  })

  if (project && args.reset) {
    console.log(`→ --reset: deleting existing project "${args.project}" (${project.id}) and all its data`)
    await prisma.project.delete({ where: { id: project.id } })
    project = null
  }

  if (!project) {
    project = await prisma.project.create({
      data: {
        userId: args.userId,
        name: args.project,
        description: "Seeded demo workspace — safe to delete.",
      },
    })
    console.log(`→ Created project "${project.name}" (${project.id})`)
  } else {
    console.log(`→ Reusing existing project "${project.name}" (${project.id})`)
  }

  // ── Endpoints (one per provider, created only if missing) ───────────────────
  const endpoints = await ensureEndpoints(project.id)

  // ── Events + deliveries + logs ───────────────────────────────────────────────
  const bucket = process.env["S3_BUCKET"] ?? "webhooks"
  if (args.uploadPayloads && s3) {
    try {
      await s3.ensureBucketExists(bucket)
    } catch {
      console.warn(`⚠ Could not reach S3 (bucket "${bucket}") — continuing without payload upload.`)
      args.uploadPayloads = false
    }
  } else {
    args.uploadPayloads = false
  }

  await generateTraffic({
    endpoints,
    days: args.days,
    totalEvents: args.totalEvents,
    bucket,
    uploadPayloads: args.uploadPayloads,
  })

  // ── Usage (re-derived from real counts, so re-runs stay correct) ────────────
  await recomputeUsage(args.userId)

  // ── Alerts (idempotent — re-run replaces the demo set, no duplicates) ───────
  await seedAlerts(args.userId, endpoints)

  // ── Summary ──────────────────────────────────────────────────────────────────
  const webUrl = (process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000").replace(/\/$/, "")
  console.log("\n✓ Done.")
  console.log(`  Dashboard: ${webUrl}/dashboard/${project.id}`)
  console.log(`  Endpoints seeded: ${endpoints.map((e) => e.name).join(", ")}`)
}

// ─── Plans + subscription ───────────────────────────────────────────────────

async function ensurePlansAndSubscription(userId: string) {
  const plans = [
    { tier: PlanTier.FREE, eventsPerMonth: 10_000, retentionDays: 1, endpointLimit: 1, priceCents: 0 },
    { tier: PlanTier.STARTER, eventsPerMonth: 100_000, retentionDays: 7, endpointLimit: 3, priceCents: 1200 },
    { tier: PlanTier.PRO, eventsPerMonth: 1_000_000, retentionDays: 30, endpointLimit: 999, priceCents: 3500 },
  ]
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      create: plan,
      update: plan,
    })
  }

  const existing = await prisma.subscription.findUnique({ where: { userId } })
  if (existing) return

  const proPlan = await prisma.plan.findUniqueOrThrow({ where: { tier: PlanTier.PRO } })
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 86_400_000)
  await prisma.subscription.create({
    data: {
      userId,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      lastSyncedAt: now,
    },
  })
  console.log("→ Created an ACTIVE Pro subscription for this user (quota widgets need a plan to render against)")
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

const INGESTION_BASE_URL = (process.env["INGESTION_BASE_URL"] ?? "http://localhost:5001").replace(/\/$/, "")

async function ensureEndpoints(projectId: string) {
  const results: { id: string; name: string; source: SourceProvider; fixture: ProviderFixture }[] = []

  for (const fixture of PROVIDERS) {
    const existing = await prisma.endpoint.findFirst({
      where: { projectId, source: fixture.source, deletedAt: null },
    })
    if (existing) {
      results.push({ id: existing.id, name: existing.name, source: fixture.source, fixture })
      continue
    }

    const token = hex(32)
    const tokenHash = createHash("sha256").update(token).digest("hex")
    const created = await prisma.endpoint.create({
      data: {
        projectId,
        name: fixture.name,
        tokenHash,
        source: fixture.source,
        destinationUrl: `https://api.demo-app.dev/hooks/${fixture.destinationPath}`,
        verificationMode: VerificationMode.STRICT,
        signingSecret: `whsec_${hex(24)}`,
        signatureHeader: fixture.signatureHeader,
        signatureType: fixture.signatureType,
        timestampHeader: fixture.timestampHeader,
        toleranceSec: 300,
        status: "active",
      },
    })
    console.log(
      `→ Created endpoint "${created.name}" — ${INGESTION_BASE_URL}/api/v1/webhooks/${fixture.destinationPath}/${token}`
    )
    results.push({ id: created.id, name: created.name, source: fixture.source, fixture })
  }

  return results
}

// ─── Traffic generation ─────────────────────────────────────────────────────

type EndpointCtx = Awaited<ReturnType<typeof ensureEndpoints>>[number]

async function generateTraffic(opts: {
  endpoints: EndpointCtx[]
  days: number
  totalEvents: number
  bucket: string
  uploadPayloads: boolean
}) {
  const { endpoints, days, totalEvents, bucket, uploadPayloads } = opts

  type EventRow = {
    id: string
    endpointId: string
    eventId: string
    source: SourceProvider
    eventType: string
    signature: Record<string, string>
    payloadUrl: string
    status: EventStatus
    sourceIp: string
    createdAt: Date
    lastStatusCode: number | null
    lastError: string | null
  }
  type DeliveryRow = {
    id: string
    webhookEventId: string
    destinationUrl: string
    status: DeliveryStatus
    responseCode: number | null
    responseBody: string | null
    latencyMs: number | null
    retryCount: number
    errorCode: DeliveryErrorCode | null
    nextRetryAt: Date | null
    createdAt: Date
  }
  type LogRow = {
    id: string
    webhookEventId: string
    deliveryId: string | null
    status: LogStatus
    type: LogType
    message: string
    createdAt: Date
  }

  const events: EventRow[] = []
  const deliveries: DeliveryRow[] = []
  const logs: LogRow[] = []
  const payloadUploads: { key: string; body: string }[] = []

  const totalWeight = endpoints.reduce((sum, e) => sum + e.fixture.weight, 0)
  let generated = 0

  for (let idx = 0; idx < endpoints.length; idx++) {
    const ep = endpoints[idx]!
    const isLast = idx === endpoints.length - 1
    const count = isLast ? totalEvents - generated : Math.round(totalEvents * (ep.fixture.weight / totalWeight))
    generated += count

    for (let i = 0; i < count; i++) {
      const createdAt = randomTimestamp(days)
      const eventType = weightedPick(ep.fixture.eventTypes)
      const eventId = `${ep.fixture.eventIdPrefix}_${i}_${hex(6)}`
      const dateKey = createdAt.toISOString().slice(0, 10)
      const key = `events/${ep.fixture.destinationPath}/${dateKey}/${eventId}.json`
      const payloadUrl = `s3://${bucket}/${key}`

      // Recency-based "live" tail: the freshest handful of events per endpoint
      // are left in-flight so the dashboard shows something non-terminal.
      const isLiveTail = i >= count - 3 && Date.now() - createdAt.getTime() < 15 * 60_000

      const eventLooksLikeFailure = /fail|cancel|error/i.test(eventType)
      const outcome: "delivered" | "failed" | "dead_letter" | "live" = isLiveTail
        ? "live"
        : weightedPick([
            ["delivered", eventLooksLikeFailure ? 55 : 90],
            ["failed", eventLooksLikeFailure ? 30 : 7],
            ["dead_letter", eventLooksLikeFailure ? 15 : 3],
          ] as const)

      const eventRowId = randomUUID()
      const sourceIp = pick(IP_POOL)
      const signature = { header: ep.fixture.signatureHeader, value: `t=${Math.floor(createdAt.getTime() / 1000)},v1=${hex(16)}` }

      let status: EventStatus
      let lastStatusCode: number | null = null
      let lastError: string | null = null

      logs.push({
        id: randomUUID(),
        webhookEventId: eventRowId,
        deliveryId: null,
        status: LogStatus.INFO,
        type: LogType.EVENT_RECEIVED,
        message: `Event received from ${ep.fixture.destinationPath}.com (${eventType})`,
        createdAt,
      })
      logs.push({
        id: randomUUID(),
        webhookEventId: eventRowId,
        deliveryId: null,
        status: LogStatus.SUCCESS,
        type: LogType.SIGNATURE_VERIFIED,
        message: "Signature verified successfully",
        createdAt: new Date(createdAt.getTime() + randomInt(5, 40)),
      })

      if (outcome === "live") {
        status = Math.random() < 0.5 ? EventStatus.RECEIVED : EventStatus.PROCESSING
        if (status === EventStatus.PROCESSING) {
          const attemptAt = new Date(createdAt.getTime() + randomInt(100, 900))
          const deliveryId = randomUUID()
          deliveries.push({
            id: deliveryId,
            webhookEventId: eventRowId,
            destinationUrl: `https://api.demo-app.dev/hooks/${ep.fixture.destinationPath}`,
            status: DeliveryStatus.RETRYING,
            responseCode: 503,
            responseBody: "Service temporarily unavailable",
            latencyMs: randomInt(200, 4000),
            retryCount: 1,
            errorCode: DeliveryErrorCode.DESTINATION_UNREACHABLE,
            nextRetryAt: new Date(Date.now() + randomInt(60_000, 300_000)),
            createdAt: attemptAt,
          })
          logs.push({
            id: randomUUID(),
            webhookEventId: eventRowId,
            deliveryId,
            status: LogStatus.WARNING,
            type: LogType.RETRY_SCHEDULED,
            message: "Delivery failed — retry scheduled",
            createdAt: attemptAt,
          })
        }
      } else if (outcome === "delivered") {
        status = EventStatus.DELIVERED
        const attemptAt = new Date(createdAt.getTime() + randomInt(100, 900))
        const latencyMs = randomInt(15, 650)
        const responseCode = weightedPick([[200, 85], [201, 8], [204, 7]] as const)
        const deliveryId = randomUUID()
        deliveries.push({
          id: deliveryId,
          webhookEventId: eventRowId,
          destinationUrl: `https://api.demo-app.dev/hooks/${ep.fixture.destinationPath}`,
          status: DeliveryStatus.SUCCESS,
          responseCode,
          responseBody: "OK",
          latencyMs,
          retryCount: 0,
          errorCode: null,
          nextRetryAt: null,
          createdAt: attemptAt,
        })
        logs.push({
          id: randomUUID(),
          webhookEventId: eventRowId,
          deliveryId,
          status: LogStatus.INFO,
          type: LogType.DELIVERY_ATTEMPT,
          message: `Attempting delivery to https://api.demo-app.dev/hooks/${ep.fixture.destinationPath}`,
          createdAt: attemptAt,
        })
        logs.push({
          id: randomUUID(),
          webhookEventId: eventRowId,
          deliveryId,
          status: LogStatus.SUCCESS,
          type: LogType.DELIVERY_SUCCESS,
          message: `Delivered — ${responseCode} in ${latencyMs}ms`,
          createdAt: new Date(attemptAt.getTime() + latencyMs),
        })
        lastStatusCode = responseCode
      } else {
        status = outcome === "failed" ? EventStatus.FAILED : EventStatus.DEAD_LETTER
        const attempts = outcome === "failed" ? randomInt(1, 3) : randomInt(3, 5)
        let attemptAt = new Date(createdAt.getTime() + randomInt(100, 900))
        let finalCode: number | null = null
        let finalErrorCode: DeliveryErrorCode | null = null

        for (let attempt = 0; attempt < attempts; attempt++) {
          const isFinal = attempt === attempts - 1
          const errorCode = pick(ERROR_CODES)
          const responseCode =
            errorCode === DeliveryErrorCode.DESTINATION_UNREACHABLE || errorCode === DeliveryErrorCode.TIMEOUT
              ? null
              : weightedPick([[500, 40], [502, 25], [503, 20], [429, 15]] as const)
          const latencyMs = errorCode === DeliveryErrorCode.TIMEOUT ? randomInt(3000, 10000) : randomInt(50, 1200)
          const deliveryId = randomUUID()
          const nextRetryAt = isFinal ? null : new Date(attemptAt.getTime() + (attempt + 1) * 2 * 60_000)

          deliveries.push({
            id: deliveryId,
            webhookEventId: eventRowId,
            destinationUrl: `https://api.demo-app.dev/hooks/${ep.fixture.destinationPath}`,
            status: isFinal ? DeliveryStatus.FAILED : DeliveryStatus.RETRYING,
            responseCode,
            responseBody: responseCode ? `Error ${responseCode}` : "Connection refused",
            latencyMs,
            retryCount: attempt,
            errorCode,
            nextRetryAt,
            createdAt: attemptAt,
          })
          logs.push({
            id: randomUUID(),
            webhookEventId: eventRowId,
            deliveryId,
            status: LogStatus.INFO,
            type: LogType.DELIVERY_ATTEMPT,
            message: `Attempting delivery (attempt ${attempt + 1}/${attempts})`,
            createdAt: attemptAt,
          })
          logs.push({
            id: randomUUID(),
            webhookEventId: eventRowId,
            deliveryId,
            status: LogStatus.ERROR,
            type: LogType.DELIVERY_FAILED,
            message: `Delivery failed — ${errorCode.toLowerCase().replace(/_/g, " ")}`,
            createdAt: new Date(attemptAt.getTime() + latencyMs),
          })
          if (!isFinal) {
            logs.push({
              id: randomUUID(),
              webhookEventId: eventRowId,
              deliveryId,
              status: LogStatus.WARNING,
              type: LogType.RETRY_SCHEDULED,
              message: `Retry scheduled for attempt ${attempt + 2}`,
              createdAt: new Date(attemptAt.getTime() + latencyMs + 10),
            })
          }

          finalCode = responseCode
          finalErrorCode = errorCode
          attemptAt = nextRetryAt ?? attemptAt
        }

        lastStatusCode = finalCode
        lastError = finalErrorCode ? finalErrorCode.toLowerCase().replace(/_/g, " ") : null
      }

      events.push({
        id: eventRowId,
        endpointId: ep.id,
        eventId,
        source: ep.source,
        eventType,
        signature,
        payloadUrl,
        status,
        sourceIp,
        createdAt,
        lastStatusCode,
        lastError,
      })

      if (uploadPayloads) {
        payloadUploads.push({
          key,
          body: JSON.stringify(
            {
              id: eventId,
              type: eventType,
              source: ep.fixture.destinationPath,
              createdAt: createdAt.toISOString(),
              data: { demo: true, note: "Seeded payload for demo purposes." },
            },
            null,
            2
          ),
        })
      }
    }
  }

  console.log(`→ Generated ${events.length} events / ${deliveries.length} deliveries / ${logs.length} log entries`)
  await insertInChunks("webhookEvent", events)
  await insertInChunks("delivery", deliveries)
  await insertInChunks("eventLog", logs)

  if (uploadPayloads && s3 && payloadUploads.length > 0) {
    console.log(`→ Uploading ${payloadUploads.length} fake payloads to S3 (bucket "${bucket}")...`)
    let uploaded = 0
    for (const batch of chunk(payloadUploads, 50)) {
      await Promise.all(
        batch.map((p) =>
          s3!.putObject({ bucket, key: p.key, body: p.body, contentType: "application/json" }).catch(() => {})
        )
      )
      uploaded += batch.length
    }
    console.log(`→ Uploaded ${uploaded} payloads`)
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function insertInChunks<Model extends "webhookEvent" | "delivery" | "eventLog">(
  model: Model,
  rows: unknown[]
) {
  for (const batch of chunk(rows, 500)) {
    // @ts-expect-error — generic dispatch across the three createMany-compatible models
    await prisma[model].createMany({ data: batch })
  }
}

// ─── Usage ────────────────────────────────────────────────────────────────────

async function recomputeUsage(userId: string) {
  const rows = await prisma.$queryRaw<{ month: string; count: bigint }[]>`
    SELECT to_char(we.created_at, 'YYYY-MM') AS month, count(*)::bigint AS count
    FROM webhook_events we
    JOIN endpoints e ON e.id = we.endpoint_id
    JOIN projects p ON p.id = e.project_id
    WHERE p.user_id = ${userId} AND we.deleted_at IS NULL
    GROUP BY 1
  `
  for (const row of rows) {
    await prisma.usage.upsert({
      where: { userId_month: { userId, month: row.month } },
      create: { userId, month: row.month, eventCount: Number(row.count) },
      update: { eventCount: Number(row.count) },
    })
  }
  console.log(`→ Usage recomputed for ${rows.length} month(s)`)
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

const DEMO_ALERT_NAMES = [
  "High delivery failure rate — Stripe",
  "GitHub endpoint gone quiet",
  "Any event lands in dead-letter",
] as const

async function seedAlerts(userId: string, endpoints: EndpointCtx[]) {
  await prisma.alert.deleteMany({ where: { userId, name: { in: [...DEMO_ALERT_NAMES] } } })

  const stripe = endpoints.find((e) => e.source === SourceProvider.STRIPE)
  const github = endpoints.find((e) => e.source === SourceProvider.GITHUB)

  const created: { id: string }[] = []

  if (stripe) {
    created.push(
      await prisma.alert.create({
        data: {
          userId,
          endpointId: stripe.id,
          name: DEMO_ALERT_NAMES[0],
          type: AlertType.DELIVERY_FAILURE_RATE,
          severity: AlertSeverity.CRITICAL,
          config: { threshold: 15, windowMinutes: 60 },
          isActive: true,
        },
      })
    )
  }

  if (github) {
    created.push(
      await prisma.alert.create({
        data: {
          userId,
          endpointId: github.id,
          name: DEMO_ALERT_NAMES[1],
          type: AlertType.ENDPOINT_SILENCE,
          severity: AlertSeverity.WARNING,
          config: { windowMinutes: 45 },
          isActive: true,
        },
      })
    )
  }

  created.push(
    await prisma.alert.create({
      data: {
        userId,
        endpointId: null,
        name: DEMO_ALERT_NAMES[2],
        type: AlertType.EVENT_FAILED,
        severity: AlertSeverity.INFO,
        config: { statuses: [EventStatus.DEAD_LETTER] },
        isActive: true,
      },
    })
  )

  // A few historical triggers so the alerts page isn't empty.
  for (const alert of created) {
    const triggerCount = randomInt(1, 4)
    await prisma.alertTrigger.createMany({
      data: Array.from({ length: triggerCount }, (_, i) => ({
        id: randomUUID(),
        alertId: alert.id,
        message: "Threshold exceeded — condition met",
        metadata: { seeded: true },
        createdAt: new Date(Date.now() - randomInt(1, 20) * 3_600_000 * (i + 1)),
      })),
    })
  }

  console.log(`→ Seeded ${created.length} alert(s) with sample triggers`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
