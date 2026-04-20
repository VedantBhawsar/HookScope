import { createHash, randomBytes } from "crypto"
import type { EndpointRepository } from "../repositories/endpoint.repository"
import type {
  CreateEndpointDto,
  DeliveryStatsDto,
  EndpointCreatedDto,
  EndpointDeliveryListQuery,
  EndpointListQuery,
  EndpointStatsDto,
  EndpointVolumeDto,
  PaginatedEndpointDeliveryList,
  PaginatedEndpointList,
  UpdateEndpointDto,
  VolumeDataPoint,
} from "../types/endpoint"

export class EndpointService {
  constructor(private readonly repository: EndpointRepository) {}

  /**
   * Verify that the project belongs to the user. Returns false if not found or not owned.
   */
  async verifyOwnership(projectId: string, userId: string): Promise<boolean> {
    return this.repository.verifyProjectOwnership(projectId, userId)
  }

  async listByProject(projectId: string, query: EndpointListQuery): Promise<PaginatedEndpointList> {
    const { total, data: rawData } = await this.repository.findAllByProjectId(projectId, query)
    const data = rawData.map((endpoint) => ({
      ...endpoint,
      customHeaders: (endpoint.customHeaders as Record<string, string> | null) || null,
    }))
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

  getById(id: string, projectId: string) {
    return this.repository.findByIdAndProjectId(id, projectId)
  }

  async create(projectId: string, data: CreateEndpointDto): Promise<EndpointCreatedDto> {
    const token = randomBytes(32).toString("hex")
    const tokenHash = createHash("sha256").update(token).digest("hex")

    const rawEndpoint = await this.repository.create(projectId, tokenHash, data)

    const baseUrl = (process.env["INGESTION_BASE_URL"] ?? "http://localhost:5001").replace(/\/$/, "")
    const webhookUrl = `${baseUrl}/api/v1/webhooks/${data.source.toLowerCase()}/${token}`

    const endpoint = {
      ...rawEndpoint,
      customHeaders: (rawEndpoint.customHeaders as Record<string, string> | null) || null,
    }

    return { ...endpoint, token, webhookUrl }
  }

  async update(id: string, projectId: string, data: UpdateEndpointDto) {
    const result = await this.repository.update(id, projectId, data)
    if (result.count === 0) return null
    return this.repository.findById(id, projectId)
  }

  async toggleStatus(id: string, projectId: string, status: string) {
    const result = await this.repository.toggleStatus(id, projectId, status)
    if (result.count === 0) return null
    return this.repository.findById(id, projectId)
  }

  async softDelete(id: string, projectId: string) {
    const result = await this.repository.softDelete(id, projectId)
    return result.count > 0
  }

  async getStats(id: string, projectId: string): Promise<EndpointStatsDto | null> {
    const groups = await this.repository.findStatsByEndpointId(id, projectId)
    if (!groups) return null

    const breakdown: Record<string, number> = {}
    let totalEvents = 0

    for (const g of groups) {
      breakdown[g.status] = g._count._all
      totalEvents += g._count._all
    }

    const delivered = breakdown["DELIVERED"] ?? 0
    const failed = (breakdown["FAILED"] ?? 0) + (breakdown["DEAD_LETTER"] ?? 0)

    return {
      totalEvents,
      statusBreakdown: breakdown,
      successRate: totalEvents > 0 ? parseFloat(((delivered / totalEvents) * 100).toFixed(2)) : 0,
      failureRate: totalEvents > 0 ? parseFloat(((failed / totalEvents) * 100).toFixed(2)) : 0,
    }
  }

  async getVolume(id: string, projectId: string, hours: number): Promise<EndpointVolumeDto | null> {
    const result = await this.repository.findVolumeByEndpointId(id, projectId, hours)
    if (!result) return null

    const { rows, granularity } = result

    // Index raw rows by bucket+status for fast lookup
    const byBucket = new Map<string, { delivered: number; failed: number; other: number }>()
    for (const row of rows) {
      const key = new Date(row.bucket).toISOString()
      const entry = byBucket.get(key) ?? { delivered: 0, failed: 0, other: 0 }
      if (row.status === "DELIVERED") entry.delivered += row.count
      else if (row.status === "FAILED" || row.status === "DEAD_LETTER") entry.failed += row.count
      else entry.other += row.count
      byBucket.set(key, entry)
    }

    // Build evenly-spaced buckets so the chart always covers the full window
    const now = new Date()
    const data: VolumeDataPoint[] = []

    if (granularity === 'hour') {
      now.setUTCMinutes(0, 0, 0)
      for (let i = hours - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setUTCHours(d.getUTCHours() - i)
        const key = d.toISOString()
        const bucket = byBucket.get(key) ?? { delivered: 0, failed: 0, other: 0 }
        data.push({ hour: key, ...bucket })
      }
    } else {
      // day granularity — one bucket per calendar day
      now.setUTCHours(0, 0, 0, 0)
      const days = Math.ceil(hours / 24)
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setUTCDate(d.getUTCDate() - i)
        const key = d.toISOString()
        const bucket = byBucket.get(key) ?? { delivered: 0, failed: 0, other: 0 }
        data.push({ hour: key, ...bucket })
      }
    }

    return { data, windowHours: hours, granularity }
  }

  async getDeliveryStats(id: string, projectId: string): Promise<DeliveryStatsDto | null> {
    const result = await this.repository.findDeliveryStatsByEndpointId(id, projectId)
    if (!result) return null

    const { latency, statusGroups, errorGroups, totalDeliveries, eventTypeGroups } = result

    const statusBreakdown: Record<string, number> = {}
    for (const g of statusGroups) {
      statusBreakdown[g.status] = g._count._all
    }

    const errorCodeBreakdown: Record<string, number> = {}
    for (const g of errorGroups) {
      if (g.errorCode) errorCodeBreakdown[g.errorCode] = g._count._all
    }

    const eventTypeBreakdown = eventTypeGroups
      .filter((g) => g.eventType != null)
      .map((g) => ({ eventType: g.eventType as string, count: g._count._all }))

    return {
      totalDeliveries,
      latency: {
        avg: latency._avg.latencyMs != null ? Math.round(latency._avg.latencyMs) : null,
        min: latency._min.latencyMs ?? null,
        max: latency._max.latencyMs ?? null,
      },
      statusBreakdown,
      errorCodeBreakdown,
      eventTypeBreakdown,
    }
  }

  async getDeliveries(
    id: string,
    projectId: string,
    query: EndpointDeliveryListQuery,
  ): Promise<PaginatedEndpointDeliveryList | null> {
    const result = await this.repository.findDeliveriesByEndpointId(id, projectId, query)
    if (!result) return null
    return {
      data: result.data.map((d) => ({
        id: d.id,
        webhookEventId: d.webhookEventId,
        destinationUrl: d.destinationUrl,
        status: d.status,
        responseCode: d.responseCode,
        responseBody: d.responseBody,
        latencyMs: d.latencyMs,
        retryCount: d.retryCount,
        isReplay: d.isReplay,
        errorCode: d.errorCode,
        nextRetryAt: d.nextRetryAt,
        createdAt: d.createdAt,
        event: {
          eventId: d.webhookEvent.eventId,
          eventType: d.webhookEvent.eventType,
          source: d.webhookEvent.source,
        },
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / query.limit)),
      },
    }
  }
}
