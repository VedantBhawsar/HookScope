import { createHash, randomBytes } from "crypto"
import type { EndpointRepository } from "../repositories/endpoint.repository"
import type {
  CreateEndpointDto,
  EndpointCreatedDto,
  EndpointListQuery,
  EndpointStatsDto,
  EndpointVolumeDto,
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
    const { total, data } = await this.repository.findAllByProjectId(projectId, query)
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

    const endpoint = await this.repository.create(projectId, tokenHash, data)

    const baseUrl = (process.env["INGESTION_BASE_URL"] ?? "http://localhost:5001").replace(/\/$/, "")
    const webhookUrl = `${baseUrl}/api/v1/webhooks/${data.source.toLowerCase()}/${token}`

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
    const rows = await this.repository.findVolumeByEndpointId(id, projectId, hours)
    if (!rows) return null

    // Index raw rows by hour+status for fast lookup
    const byHour = new Map<string, { delivered: number; failed: number; other: number }>()
    for (const row of rows) {
      const key = new Date(row.hour).toISOString()
      const bucket = byHour.get(key) ?? { delivered: 0, failed: 0, other: 0 }
      if (row.status === "DELIVERED") bucket.delivered += row.count
      else if (row.status === "FAILED" || row.status === "DEAD_LETTER") bucket.failed += row.count
      else bucket.other += row.count
      byHour.set(key, bucket)
    }

    // Build evenly-spaced hour buckets so the chart always shows the full window
    const now = new Date()
    now.setMinutes(0, 0, 0)
    const data: VolumeDataPoint[] = []
    for (let i = hours - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setHours(d.getHours() - i)
      const key = d.toISOString()
      const bucket = byHour.get(key) ?? { delivered: 0, failed: 0, other: 0 }
      data.push({ hour: key, ...bucket })
    }

    return { data, windowHours: hours }
  }
}
