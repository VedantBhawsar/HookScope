import DodoPayments from "dodopayments"
import { PlanTier, SubscriptionStatus } from "@hookscope/db"
import type { BillingRepository } from "./billing.repository"
import type { CreateCheckoutDto } from "./billing.types"

const FRONTEND_URL = process.env["FRONTEND_URL"] ?? "http://localhost:3000"

// Dodo product IDs are created per plan/interval in the Dodo dashboard
const PRODUCT_IDS: Record<string, Record<"monthly" | "annual", string>> = {
  starter: {
    monthly: process.env["DODO_STARTER_MONTHLY_PRODUCT_ID"] ?? "",
    annual:  process.env["DODO_STARTER_ANNUAL_PRODUCT_ID"] ?? "",
  },
  pro: {
    monthly: process.env["DODO_PRO_MONTHLY_PRODUCT_ID"] ?? "",
    annual:  process.env["DODO_PRO_ANNUAL_PRODUCT_ID"] ?? "",
  },
}

const PLAN_TIER_MAP: Record<string, PlanTier> = {
  starter: PlanTier.STARTER,
  pro:     PlanTier.PRO,
}

function mapDodoStatusToInternal(dodoStatus: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    pending:   SubscriptionStatus.TRIALING,
    active:    SubscriptionStatus.ACTIVE,
    paused:    SubscriptionStatus.PAUSED,
    cancelled: SubscriptionStatus.CANCELED,
    failed:    SubscriptionStatus.PAST_DUE,
    on_hold:   SubscriptionStatus.UNPAID,
  }
  return map[dodoStatus] ?? SubscriptionStatus.ACTIVE
}

export class BillingService {
  constructor(private readonly repo: BillingRepository) {}

  private get dodo(): DodoPayments {
    const key = process.env["DODO_PAYMENTS_API_KEY"]
    if (!key) throw new Error("DODO_PAYMENTS_API_KEY is not set in environment")
    return new DodoPayments({
      bearerToken: key,
      environment: process.env["NODE_ENV"] === "production" ? "live_mode" : "test_mode",
    })
  }

