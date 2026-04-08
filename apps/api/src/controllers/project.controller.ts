import type { Request, Response } from "express"
import { badRequest, created, error, json, noContent, notFound } from "../lib/response"
import type { AuthenticatedRequest } from "../middleware/require-auth"
import type { ProjectService } from "../services/project.service"
import type { CreateProjectDto, UpdateProjectDto } from "../types/project"

export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = (req as AuthenticatedRequest).user
      const pageRaw = req.query.page as string | undefined
      const limitRaw = req.query.limit as string | undefined
      const searchRaw = req.query.search as string | undefined

      const page = pageRaw ? Number(pageRaw) : 1
      const limit = limitRaw ? Number(limitRaw) : 10
      if (!Number.isInteger(page) || page < 1) {
        return badRequest(res, "'page' must be a positive integer")
      }

      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return badRequest(res, "'limit' must be an integer between 1 and 100")
      }

      const projects = await this.service.listByUser(userId, {
        page,
        limit,
        search: searchRaw?.trim() ? searchRaw.trim() : undefined,
      })
      json(res, projects)
    } catch (err) {
      console.error("[ProjectController.list]", err)
      error(res, "Failed to fetch projects")
    }
  }

  getById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user
      const project = await this.service.getById(req.params.id, userId)
      if (!project) return notFound(res, `Project '${req.params.id}' not found`)
      json(res, project)
    } catch (err) {
      console.error("[ProjectController.getById]", err)
      error(res, "Failed to fetch project")
    }
  }

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = (req as AuthenticatedRequest).user
      const body = req.body as CreateProjectDto
      if (!body.name?.trim()) return badRequest(res, "'name' is required")
      const project = await this.service.create(userId, body)
      created(res, project)
    } catch (err) {
      console.error("[ProjectController.create]", err)
      error(res, "Failed to create project")
    }
  }

  update = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user
      const body = req.body as UpdateProjectDto
      const project = await this.service.update(req.params.id, userId, body)
      if (!project) return notFound(res, `Project '${req.params.id}' not found`)
      json(res, project)
    } catch (err) {
      console.error("[ProjectController.update]", err)
      error(res, "Failed to update project")
    }
  }

  delete = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user
      const deleted = await this.service.softDelete(req.params.id, userId)
      if (!deleted) return notFound(res, `Project '${req.params.id}' not found`)
      noContent(res)
    } catch (err) {
      console.error("[ProjectController.delete]", err)
      error(res, "Failed to delete project")
    }
  }
}
