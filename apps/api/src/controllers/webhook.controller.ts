import {
  badRequest,
  created,
  error,
  json,
  noContent,
  notFound,
} from "../lib/response"
import type { WebhookService } from "../services/webhook.service"
import type { CreateWebhookDto, UpdateWebhookDto } from "../types/webhook"

type BunRequest = Request & { params: Record<string, string> }

export class WebhookController {
  constructor(private readonly service: WebhookService) {}

  list = async (_req: Request): Promise<Response> => {
    try {
      const result = await this.service.getAll()
      return json(result)
    } catch (err) {
      console.error("[WebhookController.list]", err)
      return error("Failed to fetch webhooks")
    }
  }

  getById = async (req: BunRequest): Promise<Response> => {
    try {
      const id = req.params["id"]
      if (!id) return badRequest("Missing 'id' param")
      const webhook = await this.service.getById(id)
      if (!webhook) return notFound(`Webhook '${id}' not found`)
      return json(webhook)
    } catch (err) {
      console.error("[WebhookController.getById]", err)
      return error("Failed to fetch webhook")
    }
  }

  create = async (req: Request): Promise<Response> => {
    try {
      const body = (await req.json()) as CreateWebhookDto
      if (!body.url) return badRequest("'url' is required")
      const webhook = await this.service.create(body)
      return created(webhook)
    } catch (err) {
      console.error("[WebhookController.create]", err)
      return error("Failed to create webhook")
    }
  }

  update = async (req: BunRequest): Promise<Response> => {
    try {
      const id = req.params["id"]
      if (!id) return badRequest("Missing 'id' param")
      const body = (await req.json()) as UpdateWebhookDto
      const webhook = await this.service.update(id, body)
      if (!webhook) return notFound(`Webhook '${id}' not found`)
      return json(webhook)
    } catch (err) {
      console.error("[WebhookController.update]", err)
      return error("Failed to update webhook")
    }
  }

  delete = async (req: BunRequest): Promise<Response> => {
    try {
      const id = req.params["id"]
      if (!id) return badRequest("Missing 'id' param")
      const deleted = await this.service.delete(id)
      if (!deleted) return notFound(`Webhook '${id}' not found`)
      return noContent()
    } catch (err) {
      console.error("[WebhookController.delete]", err)
      return error("Failed to delete webhook")
    }
  }
}
