import type Stripe from "stripe"

export interface StripePaymentValidation {
  isPaymentEvent: boolean
  paymentValid: boolean | null
  reason: string
}

type EventObject = Record<string, unknown>

function asObject(value: unknown): EventObject {
  if (typeof value === "object" && value !== null) {
    return value as EventObject
  }
  return {}
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

export function validateStripePaymentEvent(
  event: Pick<Stripe.Event, "type" | "data">
): StripePaymentValidation {
  const eventObject = asObject(event.data.object)

  switch (event.type) {
    case "payment_intent.succeeded": {
      const status = asString(eventObject["status"])
      const isValid = status === "succeeded" || status === null
      return {
        isPaymentEvent: true,
        paymentValid: isValid,
        reason: isValid
          ? "Payment intent indicates success"
          : `Unexpected payment_intent status: ${status}`,
      }
    }

    case "payment_intent.payment_failed":
      return {
        isPaymentEvent: true,
        paymentValid: false,
        reason: "Payment intent failed",
      }

    case "charge.succeeded": {
      const paid = asBoolean(eventObject["paid"])
      const isValid = paid === true || paid === null
      return {
        isPaymentEvent: true,
        paymentValid: isValid,
        reason: isValid
          ? "Charge marked as paid"
          : "Charge did not indicate paid=true",
      }
    }

    case "charge.failed":
      return {
        isPaymentEvent: true,
        paymentValid: false,
        reason: "Charge failed",
      }

    case "checkout.session.completed": {
      const paymentStatus = asString(eventObject["payment_status"])
      const isValid = paymentStatus === "paid"
      return {
        isPaymentEvent: true,
        paymentValid: isValid,
        reason: isValid
          ? "Checkout session payment_status is paid"
          : `Checkout session payment_status is ${paymentStatus ?? "unknown"}`,
      }
    }

    case "invoice.payment_succeeded":
      return {
        isPaymentEvent: true,
        paymentValid: true,
        reason: "Invoice payment succeeded",
      }

    case "invoice.payment_failed":
      return {
        isPaymentEvent: true,
        paymentValid: false,
        reason: "Invoice payment failed",
      }

    default:
      return {
        isPaymentEvent: false,
        paymentValid: null,
        reason: `Unhandled Stripe event type for payment validation: ${event.type}`,
      }
  }
}
