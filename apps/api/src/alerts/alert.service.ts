import { AlertType } from "@workspace/db"
import type { AlertRepository } from "./alert.repository"
import { alertConfigByType } from "../types/alert"
import type { AlertListQuery, AlertTriggeredEvent, CreateAlertDto, UpdateAlertDto } from "../types/alert"

export class AlertService {
  constructor(private readonly repository: AlertRepository) {}

  async list(userId: string, query: AlertListQuery) {
    const [total, data] = await this.repository.findAllByUserId(userId, query)
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

  async create(userId: string, dto: CreateAlertDto) {
    const configError = this.validateConfig(dto.type, dto.config)
    if (configError) return { error: configError }
    const alert = await this.repository.create(userId, dto)
    return { alert }
  }

  async update(id: string, userId: string, dto: UpdateAlertDto) {
    if (dto.type !== undefined && dto.config !== undefined) {
      const configError = this.validateConfig(dto.type, dto.config)
      if (configError) return { error: configError }
    }
    const alert = await this.repository.update(id, userId, dto)
    if (!alert) return { error: null, alert: null }
    return { alert }
  }

  async delete(id: string, userId: string) {
    const result = await this.repository.delete(id, userId)
    return result.count > 0
  }

  async listTriggers(alertId: string, userId: string, page: number, limit: number) {
    // Verify ownership first
    const alert = await this.repository.findByIdAndUserId(alertId, userId)
    if (!alert) return null
    const [total, data] = await this.repository.findTriggersByAlertId(alertId, page, limit)
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async listAllTriggers(userId: string, page: number, limit: number) {
    const [total, data] = await this.repository.findAllTriggersByUserId(userId, page, limit)
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async createTestTrigger(
    alertId: string,
    userId: string,
    payload?: { message?: string; metadata?: Record<string, unknown> }
  ) {
    const alert = await this.repository.findByIdAndUserId(alertId, userId)
    if (!alert) return null
    if (!alert.isActive) {
      return { error: "Paused alerts cannot be triggered" as const }
    }

    const message =
      payload?.message?.trim() ||
      `[TEST] Manual trigger for alert \"${alert.name}\"`

    const trigger = await this.repository.createTrigger(
      alert.id,
      message,
      payload?.metadata ?? { source: "manual-test" }
    )

    const event: AlertTriggeredEvent = {
      triggerId: trigger.id,
      alertId: alert.id,
      alertName: alert.name,
      severity: alert.severity,
      message,
      endpointId: alert.endpointId,
      triggeredAt: trigger.createdAt.toISOString(),
      type: alert.type,
    }

    return { trigger, event }
  }

  // ─── Internal ───────────────────────────────────────────────────────────────

  private validateConfig(type: AlertType, config: Record<string, unknown>): string | null {
    const schema = alertConfigByType[type as keyof typeof alertConfigByType]
    if (!schema) return `Unknown alert type: ${type}`
    const result = schema.safeParse(config)
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(", ")
      return `Invalid config for alert type ${type}: ${message}`
    }
    return null
  }
}
