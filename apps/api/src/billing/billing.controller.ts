import type { Request, Response } from "express"
import { z } from "zod"
import { json, error, badRequest } from "../lib/response"
import { requireAuth, type AuthenticatedRequest } from "../middleware/require-auth"
import type { BillingService } from "./billing.service"

const checkoutSchema = z.object({
  planId: z.enum(["developer", "pro", "enterprise"]),
  interval: z.enum(["monthly", "annual"]),
})

export class BillingController {
  constructor(private readonly service: BillingService) {}

  createCheckout = [
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId, email } = (req as AuthenticatedRequest).user
        const parsed = checkoutSchema.safeParse(req.body)
        if (!parsed.success) {
          badRequest(res, "Invalid request: planId and interval are required")
          return
        }
        const result = await this.service.createCheckoutSession(userId, email, parsed.data)
        json(res, result)
      } catch (err) {
        console.error("[BillingController.createCheckout]", err)
        error(res, "Failed to create checkout session")
      }
    },
  ]

  createPortal = [
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = (req as AuthenticatedRequest).user
        const result = await this.service.createPortalSession(userId)
        json(res, result)
      } catch (err) {
        console.error("[BillingController.createPortal]", err)
        error(res, err instanceof Error ? err.message : "Failed to create portal session")
      }
    },
  ]

  getSubscription = [
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = (req as AuthenticatedRequest).user
        const data = await this.service.getSubscription(userId)
        json(res, data)
      } catch (err) {
        console.error("[BillingController.getSubscription]", err)
        error(res, "Failed to fetch subscription")
      }
    },
  ]

  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string
    if (!sig) {
      res.status(400).json({ error: "Missing stripe-signature header" })
      return
    }
    try {
      await this.service.handleWebhookEvent(req.body as Buffer, sig)
      res.json({ received: true })
    } catch (err) {
      console.error("[BillingController.handleWebhook]", err)
      res.status(400).json({ error: "Webhook verification failed" })
    }
  }
}
