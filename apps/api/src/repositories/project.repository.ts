import { prisma } from "@workspace/db/client"
import type { CreateProjectDto, ProjectListQuery, UpdateProjectDto } from "../types/project"

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
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ])

    return { total, data }
  }

  findByIdAndUserId(id: string, userId: string) {
    return prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  create(userId: string, data: CreateProjectDto) {
    return prisma.project.create({
      data: { userId, name: data.name, description: data.description },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    })
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
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  softDelete(id: string, userId: string) {
    return prisma.project.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  }
}
