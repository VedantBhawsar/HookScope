import { prisma } from "@workspace/db/client"
import { Prisma } from "@workspace/db"
import type { CreateEndpointDto, EndpointListQuery, UpdateEndpointDto } from "../types/endpoint"

const ENDPOINT_SELECT = {
  id: true,
  projectId: true,
  name: true,
  source: true,
  destinationUrl: true,
  verificationMode: true,
  signatureHeader: true,
  signatureType: true,
  timestampHeader: true,
  toleranceSec: true,
  eventFilters: true,
  status: true,
  createdAt: true,
} as const

export class EndpointRepository {
  /**
   * Verify that a project belongs to the given user and is not soft-deleted.
   */
  async verifyProjectOwnership(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      select: { id: true },
    })
    return project !== null
  }

  async findAllByProjectId(projectId: string, query: EndpointListQuery) {
    const { page, limit, search, source, status } = query
    const skip = (page - 1) * limit

    const where = {
      projectId,
      deletedAt: null,
      ...(source ? { source } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { destinationUrl: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    }

    const [total, data] = await prisma.$transaction([
      prisma.endpoint.count({ where }),
      prisma.endpoint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: ENDPOINT_SELECT,
      }),
    ])

    return { total, data }
  }

  findByIdAndProjectId(id: string, projectId: string) {
    return prisma.endpoint.findFirst({
      where: { id, projectId, deletedAt: null },
      select: {
        ...ENDPOINT_SELECT,
        _count: { select: { events: true } },
      },
    })
  }

  create(projectId: string, tokenHash: string, data: CreateEndpointDto) {
    return prisma.endpoint.create({
      data: {
        projectId,
        tokenHash,
        name: data.name,
        source: data.source,
        destinationUrl: data.destinationUrl,
        verificationMode: data.verificationMode,
        signingSecret: data.signingSecret,
        signatureHeader: data.signatureHeader,
        signatureType: data.signatureType,
        timestampHeader: data.timestampHeader,
        toleranceSec: data.toleranceSec,
        eventFilters: data.eventFilters ?? undefined,
      },
      select: ENDPOINT_SELECT,
    })
  }

  update(id: string, projectId: string, data: UpdateEndpointDto) {
    return prisma.endpoint.updateMany({
      where: { id, projectId, deletedAt: null },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.destinationUrl !== undefined ? { destinationUrl: data.destinationUrl } : {}),
        ...(data.verificationMode !== undefined ? { verificationMode: data.verificationMode } : {}),
        ...(data.signingSecret !== undefined ? { signingSecret: data.signingSecret } : {}),
        ...(data.signatureHeader !== undefined ? { signatureHeader: data.signatureHeader } : {}),
        ...(data.signatureType !== undefined ? { signatureType: data.signatureType } : {}),
        ...(data.timestampHeader !== undefined ? { timestampHeader: data.timestampHeader } : {}),
        ...(data.toleranceSec !== undefined ? { toleranceSec: data.toleranceSec } : {}),
        ...(data.eventFilters !== undefined ? { eventFilters: data.eventFilters ?? undefined } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    })
  }

  findById(id: string, projectId: string) {
    return prisma.endpoint.findFirst({
      where: { id, projectId, deletedAt: null },
      select: ENDPOINT_SELECT,
    })
  }

  toggleStatus(id: string, projectId: string, status: string) {
    return prisma.endpoint.updateMany({
      where: { id, projectId, deletedAt: null },
      data: { status },
    })
  }

  softDelete(id: string, projectId: string) {
    return prisma.endpoint.updateMany({
      where: { id, projectId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  }

  /**
   * Count webhook events grouped by status for one endpoint.
   * Uses Prisma groupBy — single DB round trip, no raw SQL needed.
   */
  async findStatsByEndpointId(id: string, projectId: string) {
    // Verify the endpoint belongs to this project first
    const endpoint = await prisma.endpoint.findFirst({
      where: { id, projectId, deletedAt: null },
      select: { id: true },
    })
    if (!endpoint) return null

    const groups = await prisma.webhookEvent.groupBy({
      by: ["status"],
      where: { endpointId: id, deletedAt: null },
      _count: { _all: true },
    })

    return groups
  }

  /**
   * Hourly event volume for the last N hours, grouped by status bucket.
   * Uses $queryRaw with date_trunc — the only way to do date bucketing in Prisma.
   * Table: webhook_events, columns: endpoint_id, created_at, deleted_at, status
   */
  async findVolumeByEndpointId(id: string, projectId: string, hours: number) {
    // Verify the endpoint belongs to this project first
    const endpoint = await prisma.endpoint.findFirst({
      where: { id, projectId, deletedAt: null },
      select: { id: true },
    })
    if (!endpoint) return null

    const rows = await prisma.$queryRaw<
      { hour: Date; status: string; count: number }[]
    >(Prisma.sql`
      SELECT
        date_trunc('hour', "created_at") AS hour,
        "status",
        COUNT(*)::int                    AS count
      FROM "webhook_events"
      WHERE
        "endpoint_id" = ${id}
        AND "deleted_at" IS NULL
        AND "created_at" >= NOW() - (${hours}::int * INTERVAL '1 hour')
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `)

    return rows
  }
}
