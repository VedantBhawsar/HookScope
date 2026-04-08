import type { ProjectRepository } from "../repositories/project.repository"
import type {
  CreateProjectDto,
  PaginatedProjectList,
  ProjectListQuery,
  UpdateProjectDto,
} from "../types/project"

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async listByUser(userId: string, query: ProjectListQuery): Promise<PaginatedProjectList> {
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

  create(userId: string, data: CreateProjectDto) {
    return this.repository.create(userId, data)
  }

  async update(id: string, userId: string, data: UpdateProjectDto) {
    const result = await this.repository.update(id, userId, data)
    if (result.count === 0) return null
    return this.repository.findById(id, userId)
  }

  async softDelete(id: string, userId: string) {
    const result = await this.repository.softDelete(id, userId)
    return result.count > 0
  }
}