  async createCheckoutSession(userId: string, email: string, dto: CreateCheckoutDto) {
    const { planId, interval } = dto

    const productId = PRODUCT_IDS[planId]?.[interval]
    if (!productId) throw new Error(`No Dodo product configured for ${planId}/${interval}`)

    const planTier = PLAN_TIER_MAP[planId]
    if (!planTier) throw new Error(`Unknown plan: ${planId}`)

    const returnBase = dto.returnTo === "projects" ? "/projects" : "/settings"

    const session = await this.dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email },
      return_url: `${FRONTEND_URL}${returnBase}?billing=success`,
      metadata: { userId, planTier },
    })

    return { url: session.checkout_url }
  }

  async createPortalSession(userId: string) {
    const sub = await this.repo.findSubscriptionByUserId(userId)
    if (!sub?.dodoCustomerId) {
      throw new Error("No billing account found. Complete checkout first.")
    }

    const portal = await this.dodo.customers.customerPortal.create(sub.dodoCustomerId, {
      return_url: `${FRONTEND_URL}/settings`,
    })

    return { url: portal.link }
  }

  async getSubscription(userId: string) {
    const sub = await this.repo.findSubscriptionByUserId(userId)
    if (!sub) return null

    return {
      status: sub.status,
      tier: sub.plan.tier,
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      dodoCustomerId: sub.dodoCustomerId,
    }
  }

  async handleWebhookEvent(rawBody: Buffer, headers: Record<string, string>): Promise<void> {
    const webhookKey = process.env["DODO_PAYMENTS_WEBHOOK_KEY"]
    if (!webhookKey) throw new Error("DODO_PAYMENTS_WEBHOOK_KEY is not set")

    const client = new DodoPayments({
      bearerToken: process.env["DODO_PAYMENTS_API_KEY"] ?? "",
      webhookKey,
      environment: process.env["NODE_ENV"] === "production" ? "live_mode" : "test_mode",
    })

    const event = client.webhooks.unwrap(rawBody.toString(), { headers })

    switch (event.type) {
      case "subscription.active":
      case "subscription.renewed": {
        await this.syncSubscriptionById((event.data as { subscription_id: string }).subscription_id)
        break
      }
      case "subscription.cancelled": {
        const data = event.data as { subscription_id: string }
        await this.repo.updateSubscriptionByDodoId(data.subscription_id, {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: false,
        })
        break
      }
      case "subscription.failed": {
        const data = event.data as { subscription_id: string }
        await this.repo.updateSubscriptionByDodoId(data.subscription_id, {
          status: SubscriptionStatus.PAST_DUE,
          cancelAtPeriodEnd: false,
        })
        break
      }
      case "payment.succeeded": {
        const data = event.data as { subscription_id?: string }
        if (data.subscription_id) {
          await this.syncSubscriptionById(data.subscription_id)
        }
        break
      }
    }
  }

  private async syncSubscriptionById(dodoSubscriptionId: string): Promise<void> {
    const dodoSub = await this.dodo.subscriptions.retrieve(dodoSubscriptionId)

    const planTier = this.resolvePlanTierFromProductId(dodoSub.product_id)
    const plan = planTier ? await this.repo.findPlanByTier(planTier) : null

    const currentPeriodStart = dodoSub.previous_billing_date
      ? new Date(dodoSub.previous_billing_date)
      : new Date()
    const currentPeriodEnd = dodoSub.next_billing_date
      ? new Date(dodoSub.next_billing_date)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const existing = await this.repo.findSubscriptionByDodoId(dodoSubscriptionId)
    if (existing) {
      await this.repo.updateSubscriptionByDodoId(dodoSubscriptionId, {
        status: mapDodoStatusToInternal(dodoSub.status),
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: dodoSub.cancel_at_next_billing_date,
        ...(plan ? { planId: plan.id } : {}),
      })
    } else {
      const userId = dodoSub.metadata?.userId
      if (!userId) {
        console.error("[billing] No userId in Dodo subscription metadata:", dodoSubscriptionId)
        return
      }
      if (!plan) {
        console.error("[billing] No plan found for product:", dodoSub.product_id)
        return
      }

      await this.repo.upsertSubscription({
        userId,
        planId: plan.id,
        status: mapDodoStatusToInternal(dodoSub.status),
        dodoCustomerId: dodoSub.customer.customer_id,
        dodoSubscriptionId,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: dodoSub.cancel_at_next_billing_date,
      })
    }
  }

  async changePlan(userId: string, planId: string, interval: "monthly" | "annual") {
    const productId = PRODUCT_IDS[planId]?.[interval]
    if (!productId) throw new Error(`No Dodo product configured for ${planId}/${interval}`)

    const planTier = PLAN_TIER_MAP[planId]
    if (!planTier) throw new Error(`Unknown plan: ${planId}`)

    const plan = await this.repo.findPlanByTier(planTier)
    if (!plan) throw new Error(`Plan row not found for tier ${planTier}. Run the seed script.`)

    const sub = await this.repo.findSubscriptionByUserId(userId)
    if (!sub?.dodoSubscriptionId) throw new Error("No active subscription found.")

    await this.dodo.subscriptions.changePlan(sub.dodoSubscriptionId, {
      product_id: productId,
      quantity: 1,
      proration_billing_mode: "prorated_immediately",
      effective_at: "immediately",
    })

    // Sync the plan tier locally so the UI reflects the change without waiting for the webhook
    await this.repo.updateSubscriptionByDodoId(sub.dodoSubscriptionId, {
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      planId: plan.id,
    })

    return { message: `Plan updated to ${planId} (${interval})` }
  }

  private resolvePlanTierFromProductId(productId: string): PlanTier | null {
    for (const [planKey, intervals] of Object.entries(PRODUCT_IDS)) {
      if (Object.values(intervals).includes(productId)) {
        return PLAN_TIER_MAP[planKey] ?? null
      }
    }
    return null
  }
}
