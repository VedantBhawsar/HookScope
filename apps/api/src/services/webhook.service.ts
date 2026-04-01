import type { IWebhookRepository } from "../repositories/webhook.repository"
import type {
  CreateWebhookDto,
  UpdateWebhookDto,
  Webhook,
  WebhookListResult,
} from "../types/webhook"

export class WebhookService {
  constructor(private readonly repository: IWebhookRepository) {}

  async getAll(): Promise<WebhookListResult> {
    return this.repository.findAll()
  }

  async getById(id: string): Promise<Webhook | null> {
    return this.repository.findById(id)
  }

  async create(data: CreateWebhookDto): Promise<Webhook> {
    // TODO: add validation / business rules before persisting
    return this.repository.create(data)
  }

  async update(id: string, data: UpdateWebhookDto): Promise<Webhook | null> {
    // TODO: add validation / business rules before persisting
    return this.repository.update(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
