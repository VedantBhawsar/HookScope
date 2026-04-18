// Generated with: stripe-webhooks skill
import Stripe from "stripe"
import { PlanTier, SubscriptionStatus } from "@workspace/db"
import type { BillingRepository } from "./billing.repository"
import type { CreateCheckoutDto } from "./billing.types"

const FRONTEND_URL = process.env["FRONTEND_URL"] ?? "http://localhost:3000"

const PRICE_IDS: Record<string, Record<"monthly" | "annual", string>> = {
  developer: {
    monthly: process.env["STRIPE_DEVELOPER_MONTHLY_PRICE_ID"] ?? "",
    annual: process.env["STRIPE_DEVELOPER_ANNUAL_PRICE_ID"] ?? "",
  },
  pro: {
    monthly: process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] ?? "",
    annual: process.env["STRIPE_PRO_ANNUAL_PRICE_ID"] ?? "",
  },
  enterprise: {
    monthly: process.env["STRIPE_ENTERPRISE_MONTHLY_PRICE_ID"] ?? "",
    annual: process.env["STRIPE_ENTERPRISE_ANNUAL_PRICE_ID"] ?? "",
  },
}

const PLAN_TIER_MAP: Record<string, PlanTier> = {
  developer: PlanTier.DEVELOPER,
  pro: PlanTier.PRO,
  enterprise: PlanTier.ENTERPRISE,
}

// In Stripe v22, current_period_start/end moved from Subscription to SubscriptionItem
function getSubscriptionPeriod(sub: Stripe.Subscription) {
  const item = sub.items.data[0]
  return {
    currentPeriodStart: new Date((item?.current_period_start ?? sub.start_date) * 1000),
    currentPeriodEnd: new Date((item?.current_period_end ?? sub.billing_cycle_anchor) * 1000),
  }
}

// ─── TODO: Implement this function ──────────────────────────────────────────
// Map a raw Stripe subscription status string to our internal SubscriptionStatus enum.
//
// Stripe statuses you'll encounter:
//   'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
//   'incomplete' | 'incomplete_expired' | 'paused'
//
// Our enum: TRIALING | ACTIVE | PAST_DUE | CANCELED | UNPAID
//
// Key trade-offs to decide:
// - 'incomplete': first payment hasn't cleared yet — PAST_DUE (warn user) or ACTIVE (optimistic)?
// - 'incomplete_expired': payment window closed — CANCELED makes sense, but does access cut off?
// - 'paused': no direct match — does CANCELED cut access, or does UNPAID feel closer?
//
// This function is called for every incoming subscription webhook event.
// ─────────────────────────────────────────────────────────────────────────────
function mapStripeStatusToInternal(stripeStatus: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    trialing:            SubscriptionStatus.TRIALING,
    active:              SubscriptionStatus.ACTIVE,
    past_due:            SubscriptionStatus.PAST_DUE,
    canceled:            SubscriptionStatus.CANCELED,
    unpaid:              SubscriptionStatus.UNPAID,
    paused:              SubscriptionStatus.PAUSED,
    incomplete:          SubscriptionStatus.INCOMPLETE,
    incomplete_expired:  SubscriptionStatus.CANCELED,
  }
  return map[stripeStatus] ?? SubscriptionStatus.ACTIVE
}

export class BillingService {
  private stripe: Stripe

  constructor(private readonly repo: BillingRepository) {
    this.stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] ?? "")
  }

  async createCheckoutSession(userId: string, email: string, dto: CreateCheckoutDto) {
    const { planId, interval } = dto

    const priceId = PRICE_IDS[planId]?.[interval]
    if (!priceId) throw new Error(`No Stripe price configured for ${planId}/${interval}`)

    const planTier = PLAN_TIER_MAP[planId]
    if (!planTier) throw new Error(`Unknown plan: ${planId}`)

    const existing = await this.repo.findSubscriptionByUserId(userId)
    let customerId = existing?.stripeCustomerId ?? undefined

    if (!customerId) {
      const customer = await this.stripe.customers.create({ email, metadata: { userId } })
      customerId = customer.id
    }

    const returnBase = dto.returnTo === "projects" ? "/projects" : "/settings"
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId, planTier },
      },
      metadata: { userId, planTier },
      success_url: `${FRONTEND_URL}${returnBase}?billing=success`,
      cancel_url: `${FRONTEND_URL}/pricing`,
    })

    return { url: session.url! }
  }

  async createPortalSession(userId: string) {
    const sub = await this.repo.findSubscriptionByUserId(userId)
    if (!sub?.stripeCustomerId) {
      throw new Error("No billing account found. Complete checkout first.")
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${FRONTEND_URL}/settings`,
    })

    return { url: session.url }
  }

  async getSubscription(userId: string) {
    const sub = await this.repo.findSubscriptionByUserId(userId)
    if (!sub) return null

    return {
      status: sub.status,
      tier: sub.plan.tier,
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      stripeCustomerId: sub.stripeCustomerId,
    }
  }

  async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"] ?? ""
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)

    switch (event.type) {
      case "checkout.session.completed": {
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      }
      case "customer.subscription.updated": {
        await this.syncSubscription(event.data.object as Stripe.Subscription)
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const periodDates = getSubscriptionPeriod(sub)
        await this.repo.updateSubscriptionByStripeId(sub.id, {
          status: SubscriptionStatus.CANCELED,
          ...periodDates,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        })
        break
      }
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId
    const planTier = session.metadata?.planTier as PlanTier | undefined
    if (!userId || !planTier) return

    const stripeSubId = session.subscription as string
    const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubId)

    const plan = await this.repo.findPlanByTier(planTier)
    if (!plan) {
      console.error(`[billing] No plan row found for tier ${planTier}. Run the seed script.`)
      return
    }

    const periodDates = getSubscriptionPeriod(stripeSub)
    await this.repo.upsertSubscription({
      userId,
      planId: plan.id,
      status: mapStripeStatusToInternal(stripeSub.status),
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: stripeSubId,
      ...periodDates,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    })
  }

  private async syncSubscription(stripeSub: Stripe.Subscription): Promise<void> {
    const periodDates = getSubscriptionPeriod(stripeSub)
    await this.repo.updateSubscriptionByStripeId(stripeSub.id, {
      status: mapStripeStatusToInternal(stripeSub.status),
      ...periodDates,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    })
  }
}
