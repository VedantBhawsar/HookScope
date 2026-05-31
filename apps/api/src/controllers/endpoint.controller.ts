import type { Request, Response } from "express"
import { badRequest, created, error, json, noContent, notFound } from "../lib/response"
import type { AuthenticatedRequest } from "../middleware/require-auth"
import type { EndpointService } from "../services/endpoint.service"
import type { UsageRepository } from "../usage/usage.repository"
import type { CreateEndpointDto, UpdateEndpointDto } from "../types/endpoint"
import { DeliveryErrorCode, SourceProvider, VerificationMode } from "@hookscope/db"
import { isPrivateUrl } from "../lib/ssrf"

const VALID_SOURCES = new Set(Object.values(SourceProvider))
const VALID_VERIFICATION_MODES = new Set(Object.values(VerificationMode))
const VALID_STATUSES = new Set(["active", "paused"])

const FREE_TIER_ENDPOINT_LIMIT = 3

export class EndpointController {
  constructor(
    private readonly service: EndpointService,
    private readonly usageRepo: UsageRepository,
  ) {}

  /**
   * Shared ownership guard — returns false and sends 404 if project not owned.
   */
  private async ensureOwnership(req: Request, res: Response): Promise<string | null> {
    const { userId } = (req as unknown as AuthenticatedRequest).user
    const projectId = req.params.projectId as string
    if (!projectId) {
      notFound(res, "Project not found")
      return null
    }
    const isOwner = await this.service.verifyOwnership(projectId, userId)
    if (!isOwner) {
      notFound(res, `Project '${projectId}' not found`)
      return null
    }
    return projectId
  }

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const projectId = await this.ensureOwnership(req, res)
      if (!projectId) return

      const pageRaw = req.query.page as string | undefined
      const limitRaw = req.query.limit as string | undefined
      const searchRaw = req.query.search as string | undefined
      const sourceRaw = req.query.source as string | undefined
      const statusRaw = req.query.status as string | undefined
      const normalizedStatus = statusRaw?.toLowerCase()

