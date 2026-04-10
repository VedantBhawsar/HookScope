import { prisma } from "@workspace/db/client"
import type { CreateProjectDto, ProjectListQuery, UpdateProjectDto } from "../types/project"

const projectSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      endpoints: true,
    },
  },
} as const

function mapProjectWithEndpointCount(project: {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  _count: {
    endpoints: number
  }
}) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    endpointCount: project._count.endpoints,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
}

export class ProjectRepository {
  async findAllByUserId(userId: string, query: ProjectListQuery) {
    const { page, limit, search } = query
    const skip = (page - 1) * limit
    const where = {
      userId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    }

    const [total, data] = await prisma.$transaction([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: projectSelect,
      }),
    ])

    return {
      total,
      data: data.map(mapProjectWithEndpointCount),
    }
  }

  findByIdAndUserId(id: string, userId: string) {
    return prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      select: projectSelect,
    }).then((project) => (project ? mapProjectWithEndpointCount(project) : null))
  }

  create(userId: string, data: CreateProjectDto) {
    return prisma.project.create({
      data: { userId, name: data.name, description: data.description },
      select: projectSelect,
    }).then(mapProjectWithEndpointCount)
  }

  markOnboardingCompleted(userId: string) {
    return prisma.user.updateMany({
      where: {
        id: userId,
        onboardingCompletedAt: null,
        companyName: {
          not: null,
        },
      },
      data: {
        onboardingCompletedAt: new Date(),
      },
    })
  }

  update(id: string, userId: string, data: UpdateProjectDto) {
    return prisma.project.updateMany({
      where: { id, userId, deletedAt: null },
      data: { ...data },
    })
  }

  findById(id: string, userId: string) {
    return prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      select: projectSelect,
    }).then((project) => (project ? mapProjectWithEndpointCount(project) : null))
  }

  softDelete(id: string, userId: string) {
    return prisma.project.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  }
}
