export type BillingInterval = "monthly" | "annual"

export interface PlanFeature {
  label: string
  included: boolean | string
}

export interface Plan {
  id: string
  name: string
  description: string
  monthlyPrice: number | null
  annualPrice: number | null
  originalMonthlyPrice?: number
  highlight: boolean
  badge?: string
  cta: string
  ctaHref: string
  features: PlanFeature[]
  limits: {
    events: string
    endpoints: string
    retention: string
    alerts: string
  }
}

export const PLANS: Plan[] = [
  {
    id: "developer",
    name: "Developer",
    description: "Everything you need to ship confidently.",
    monthlyPrice: 10,
    annualPrice: 100,
    highlight: true,
    badge: "Most popular",
    cta: "Try free for 7 days",
    ctaHref: "/auth/register",
    limits: {
      events: "250K / mo",
      endpoints: "10",
      retention: "14 days",
      alerts: "5 rules",
    },
    features: [
      { label: "Webhook ingestion & HMAC verification", included: true },
      { label: "Event log & delivery tracking", included: true },
      { label: "Payload storage (S3)", included: true },
      { label: "Delivery retry & replay", included: true },
      { label: "Alert rules", included: "3 rules" },
      { label: "Email support", included: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For products with serious webhook volume.",
    monthlyPrice: 39,
    annualPrice: 390,
    originalMonthlyPrice: 49,
    highlight: false,
    cta: "Try free for 7 days",
    ctaHref: "/auth/register",
    limits: {
      events: "2M / mo",
      endpoints: "50",
      retention: "30 days",
      alerts: "Unlimited",
    },
    features: [
      { label: "Webhook ingestion & HMAC verification", included: true },
      { label: "Event log & delivery tracking", included: true },
      { label: "Payload storage (S3)", included: true },
      { label: "Delivery retry & replay", included: true },
      { label: "Alert rules", included: "Unlimited" },
      { label: "Priority email support", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "High-volume infrastructure, no compromises.",
    monthlyPrice: 99,
    annualPrice: 990,
    originalMonthlyPrice: 124,
    highlight: false,
    cta: "Try free for 7 days",
    ctaHref: "/auth/register",
    limits: {
      events: "10M / mo",
      endpoints: "Unlimited",
      retention: "90 days",
      alerts: "Unlimited",
    },
    features: [
      { label: "Webhook ingestion & HMAC verification", included: true },
      { label: "Event log & delivery tracking", included: true },
      { label: "Payload storage (S3)", included: true },
      { label: "Delivery retry & replay", included: true },
      { label: "Alert rules", included: "Unlimited" },
      { label: "Priority email support", included: true },
    ],
  },
]

export const PRICING_FAQ = [
  {
    q: "Do I need a credit card to start the trial?",
    a: "No. Sign up and get full access to your chosen plan for 7 days — no credit card required. You'll only be asked to pay at the end of the trial.",
  },
  {
    q: "What happens after the 7-day trial ends?",
    a: "Your account is paused until you add a payment method. No charges, no surprises. Your data is kept for 30 days so nothing is lost.",
  },
  {
    q: "What counts as an event?",
    a: "Every inbound webhook POST to your HookScope endpoint URL counts as one event — regardless of payload size or provider.",
  },
  {
    q: "What happens when I hit my monthly event limit?",
    a: "Events over the limit are dropped and logged. You'll get an email warning at 80% and again at 100% of your quota.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrades take effect immediately. Downgrades apply at the start of your next billing cycle.",
  },
]
