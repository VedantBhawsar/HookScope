import type { Request, Response } from "express"
import { z } from "zod"
import { json, error, badRequest } from "../lib/response"
import { requireAuth, type AuthenticatedRequest } from "../middleware/require-auth"
import type { BillingService } from "./billing.service"

const checkoutSchema = z.object({
  planId: z.enum(["developer", "pro", "enterprise"]),
  interval: z.enum(["monthly", "annual"]),
  returnTo: z.enum(["projects", "settings"]).optional(),
})

const changePlanSchema = z.object({
  planId: z.enum(["developer", "pro", "enterprise"]),
  interval: z.enum(["monthly", "annual"]),
})

export class BillingController {
  constructor(private readonly service: BillingService) {}

  createCheckout = [
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      console.log("helo")
      try {
        const { userId, email } = (req as AuthenticatedRequest).user
        const parsed = checkoutSchema.safeParse(req.body)
        if (!parsed.success) {
          badRequest(res, "Invalid request: planId and interval are required")
          return
        }
        const result = await this.service.createCheckoutSession(userId, email, parsed.data)
        console.log("[BillingController.createCheckout] session created:", result)
        json(res, result)
      } catch (err) {
        console.log("[BillingController.createCheckout] type:", err?.constructor?.name)
        console.log("[BillingController.createCheckout] message:", err instanceof Error ? err.message : err)
        const message = err instanceof Error ? err.message : "Failed to create checkout session"
        error(res, message)
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

  changePlan = [
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = (req as AuthenticatedRequest).user
        const parsed = changePlanSchema.safeParse(req.body)
        if (!parsed.success) {
          badRequest(res, "Invalid request: planId and interval are required")
          return
        }
        const result = await this.service.changePlan(userId, parsed.data.planId, parsed.data.interval)
        json(res, result, 200, result.message)
      } catch (err) {
        error(res, err instanceof Error ? err.message : "Failed to change plan")
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
