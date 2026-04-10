export interface CreateProjectDto {
  name: string
  description?: string
}

export interface UpdateProjectDto {
  name?: string
  description?: string
}

export interface ProjectDto {
  id: string
  name: string
  description: string | null
  endpointCount: number
  createdAt: Date
  updatedAt: Date
}

export interface ProjectListQuery {
  page: number
  limit: number
  search?: string
}

export interface PaginatedProjectList {
  data: ProjectDto[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
