import { Router } from "express"
import { BillingRepository } from "./billing.repository"
import { BillingService } from "./billing.service"
import { BillingController } from "./billing.controller"

const repo = new BillingRepository()
const service = new BillingService(repo)
const controller = new BillingController(service)

export const billingRouter = Router()
export const billingController = controller

billingRouter.post("/checkout", controller.createCheckout)
billingRouter.post("/portal", controller.createPortal)
billingRouter.get("/subscription", controller.getSubscription)
