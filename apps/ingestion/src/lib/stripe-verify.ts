// Generated with: stripe-webhooks skill
// https://github.com/hookdeck/webhook-skills

import Stripe from "stripe"

export interface VerificationResult {
  valid: boolean
  event: Stripe.Event | null
  error: string | null
}

/**
 * Verifies a Stripe webhook signature and constructs the event.
 *
 * CRITICAL: The `rawBody` must be the raw request body (Buffer/string),
 * NOT the parsed JSON — Stripe signature verification will fail otherwise.
 */
export function verifyStripeSignature(
  rawBody: string | Buffer,
  signature: string,
  secret: string
): VerificationResult {
  try {
    const event = Stripe.webhooks.constructEvent(rawBody, signature, secret)
    return { valid: true, event, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown verification error"
    return { valid: false, event: null, error: message }
  }
}
