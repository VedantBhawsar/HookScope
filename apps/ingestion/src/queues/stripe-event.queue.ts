import { Queue } from "bullmq"
import type { ConnectionOptions } from "bullmq"
import type Stripe from "stripe"
import type { StripePaymentValidation } from "../lib/stripe-payment-validation.js"

export const STRIPE_EVENT_QUEUE = "stripe-events"

export interface StripeEventJob {
  endpointId: string
  destinationUrl: string
  event: Stripe.Event
  signature: string | null
  sourceIp: string | null
  paymentValidation: StripePaymentValidation
  receivedAt: string
  bucket: string
}

export function createStripeQueue(connection: ConnectionOptions): Queue<StripeEventJob> {
  return new Queue<StripeEventJob>(STRIPE_EVENT_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      // Linear backoff: 15s, 30s, 45s, 60s, 75s (configured on the worker)
      backoff: { type: "custom" },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  })
}
