import { prisma } from "@hookscope/db/client"
import { Prisma } from "@hookscope/db"
import { AlertSeverity, AlertType } from "@hookscope/db"
import type { AlertListQuery, CreateAlertDto, UpdateAlertDto } from "../types/alert"

const ALERT_SELECT = {
  id: true,
  name: true,
  type: true,
  severity: true,
  config: true,
  isActive: true,
  endpointId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  endpoint: {
    select: { id: true, name: true, source: true },
  },
  triggers: {
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  _count: {
    select: { triggers: true },
  },
} as const

const TRIGGER_SELECT = {
  id: true,
  alertId: true,
  message: true,
  metadata: true,
  createdAt: true,
} as const

export class AlertRepository {
  findAllByUserId(userId: string, query: AlertListQuery) {
    const { page, limit, search } = query
    const skip = (page - 1) * limit
    const where = {
      userId,
      ...(search
        ? { name: { contains: search, mode: "insensitive" as const } }
        : {}),
    }

    return prisma.$transaction([
      prisma.alert.count({ where }),
      prisma.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: ALERT_SELECT,
      }),
    ])
  }

  findByIdAndUserId(id: string, userId: string) {
    return prisma.alert.findFirst({
      where: { id, userId },
      select: ALERT_SELECT,
    })
  }

  create(userId: string, data: CreateAlertDto) {
    return prisma.alert.create({
      data: {
        userId,
        name: data.name,
        type: data.type as AlertType,
        severity: data.severity as AlertSeverity,
        config: data.config as Prisma.InputJsonValue,
        isActive: data.isActive,
        endpointId: data.endpointId ?? null,
      },
      select: ALERT_SELECT,
    })
  }

  async update(id: string, userId: string, data: UpdateAlertDto) {
    // Use update (not updateMany) to support relation-like field isolation
    const existing = await prisma.alert.findFirst({ where: { id, userId }, select: { id: true } })
    if (!existing) return null

    await prisma.alert.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type as AlertType }),
        ...(data.severity !== undefined && { severity: data.severity as AlertSeverity }),
        ...(data.config !== undefined && { config: data.config as Prisma.InputJsonValue }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.endpointId !== undefined && { endpointId: data.endpointId }),
      },
    })
    return this.findByIdAndUserId(id, userId)
  }

  delete(id: string, userId: string) {
    return prisma.alert.deleteMany({ where: { id, userId } })
  }

  // ─── Evaluator queries ──────────────────────────────────────────────────────

  findActiveAlertsByUserId(userId: string) {
    return prisma.alert.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, type: true, severity: true, config: true, endpointId: true },
    })
  }

  findAllActiveAlerts() {
    return prisma.alert.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        severity: true,
        config: true,
        endpointId: true,
        userId: true,
      },
    })
  }

  createTrigger(alertId: string, message: string, metadata?: Record<string, unknown>) {
    return prisma.alertTrigger.create({
      data: {
        alertId,
        message,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      select: TRIGGER_SELECT,
    })
  }

  findTriggersByAlertId(alertId: string, page: number, limit: number) {
    const skip = (page - 1) * limit
    return prisma.$transaction([
      prisma.alertTrigger.count({ where: { alertId } }),
      prisma.alertTrigger.findMany({
        where: { alertId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: TRIGGER_SELECT,
      }),
    ])
  }

  findAllTriggersByUserId(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit
    const where = { alert: { userId } }
    return prisma.$transaction([
      prisma.alertTrigger.count({ where }),
      prisma.alertTrigger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          ...TRIGGER_SELECT,
          alert: { select: { id: true, name: true, severity: true, type: true } },
        },
      }),
    ])
  }
}
