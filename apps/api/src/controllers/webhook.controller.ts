import type { Request, Response } from "express"
import { badRequest, created, error, json, noContent, notFound } from "../lib/response"
import type { WebhookService } from "../services/webhook.service"
import type { CreateWebhookDto, UpdateWebhookDto } from "../types/webhook"

export class WebhookController {
  constructor(private readonly service: WebhookService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.getAll()
      json(res, result)
    } catch (err) {
      console.error("[WebhookController.list]", err)
      error(res, "Failed to fetch webhooks")
    }
  }

  getById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const webhook = await this.service.getById(id)
      if (!webhook) return notFound(res, `Webhook '${id}' not found`)
      json(res, webhook)
    } catch (err) {
      console.error("[WebhookController.getById]", err)
      error(res, "Failed to fetch webhook")
    }
  }

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as CreateWebhookDto
      if (!body.url) return badRequest(res, "'url' is required")
      const webhook = await this.service.create(body)
      created(res, webhook)
    } catch (err) {
      console.error("[WebhookController.create]", err)
      error(res, "Failed to create webhook")
    }
  }

  update = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const body = req.body as UpdateWebhookDto
      const webhook = await this.service.update(id, body)
      if (!webhook) return notFound(res, `Webhook '${id}' not found`)
      json(res, webhook)
    } catch (err) {
      console.error("[WebhookController.update]", err)
      error(res, "Failed to update webhook")
    }
  }

  delete = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const deleted = await this.service.delete(id)
      if (!deleted) return notFound(res, `Webhook '${id}' not found`)
      noContent(res)
    } catch (err) {
      console.error("[WebhookController.delete]", err)
      error(res, "Failed to delete webhook")
    }
  }
}
