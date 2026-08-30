import { Router } from "express"
import { BillingRepository } from "./billing.repository"
import { BillingService } from "./billing.service"
import { BillingController } from "./billing.controller"
import { billingEnabled } from "../config"
import { json } from "../lib/response"

const repo = new BillingRepository()
const service = new BillingService(repo)
const controller = new BillingController(service)

export const billingRouter = Router()
export const billingController = controller

billingRouter.use((_req, res, next) => {
  if (!billingEnabled) {
    return json(res, { billingEnabled: false, message: "Billing is disabled" })
  }
  next()
})

billingRouter.post("/checkout", controller.createCheckout)
billingRouter.post("/portal", controller.createPortal)
billingRouter.post("/change-plan", controller.changePlan)
billingRouter.get("/subscription", controller.getSubscription)
