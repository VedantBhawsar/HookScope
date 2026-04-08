import type { WebhookRepository } from "../repositories/webhook.repository"
import type {
  WebhookEventListQuery,
  DeliveryListQuery,
  EventLogListQuery,
  PaginatedWebhookEventList,
  PaginatedDeliveryList,
  PaginatedEventLogList,
} from "../types/webhook"

export class WebhookService {
  constructor(private readonly repository: WebhookRepository) {}

  async listByUser(userId: string, query: WebhookEventListQuery): Promise<PaginatedWebhookEventList> {
    const { total, data } = await this.repository.findAllByUserId(userId, query)
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  }

  getById(id: string, userId: string) {
    return this.repository.findByIdAndUserId(id, userId)
  }

  async listDeliveries(eventId: string, userId: string, query: DeliveryListQuery): Promise<PaginatedDeliveryList> {
    const { total, data } = await this.repository.findDeliveriesByEventId(eventId, userId, query)
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  }

  async listLogs(eventId: string, userId: string, query: EventLogListQuery): Promise<PaginatedEventLogList> {
    const { total, data } = await this.repository.findLogsByEventId(eventId, userId, query)
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  }

  retry(eventId: string, userId: string) {
    return this.repository.createRetryDelivery(eventId, userId)
  }
}
