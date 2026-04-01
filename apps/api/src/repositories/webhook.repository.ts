import type {
  CreateWebhookDto,
  UpdateWebhookDto,
  Webhook,
  WebhookListResult,
} from "../types/webhook"

export interface IWebhookRepository {
  findAll(): Promise<WebhookListResult>
  findById(id: string): Promise<Webhook | null>
  create(data: CreateWebhookDto): Promise<Webhook>
  update(id: string, data: UpdateWebhookDto): Promise<Webhook | null>
  delete(id: string): Promise<boolean>
}

export class WebhookRepository implements IWebhookRepository {
  async findAll(): Promise<WebhookListResult> {
    // TODO: implement with bun:sqlite / Bun.sql
    return { data: [], total: 0 }
  }

  async findById(id: string): Promise<Webhook | null> {
    // TODO: implement with bun:sqlite / Bun.sql
    void id
    return null
  }

  async create(data: CreateWebhookDto): Promise<Webhook> {
    // TODO: implement with bun:sqlite / Bun.sql
    const now = new Date().toISOString()
    return {
      id: crypto.randomUUID(),
      url: data.url,
      secret: data.secret ?? null,
      description: data.description ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
  }

  async update(id: string, data: UpdateWebhookDto): Promise<Webhook | null> {
    // TODO: implement with bun:sqlite / Bun.sql
    void id
    void data
    return null
  }

  async delete(id: string): Promise<boolean> {
    // TODO: implement with bun:sqlite / Bun.sql
    void id
    return false
  }
}
