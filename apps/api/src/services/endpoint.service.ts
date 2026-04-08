import { createHash, randomBytes } from "crypto"
import type { EndpointRepository } from "../repositories/endpoint.repository"
import type {
  CreateEndpointDto,
  EndpointCreatedDto,
  EndpointListQuery,
  PaginatedEndpointList,
  UpdateEndpointDto,
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
}