      const page = pageRaw ? Number(pageRaw) : 1
      const limit = limitRaw ? Number(limitRaw) : 10
      if (!Number.isInteger(page) || page < 1) {
        return badRequest(res, "'page' must be a positive integer")
      }
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return badRequest(res, "'limit' must be an integer between 1 and 100")
      }
      if (sourceRaw && !VALID_SOURCES.has(sourceRaw as SourceProvider)) {
        return badRequest(res, `'source' must be one of: ${[...VALID_SOURCES].join(", ")}`)
      }
      if (normalizedStatus && !VALID_STATUSES.has(normalizedStatus)) {
        return badRequest(res, `'status' must be one of: ${[...VALID_STATUSES].join(", ")}`)
      }

      const result = await this.service.listByProject(projectId, {
        page,
        limit,
        search: searchRaw?.trim() || undefined,
        source: sourceRaw as SourceProvider | undefined,
        status: normalizedStatus,
      })
      json(res, result)
    } catch (err) {
      console.error("[EndpointController.list]", err)
      error(res, "Failed to fetch endpoints")
    }
  }

  getById = async (req: Request<{ projectId: string; id: string }>, res: Response): Promise<void> => {
    try {
      const projectId = await this.ensureOwnership(req, res)
      if (!projectId) return

      const endpoint = await this.service.getById(req.params.id, projectId)
      if (!endpoint) return notFound(res, `Endpoint '${req.params.id}' not found`)
      json(res, endpoint)
    } catch (err) {
      console.error("[EndpointController.getById]", err)
      error(res, "Failed to fetch endpoint")
    }
  }

  create = async (req: Request<{ projectId: string }>, res: Response): Promise<void> => {
    try {
      const projectId = await this.ensureOwnership(req, res)
      if (!projectId) return

      const { userId } = (req as unknown as AuthenticatedRequest).user
      const [subscription, endpointsUsed] = await Promise.all([
        this.usageRepo.getPlanForUser(userId),
        this.usageRepo.getActiveEndpointCount(userId),
      ])
      const endpointLimit = subscription?.plan?.endpointLimit ?? FREE_TIER_ENDPOINT_LIMIT
      if (endpointsUsed >= endpointLimit) {
        return badRequest(
          res,
          `Endpoint limit reached (${endpointsUsed}/${endpointLimit}). Upgrade your plan to add more endpoints.`,
        )
      }

      const body = req.body as CreateEndpointDto
      const normalizedStatus = body.status?.toLowerCase()

      if (!body.name?.trim()) return badRequest(res, "'name' is required")
      if (!body.source) return badRequest(res, "'source' is required")
      if (!VALID_SOURCES.has(body.source)) {
        return badRequest(res, `'source' must be one of: ${[...VALID_SOURCES].join(", ")}`)
      }
      if (!body.destinationUrl?.trim()) return badRequest(res, "'destinationUrl' is required")

      try {
        new URL(body.destinationUrl)
      } catch {
        return badRequest(res, "'destinationUrl' must be a valid URL")
      }
      if (isPrivateUrl(body.destinationUrl)) {
        return badRequest(res, "'destinationUrl' must not point to a private or reserved address")
      }

      if (body.verificationMode && !VALID_VERIFICATION_MODES.has(body.verificationMode)) {
        return badRequest(res, `'verificationMode' must be one of: ${[...VALID_VERIFICATION_MODES].join(", ")}`)
      }

      if (body.verificationMode === "STRICT" && !body.signingSecret?.trim()) {
        return badRequest(res, "'signingSecret' is required when verificationMode is STRICT")
      }

      if (body.toleranceSec !== undefined && (typeof body.toleranceSec !== "number" || body.toleranceSec < 0)) {
        return badRequest(res, "'toleranceSec' must be a non-negative number")
      }

      if (normalizedStatus && !VALID_STATUSES.has(normalizedStatus)) {
        return badRequest(res, `'status' must be one of: ${[...VALID_STATUSES].join(", ")}`)
      }

      const endpoint = await this.service.create(projectId, {
        ...body,
        status: normalizedStatus,
      })
      created(res, endpoint, "Endpoint created")
    } catch (err) {
      console.error("[EndpointController.create]", err)
      error(res, "Failed to create endpoint")
    }
  }

  update = async (req: Request<{ projectId: string; id: string }>, res: Response): Promise<void> => {
    try {
      const projectId = await this.ensureOwnership(req, res)
      if (!projectId) return

      const body = req.body as UpdateEndpointDto
      const normalizedStatus = body.status?.toLowerCase()

      if (body.destinationUrl !== undefined) {
        if (!body.destinationUrl.trim()) return badRequest(res, "'destinationUrl' cannot be empty")
        try {
          new URL(body.destinationUrl)
        } catch {
          return badRequest(res, "'destinationUrl' must be a valid URL")
        }
        if (isPrivateUrl(body.destinationUrl)) {
          return badRequest(res, "'destinationUrl' must not point to a private or reserved address")
        }
      }

      if (body.verificationMode && !VALID_VERIFICATION_MODES.has(body.verificationMode)) {
        return badRequest(res, `'verificationMode' must be one of: ${[...VALID_VERIFICATION_MODES].join(", ")}`)
      }

      if (normalizedStatus !== undefined && !VALID_STATUSES.has(normalizedStatus)) {
        return badRequest(res, `'status' must be one of: ${[...VALID_STATUSES].join(", ")}`)
      }

      if (body.toleranceSec !== undefined && (typeof body.toleranceSec !== "number" || body.toleranceSec < 0)) {
        return badRequest(res, "'toleranceSec' must be a non-negative number")
      }

      const endpoint = await this.service.update(req.params.id, projectId, {
        ...body,
        status: normalizedStatus,
      })
      if (!endpoint) return notFound(res, `Endpoint '${req.params.id}' not found`)
      json(res, endpoint, 200, "Endpoint updated")
    } catch (err) {
      console.error("[EndpointController.update]", err)
      error(res, "Failed to update endpoint")
    }
  }

  updateStatus = async (req: Request<{ projectId: string; id: string }>, res: Response): Promise<void> => {
    try {
      const projectId = await this.ensureOwnership(req, res)
      if (!projectId) return

      const { status } = req.body as { status?: unknown }
      const normalizedStatus = typeof status === "string" ? status.toLowerCase() : undefined
      if (!normalizedStatus || !VALID_STATUSES.has(normalizedStatus)) {
        return badRequest(res, `'status' must be one of: ${[...VALID_STATUSES].join(", ")}`)
      }

      const endpoint = await this.service.toggleStatus(req.params.id, projectId, normalizedStatus)
      if (!endpoint) return notFound(res, `Endpoint '${req.params.id}' not found`)
      json(res, endpoint, 200, "Endpoint status updated")
    } catch (err) {
      console.error("[EndpointController.updateStatus]", err)
      error(res, "Failed to update endpoint status")
    }
  }

  delete = async (req: Request<{ projectId: string; id: string }>, res: Response): Promise<void> => {
    try {
      const projectId = await this.ensureOwnership(req, res)
      if (!projectId) return

      const deleted = await this.service.softDelete(req.params.id, projectId)
      if (!deleted) return notFound(res, `Endpoint '${req.params.id}' not found`)
      noContent(res, "Endpoint deleted")
    } catch (err) {
      console.error("[EndpointController.delete]", err)
      error(res, "Failed to delete endpoint")
    }
  }

  getStats = async (req: Request<{ projectId: string; id: string }>, res: Response): Promise<void> => {
    try {
      const projectId = await this.ensureOwnership(req, res)
      if (!projectId) return

      const stats = await this.service.getStats(req.params.id, projectId)
      if (!stats) return notFound(res, `Endpoint '${req.params.id}' not found`)
      json(res, stats)
    } catch (err) {
      console.error("[EndpointController.getStats]", err)
      error(res, "Failed to fetch endpoint stats")
    }
  }

  getVolume = async (req: Request<{ projectId: string; id: string }>, res: Response): Promise<void> => {
    try {
      const projectId = await this.ensureOwnership(req, res)
      if (!projectId) return

      const hoursRaw = req.query.hours as string | undefined
      const hours = hoursRaw ? Number(hoursRaw) : 24
      if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
        return badRequest(res, "'hours' must be an integer between 1 and 720")
      }

      const volume = await this.service.getVolume(req.params.id, projectId, hours)
      if (!volume) return notFound(res, `Endpoint '${req.params.id}' not found`)
      json(res, volume)
    } catch (err) {
      console.error("[EndpointController.getVolume]", err)
      error(res, "Failed to fetch event volume")
    }
  }

  getDeliveryStats = async (req: Request<{ projectId: string; id: string }>, res: Response): Promise<void> => {
    try {
      const projectId = await this.ensureOwnership(req, res)
      if (!projectId) return

      const stats = await this.service.getDeliveryStats(req.params.id, projectId)
      if (!stats) return notFound(res, `Endpoint '${req.params.id}' not found`)
      json(res, stats)
    } catch (err) {
      console.error("[EndpointController.getDeliveryStats]", err)
      error(res, "Failed to fetch delivery stats")
    }
  }

  getDeliveries = async (req: Request<{ projectId: string; id: string }>, res: Response): Promise<void> => {
    try {
      const projectId = await this.ensureOwnership(req, res)
      if (!projectId) return

      const pageRaw = req.query.page as string | undefined
      const limitRaw = req.query.limit as string | undefined
      const statusRaw = req.query.status as string | undefined
      const errorCodeRaw = req.query.errorCode as string | undefined
      const searchRaw = req.query.search as string | undefined

      const page = pageRaw ? Number(pageRaw) : 1
      const limit = limitRaw ? Number(limitRaw) : 20
      if (!Number.isInteger(page) || page < 1) {
        return badRequest(res, "'page' must be a positive integer")
      }
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return badRequest(res, "'limit' must be an integer between 1 and 100")
      }

      const VALID_DELIVERY_STATUSES = new Set(["PENDING", "SUCCESS", "FAILED", "RETRYING"])
      if (statusRaw && !VALID_DELIVERY_STATUSES.has(statusRaw)) {
        return badRequest(res, `'status' must be one of: ${[...VALID_DELIVERY_STATUSES].join(", ")}`)
      }

      const VALID_ERROR_CODES = new Set(Object.values(DeliveryErrorCode))
      if (errorCodeRaw && !VALID_ERROR_CODES.has(errorCodeRaw as DeliveryErrorCode)) {
        return badRequest(res, `'errorCode' must be one of: ${[...VALID_ERROR_CODES].join(", ")}`)
      }

      const result = await this.service.getDeliveries(req.params.id, projectId, {
        page,
        limit,
        status: statusRaw as import("@hookscope/db").DeliveryStatus | undefined,
        errorCode: errorCodeRaw as DeliveryErrorCode | undefined,
        search: searchRaw?.trim() || undefined,
      })
      if (!result) return notFound(res, `Endpoint '${req.params.id}' not found`)
      json(res, result)
    } catch (err) {
      console.error("[EndpointController.getDeliveries]", err)
      error(res, "Failed to fetch deliveries")
    }
  }
}
