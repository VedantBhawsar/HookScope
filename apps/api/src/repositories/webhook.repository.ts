import { prisma } from "@workspace/db/client"
import { DeliveryStatus, EventStatus, DeliveryErrorCode, LogType } from "@workspace/db"
import type {
  WebhookEventListQuery,
  DeliveryListQuery,
  EventLogListQuery,
} from "../types/webhook"

export class WebhookRepository {
  /**
   * Find all webhook events for a user's projects (paginated + filterable).
   */
  async findAllByUserId(userId: string, query: WebhookEventListQuery) {
    const { page, limit, search, eventType, projectId, endpointId, status, source } = query
    const skip = (page - 1) * limit

    const where = {
      endpoint: {
        deletedAt: null,
        project: {
          userId,
          deletedAt: null,
          ...(projectId ? { id: projectId } : {}),
        },
        ...(endpointId ? { id: endpointId } : {}),
      },
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
      ...(eventType
        ? {
            eventType: {
              contains: eventType,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { eventId: { contains: search, mode: "insensitive" as const } },
              { eventType: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    }

    const [total, data] = await prisma.$transaction([
      prisma.webhookEvent.count({ where }),
      prisma.webhookEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          endpointId: true,
          eventId: true,
          source: true,
          eventType: true,
          payloadUrl: true,
          status: true,
          sourceIp: true,
          lastStatusCode: true,
          lastError: true,
          createdAt: true,
          endpoint: {
            select: {
              id: true,
              name: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ])

    return { total, data }
  }

  /**
   * Find a single webhook event by ID, scoped to user's projects.
   */
  findByIdAndUserId(id: string, userId: string) {
    return prisma.webhookEvent.findFirst({
      where: {
        id,
        deletedAt: null,
        endpoint: {
          deletedAt: null,
          project: { userId, deletedAt: null },
        },
      },
      select: {
        id: true,
        endpointId: true,
        eventId: true,
        source: true,
        eventType: true,
        signature: true,
        payloadUrl: true,
        status: true,
        sourceIp: true,
        lastStatusCode: true,
        lastError: true,
        version: true,
        createdAt: true,
        endpoint: {
          select: {
            id: true,
            name: true,
            project: { select: { id: true, name: true } },
          },
        },
        _count: { select: { deliveries: true, logs: true } },
      },
    })
  }

  /**
   * List deliveries for a webhook event (paginated + filterable).
   */
  async findDeliveriesByEventId(eventId: string, userId: string, query: DeliveryListQuery) {
    const { page, limit, status } = query
    const skip = (page - 1) * limit

    const where = {
      webhookEventId: eventId,
      webhookEvent: {
        deletedAt: null,
        endpoint: {
          deletedAt: null,
          project: { userId, deletedAt: null },
        },
      },
      ...(status ? { status } : {}),
    }

    const [total, data] = await prisma.$transaction([
      prisma.delivery.count({ where }),
      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          webhookEventId: true,
          destinationUrl: true,
          status: true,
          responseCode: true,
          responseBody: true,
          latencyMs: true,
          retryCount: true,
          isReplay: true,
          errorCode: true,
          nextRetryAt: true,
          createdAt: true,
        },
      }),
    ])

    return { total, data }
  }

  /**
   * List event logs for a webhook event (paginated).
   */
  async findLogsByEventId(eventId: string, userId: string, query: EventLogListQuery) {
    const { page, limit } = query
    const skip = (page - 1) * limit

    const where = {
      webhookEventId: eventId,
      webhookEvent: {
        deletedAt: null,
        endpoint: {
          deletedAt: null,
          project: { userId, deletedAt: null },
        },
      },
    }

    const [total, data] = await prisma.$transaction([
      prisma.eventLog.count({ where }),
      prisma.eventLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          webhookEventId: true,
          deliveryId: true,
          status: true,
          type: true,
          message: true,
          createdAt: true,
        },
      }),
    ])

    return { total, data }
  }

