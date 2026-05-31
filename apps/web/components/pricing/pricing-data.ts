export type BillingInterval = "monthly" | "annual"

export interface PlanFeature {
  label: string
  included: boolean | string
}

export interface Plan {
  id: string
  name: string
  description: string
  monthlyPriceUsd: number | null
  annualPriceUsd: number | null
  monthlyPriceInr: number | null
  annualPriceInr: number | null
  highlight: boolean
  badge?: string
  cta: string
  ctaHref: string
  features: PlanFeature[]
  limits: {
    events: string
    workspaces: string
    retention: string
    teamSeats?: string
  }
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Try HookScope with no commitment.",
    monthlyPriceUsd: 0,
    annualPriceUsd: 0,
    monthlyPriceInr: 0,
    annualPriceInr: 0,
    highlight: false,
    cta: "Get started free",
    ctaHref: "/auth/register",
    limits: {
      events: "10K / mo",
      workspaces: "1",
      retention: "24 hours",
    },
    features: [
      { label: "Webhook ingestion & HMAC verification", included: true },
      { label: "Event log & delivery tracking", included: true },
      { label: "Payload storage (S3)", included: false },
      { label: "Delivery retry & replay", included: false },
      { label: "Team seats", included: false },
      { label: "Community support", included: true },
    ],
  },
  {
    id: "starter",
    name: "Starter",
    description: "Everything you need to ship confidently.",
    monthlyPriceUsd: 12,
    annualPriceUsd: 120,
    monthlyPriceInr: 999,
    annualPriceInr: 9990,
    highlight: true,
    badge: "Most popular",
    cta: "Get started",
    ctaHref: "/auth/register",
    limits: {
      events: "100K / mo",
      workspaces: "3",
      retention: "7 days",
    },
    features: [
      { label: "Webhook ingestion & HMAC verification", included: true },
      { label: "Event log & delivery tracking", included: true },
      { label: "Payload storage (S3)", included: true },
      { label: "Delivery retry & replay", included: true },
      { label: "Team seats", included: false },
      { label: "Email support", included: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For products with serious webhook volume.",
    monthlyPriceUsd: 35,
    annualPriceUsd: 350,
    monthlyPriceInr: 2999,
    annualPriceInr: 29990,
    highlight: false,
    cta: "Get started",
    ctaHref: "/auth/register",
    limits: {
      events: "1M / mo",
      workspaces: "Unlimited",
      retention: "30 days",
      teamSeats: "Unlimited",
    },
    features: [
      { label: "Webhook ingestion & HMAC verification", included: true },
      { label: "Event log & delivery tracking", included: true },
      { label: "Payload storage (S3)", included: true },
      { label: "Webhook replay", included: true },
      { label: "S3 export", included: true },
      { label: "Team seats", included: "Unlimited" },
      { label: "Priority email support", included: true },
    ],
  },
]

export const PRICING_FAQ = [
  {
    q: "What is the Free plan?",
    a: "The Free plan gives you 10,000 webhook events per month with 24-hour log retention and 1 workspace — no credit card required.",
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
    a: "Yes. Upgrades take effect immediately with prorated billing. Downgrades apply at the start of your next billing cycle.",
  },
  {
    q: "Do you support Indian Rupee (₹) payments?",
    a: "Yes. Dodo Payments handles currency automatically — you'll be charged in ₹ if you're in India, or in USD otherwise.",
  },
]