  /**
   * Create a retry delivery for a webhook event (replay).
   */
  async createRetryDelivery(eventId: string, userId: string) {
    // Verify the event belongs to the user first
    const event = await prisma.webhookEvent.findFirst({
      where: {
        id: eventId,
        deletedAt: null,
        endpoint: {
          deletedAt: null,
          project: { userId, deletedAt: null },
        },
      },
      select: {
        id: true,
        endpoint: { select: { destinationUrl: true } },
      },
    })

    if (!event) return null

    // Get max retry count for this event
    const lastDelivery = await prisma.delivery.findFirst({
      where: { webhookEventId: eventId },
      orderBy: { retryCount: "desc" },
      select: { retryCount: true },
    })

    const delivery = await prisma.delivery.create({
      data: {
        webhookEventId: eventId,
        destinationUrl: event.endpoint.destinationUrl,
        status: "PENDING",
        retryCount: (lastDelivery?.retryCount ?? 0) + 1,
        isReplay: true,
      },
      select: {
        id: true,
        webhookEventId: true,
        destinationUrl: true,
        status: true,
        responseCode: true,
        responseBody: true,
        latencyMs: true,
        retryCount: true,
        isReplay: true,
        errorCode: true,
        nextRetryAt: true,
        createdAt: true,
      },
    })

    return delivery
  }

  getEventForReplay(eventId: string, userId: string) {
    return prisma.webhookEvent.findFirst({
      where: {
        id: eventId,
        deletedAt: null,
        endpoint: { deletedAt: null, project: { userId, deletedAt: null } },
      },
      select: {
        id: true,
        eventId: true,
        eventType: true,
        source: true,
        payloadUrl: true,
      },
    })
  }

  findDeliveryById(id: string) {
    return prisma.delivery.findUnique({
      where: { id },
      select: {
        id: true,
        webhookEventId: true,
        destinationUrl: true,
        status: true,
        responseCode: true,
        responseBody: true,
        latencyMs: true,
        retryCount: true,
        isReplay: true,
        errorCode: true,
        nextRetryAt: true,
        createdAt: true,
      },
    })
  }

  async updateDeliveryOutcome(
    deliveryId: string,
    webhookEventId: string,
    opts: {
      deliveryStatus: DeliveryStatus
      eventStatus: EventStatus
      responseCode?: number
      responseBody?: string
      latencyMs?: number
      errorCode?: DeliveryErrorCode | null
      logStatus: "INFO" | "WARNING" | "ERROR" | "SUCCESS"
      logMessage: string
    }
  ): Promise<void> {
    await prisma.$transaction([
      prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: opts.deliveryStatus,
          responseCode: opts.responseCode ?? null,
          responseBody: opts.responseBody ?? null,
          latencyMs: opts.latencyMs ?? null,
          errorCode: opts.errorCode ?? null,
          version: { increment: 1 },
        },
      }),
      prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: opts.eventStatus, version: { increment: 1 } },
      }),
      prisma.eventLog.create({
        data: {
          webhookEventId,
          deliveryId,
          status: opts.logStatus,
          type: opts.deliveryStatus === DeliveryStatus.SUCCESS ? LogType.DELIVERY_SUCCESS : LogType.DELIVERY_FAILED,
          message: opts.logMessage,
        },
      }),
    ])
  }

  /**
   * Find multiple webhook events by IDs, scoped to user's projects.
   * Used for batch operations.
   */
  async findEventsByIdsAndUserId(eventIds: string[], userId: string) {
    return prisma.webhookEvent.findMany({
      where: {
        id: { in: eventIds },
        deletedAt: null,
        endpoint: {
          deletedAt: null,
          project: { userId, deletedAt: null },
        },
      },
      select: {
        id: true,
        eventType: true,
        source: true,
        payloadUrl: true,
        endpoint: { select: { destinationUrl: true } },
      },
    })
  }

  /**
   * Soft-delete multiple webhook events (scoped to user's projects).
   * Only deletes events that belong to the user's projects.
   * Returns count of deleted events.
   */
  async batchSoftDeleteEvents(eventIds: string[], userId: string) {
    // First, verify all events belong to the user
    const validEvents = await prisma.webhookEvent.findMany({
      where: {
        id: { in: eventIds },
        deletedAt: null,
        endpoint: {
          deletedAt: null,
          project: { userId, deletedAt: null },
        },
      },
      select: { id: true },
    })

    if (validEvents.length === 0) return 0

    const validIds = validEvents.map((e) => e.id)

    // Soft delete: update deletedAt timestamp
    const result = await prisma.webhookEvent.updateMany({
      where: { id: { in: validIds } },
      data: { deletedAt: new Date() },
    })

    return result.count
  }
}
